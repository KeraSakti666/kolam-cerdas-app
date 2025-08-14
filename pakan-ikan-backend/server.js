// server.js

// Memuat variabel lingkungan dari file .env
require('dotenv').config();

// Mengimpor modul yang diperlukan
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const admin = require('firebase-admin');
const { sendMessage } = require('./whatsappNotifier.js'); 

// --- Inisialisasi Firebase Admin SDK ---
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const firestore = admin.firestore();
console.log('Firebase Admin SDK berhasil terhubung.');

// Menginisialisasi aplikasi Express
const app = express();
const port = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Membuat server HTTP dan WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Variabel Global untuk koneksi WebSocket ESP32
const esp32Sockets = new Map();

// --- Middleware Autentikasi Firebase ---
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Firebase token verification error:", error.message);
    return res.sendStatus(403);
  }
};

// --- Penanganan Koneksi WebSocket dari ESP32 ---
wss.on('connection', (ws) => {
  console.log('Perangkat baru mencoba terhubung via WebSocket.');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // Pendaftaran Perangkat
      if (data.type === 'register_device' && data.id_perangkat_esp32) {
        const { id_perangkat_esp32 } = data;
        const pondsRef = firestore.collection('ponds');
        const snapshot = await pondsRef.where('id_perangkat_esp32', '==', id_perangkat_esp32).limit(1).get();

        if (snapshot.empty) {
          console.log(`Pendaftaran GAGAL: ESP32 ID ${id_perangkat_esp32} tidak ditemukan.`);
          ws.close(1008, "Device ID not registered");
          return;
        }
        
        const pondDoc = snapshot.docs[0];
        const pondData = pondDoc.data();
        esp32Sockets.set(id_perangkat_esp32, ws);
        console.log(`ESP32 dengan ID ${id_perangkat_esp32} (Kolam: ${pondData.nama_kolam}) berhasil terdaftar.`);
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'initial_config',
            minSuhu: pondData.pengaturan.min_suhu,
            maxSuhu: pondData.pengaturan.maks_suhu,
            minPh: pondData.pengaturan.min_ph,
            maxPh: pondData.pengaturan.maks_ph,
            tahapAktif: pondData.pengaturan.tahap_aktif
          }));
        }
      }
      
      // Update Status dari Perangkat
      else if (data.type === 'status_update') {
        const { id_perangkat_esp32, suhu, ph, turbidity, ...relays } = data;
        const pondsRef = firestore.collection('ponds');
        const snapshot = await pondsRef.where('id_perangkat_esp32', '==', id_perangkat_esp32).limit(1).get();

        if (!snapshot.empty) {
          const pondId = snapshot.docs[0].id;
          firestore.collection('ponds').doc(pondId).collection('readings').add({
            suhu, ph, kekeruhan: turbidity, ...relays,
            timestamp: new Date()
          }).catch(err => console.error("Error saving to Firestore:", err));
        }
      }

      // --- LOGIKA BARU: Notifikasi Pakan Otomatis dengan Riwayat Sensor ---
      else if (data.type === 'feed_notification' && data.id_perangkat_esp32) {
        console.log(`Menerima notifikasi pakan dari ${data.id_perangkat_esp32}`);
        
        const pondsRef = firestore.collection('ponds');
        const snapshot = await pondsRef.where('id_perangkat_esp32', '==', data.id_perangkat_esp32).limit(1).get();

        if (!snapshot.empty) {
          const pondDoc = snapshot.docs[0];
          const pondData = pondDoc.data();
          const userRef = firestore.collection('users').doc(pondData.id_pengguna);
          const userDoc = await userRef.get();

          if (userDoc.exists && userDoc.data().nomor_wa) {
            const userData = userDoc.data();
            
            // 1. Ambil data sensor TERBARU
            const readingsQuery = await firestore.collection('ponds').doc(pondDoc.id).collection('readings')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            let sensorReport = "Data sensor saat ini tidak tersedia.";
            if (!readingsQuery.empty) {
                const latestReading = readingsQuery.docs[0].data();
                sensorReport = `*Kondisi Air Saat Ini:*\n` +
                               `   - Suhu: ${latestReading.suhu.toFixed(1)}°C\n` +
                               `   - pH: ${latestReading.ph.toFixed(2)}\n` +
                               `   - Kekeruhan: ${latestReading.kekeruhan.toFixed(1)} NTU`;
            }

            // 2. Buat pesan notifikasi yang lebih lengkap
            const notifMessage = `🔔 *Notifikasi Pakan Otomatis*\n\n` +
                                 `Servo pakan untuk kolam *${pondData.nama_kolam}* telah aktif untuk tahap *${pondData.pengaturan.tahap_aktif}*.\n\n` +
                                 `${sensorReport}`;
            
            // 3. Kirim pesan
            await sendMessage(userData.nomor_wa, notifMessage);
          }
        }
      }

    } catch (e) {
      console.error(`Gagal mem-parsing pesan WebSocket: ${message.toString()}`, e);
    }
  });

  ws.on('close', () => {
    console.log('Koneksi WebSocket terputus.');
    for (let [key, value] of esp32Sockets.entries()) {
      if (value === ws) {
        esp32Sockets.delete(key);
        console.log(`ESP32 dengan ID ${key} dihapus dari daftar koneksi aktif.`);
        break;
      }
    }
  });
});

