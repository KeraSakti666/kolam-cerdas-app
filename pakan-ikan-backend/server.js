// pakan-ikan-backend/server.js (Versi Final dengan Perbaikan CORS)

require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Kita akan mengkonfigurasi ini
const admin = require('firebase-admin');
const axios = require('axios');

// --- Inisialisasi Firebase Admin SDK ---
try {
    const serviceAccount_b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!serviceAccount_b64) {
        throw new Error("Environment variable FIREBASE_SERVICE_ACCOUNT_BASE64 tidak ditemukan.");
    }
    const serviceAccount_json_string = Buffer.from(serviceAccount_b64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccount_json_string);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin SDK berhasil terhubung.');
} catch (error) {
    console.error("Gagal menginisialisasi Firebase Admin SDK:", error.message);
    process.exit(1);
}
const firestore = admin.firestore();

// --- Inisialisasi Aplikasi Express ---
const app = express();

// --- PERUBAHAN UTAMA DI SINI: Konfigurasi CORS ---
// Kita secara eksplisit mengizinkan permintaan dari URL frontend kita.
const corsOptions = {
  origin: process.env.FRONTEND_URL // URL frontend akan kita simpan di env var
};
app.use(cors(corsOptions)); // Terapkan konfigurasi cors

app.use(express.json());

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

// --- Fungsi Helper untuk Mengirim Perintah ke Bot WhatsApp di Render ---
const sendToWhatsAppBot = async (number, message) => {
    const botUrl = process.env.WHATSAPP_BOT_URL; 
    if (!botUrl) {
        console.error("URL Bot WhatsApp (WHATSAPP_BOT_URL) tidak diatur!");
        return;
    }
    try {
        await axios.post(`${botUrl}/send-message`, { number, message });
        console.log(`Perintah kirim pesan ke ${number} berhasil dikirim ke bot.`);
    } catch (error) {
        console.error(`Gagal mengirim perintah ke bot: ${error.message}`);
    }
};

// ====================================================================
// --- API Routes --- (Tidak ada perubahan pada logika di dalam route)
// ====================================================================

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

app.post('/api/ponds', authenticateToken, async (req, res) => {
    const { nama_kolam, id_perangkat_esp32 } = req.body;
    const id_pengguna = req.user.uid;
    if (!nama_kolam || !id_perangkat_esp32) {
        return res.status(400).json({ message: 'Nama kolam dan ID perangkat diperlukan.' });
    }
    try {
        const newPondRef = await firestore.collection('ponds').add({
            nama_kolam, id_perangkat_esp32, id_pengguna,
            pengaturan: { min_suhu: 20.0, maks_suhu: 30.0, min_ph: 6.5, maks_ph: 7.5, tahap_aktif: 'bibit', batas_kekeruhan: 500.0 }
        });
        res.status(201).json({ message: 'Kolam berhasil dibuat!', pondId: newPondRef.id });
    } catch (error) {
        res.status(500).json({ message: 'Error membuat kolam baru.' });
    }
});

app.post('/api/ponds/:pondId/set-limits', authenticateToken, async (req, res) => {
  const { pondId } = req.params;
  const { minSuhu, maxSuhu, minPh, maxPh, batasKekeruhan } = req.body;
  const userId = req.user.uid;
  try {
    const pondRef = firestore.collection('ponds').doc(pondId);
    const doc = await pondRef.get();
    if (!doc.exists || doc.data().id_pengguna !== userId) {
      return res.status(404).json({ message: 'Kolam tidak ditemukan.' });
    }
    await pondRef.update({
      'pengaturan.min_suhu': parseFloat(minSuhu), 'pengaturan.maks_suhu': parseFloat(maxSuhu),
      'pengaturan.min_ph': parseFloat(minPh), 'pengaturan.maks_ph': parseFloat(maxPh),
      'pengaturan.batas_kekeruhan': parseFloat(batasKekeruhan)
    });
    res.status(200).json({ message: 'Pengaturan berhasil disimpan di database.' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan internal.' });
  }
});

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
        res.status(200).json({ message: `Pengaturan tahap berhasil disimpan ke '${tahap}'.` });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan internal.' });
    }
});

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

app.post('/api/notify', async (req, res) => {
    const { type, id_perangkat_esp32 } = req.body;
    if (!type || !id_perangkat_esp32) return res.status(400).send('Tipe notifikasi dan ID Perangkat diperlukan.');

    try {
        const pondsRef = firestore.collection('ponds');
        const snapshot = await pondsRef.where('id_perangkat_esp32', '==', id_perangkat_esp32).limit(1).get();

        if (snapshot.empty) return res.status(404).send('Perangkat tidak ditemukan.');
        
        const pondDoc = snapshot.docs[0];
        const pondData = pondDoc.data();
        const userRef = firestore.collection('users').doc(pondData.id_pengguna);
        const userDoc = await userRef.get();

        if (userDoc.exists && userDoc.data().nomor_wa) {
            let notifMessage = "";
            if (type === 'feed_notification') {
                const readingsQuery = await firestore.collection('ponds').doc(pondDoc.id).collection('readings').orderBy('timestamp', 'desc').limit(1).get();
                let sensorReport = "Data sensor saat ini tidak tersedia.";
                if (!readingsQuery.empty) {
                    const latestReading = readingsQuery.docs[0].data();
                    sensorReport = `*Kondisi Air Saat Ini:*\n - Suhu: ${latestReading.suhu.toFixed(1)}°C\n - pH: ${latestReading.ph.toFixed(2)}`;
                }
                notifMessage = `🔔 *Notifikasi Pakan Otomatis*\n\nServo pakan untuk kolam *${pondData.nama_kolam}* telah aktif untuk tahap *${pondData.pengaturan.tahap_aktif}*.\n\n${sensorReport}`;
            } 
            
            if (notifMessage) {
                await sendToWhatsAppBot(userDoc.data().nomor_wa, notifMessage);
            }
        }
        res.status(200).send('Notifikasi diterima dan sedang diproses.');
    } catch (error) {
        console.error("Error saat memproses notifikasi:", error);
        res.status(500).send('Error memproses notifikasi.');
    }
});


// Ekspor aplikasi Express untuk Vercel
module.exports = app;