// --- API Routes ---

// Mendapatkan daftar semua kolam milik pengguna
app.get('/api/ponds', authenticateToken, async (req, res) => {
  const userId = req.user.uid;
  try {
    const pondsRef = firestore.collection('ponds');
    const snapshot = await pondsRef.where('id_pengguna', '==', userId).get();
    if (snapshot.empty) return res.status(200).json([]);
    const ponds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(ponds);
  } catch (error) {
    res.status(500).json({ message: 'Error mengambil daftar kolam.' });
  }
});

// Membuat kolam baru
app.post('/api/ponds', authenticateToken, async (req, res) => {
    const { nama_kolam, id_perangkat_esp32 } = req.body;
    const id_pengguna = req.user.uid;
    if (!nama_kolam || !id_perangkat_esp32) {
        return res.status(400).json({ message: 'Nama kolam dan ID perangkat diperlukan.' });
    }
    try {
        const newPondRef = await firestore.collection('ponds').add({
            nama_kolam, id_perangkat_esp32, id_pengguna,
            pengaturan: { min_suhu: 20.0, maks_suhu: 30.0, min_ph: 6.5, maks_ph: 7.5, tahap_aktif: 'bibit' }
        });
        res.status(201).json({ message: 'Kolam berhasil dibuat!', pondId: newPondRef.id });
    } catch (error) {
        res.status(500).json({ message: 'Error membuat kolam baru.' });
    }
});

// Mengatur batas Suhu dan pH
app.post('/api/ponds/:pondId/set-limits', authenticateToken, async (req, res) => {
  const { pondId } = req.params;
  // Terima 'batasKekeruhan' dari body request
  const { minSuhu, maxSuhu, minPh, maxPh, batasKekeruhan } = req.body; // <-- UBAH DI SINI
  const userId = req.user.uid;
  try {
    const pondRef = firestore.collection('ponds').doc(pondId);
    const doc = await pondRef.get();
    if (!doc.exists || doc.data().id_pengguna !== userId) {
      return res.status(404).json({ message: 'Kolam tidak ditemukan.' });
    }
    // Tambahkan 'batas_kekeruhan' ke data yang diupdate
    await pondRef.update({
      'pengaturan.min_suhu': parseFloat(minSuhu), 'pengaturan.maks_suhu': parseFloat(maxSuhu),
      'pengaturan.min_ph': parseFloat(minPh), 'pengaturan.maks_ph': parseFloat(maxPh),
      'pengaturan.batas_kekeruhan': parseFloat(batasKekeruhan) // <-- TAMBAHKAN INI
    });
    const esp32Socket = esp32Sockets.get(doc.data().id_perangkat_esp32);
    if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
      // Kirim juga 'batasKekeruhan' ke ESP32
      esp32Socket.send(JSON.stringify({ type: 'limit_update', minSuhu, maxSuhu, minPh, maxPh, batasKekeruhan })); // <-- UBAH DI SINI
      res.status(200).json({ message: 'Batas berhasil diatur dan dikirim ke perangkat.' });
    } else {
      res.status(202).json({ message: 'Pengaturan disimpan, tapi perangkat sedang offline.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan internal.' });
  }
})

// Mengatur Tahap Pakan
app.post('/api/ponds/:pondId/set-tahap', authenticateToken, async (req, res) => {
    const { pondId } = req.params;
    const { tahap } = req.body;
    const userId = req.user.uid;
    try {
        const pondRef = firestore.collection('ponds').doc(pondId);
        const doc = await pondRef.get();
        if (!doc.exists || doc.data().id_pengguna !== userId) {
            return res.status(404).json({ message: 'Kolam tidak ditemukan.' });
        }
        await pondRef.update({ 'pengaturan.tahap_aktif': tahap });
        const esp32Socket = esp32Sockets.get(doc.data().id_perangkat_esp32);
        if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
            esp32Socket.send(tahap); 
            res.status(200).json({ message: `Tahap diatur ke '${tahap}' dan dikirim.` });
        } else {
            res.status(202).json({ message: 'Pengaturan disimpan, tapi perangkat sedang offline.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan internal.' });
    }
});

// Menyimpan nomor WhatsApp pengguna
app.post('/api/user/whatsapp', authenticateToken, async (req, res) => {
    const { nomor_wa } = req.body;
    const userId = req.user.uid;
    if (!nomor_wa || !/^[0-9]+$/.test(nomor_wa)) {
        return res.status(400).json({ message: 'Format nomor WhatsApp tidak valid.' });
    }
    try {
        const userRef = firestore.collection('users').doc(userId);
        await userRef.set({ nomor_wa }, { merge: true });
        res.status(200).json({ message: 'Nomor WhatsApp berhasil disimpan.' });
    } catch (error) {
        res.status(500).json({ message: 'Error menyimpan nomor WA.' });
    }
});

// --- Menjalankan Server ---
server.listen(port, () => {
  console.log(`🚀 Server berjalan di http://localhost:${port}`);
});
    