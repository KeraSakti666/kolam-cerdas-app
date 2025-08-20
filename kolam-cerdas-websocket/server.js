// server.js untuk WebSocket di Render (dengan koneksi Firestore dan Notifikasi WA)

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const admin = require('firebase-admin');
const axios = require('axios');

// --- Inisialisasi Firebase Admin SDK ---
try {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error("Environment variable FIREBASE_SERVICE_ACCOUNT tidak ditemukan.");
  }
  const serviceAccount = JSON.parse(serviceAccountString);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('Firebase Admin SDK berhasil terhubung.');
} catch (error) {
  console.error("Gagal menginisialisasi Firebase Admin SDK:", error.message);
}
const firestore = admin.firestore();
// --- Selesai Inisialisasi Firebase ---


const PORT = process.env.PORT || 3000;
const app = express();
app.get('/', (req, res) => {
  res.send('WebSocket Server with Firestore integration is running');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const connectedDevices = new Map();

// --- PERUBAHAN: Tambahkan mekanisme Cooldown ---
const notificationCooldowns = new Map();
const COOLDOWN_PERIOD_MS = 4 * 60 * 1000; // Cooldown 4 menit

console.log('WebSocket server is starting...');

// --- Fungsi untuk menyimpan data ke Firestore ---
async function saveDataToFirestore(data) {
  if (!firestore) return console.error("Firestore tidak terinisialisasi.");
  const deviceId = data.id_perangkat_esp32;
  if (!deviceId) return console.error("Pesan tidak memiliki id_perangkat_esp32.");

  try {
    const pondsRef = firestore.collection('ponds');
    const snapshot = await pondsRef.where('id_perangkat_esp32', '==', deviceId).limit(1).get();
    if (snapshot.empty) return console.log(`Tidak ada kolam untuk perangkat ${deviceId}.`);
    
    const pondId = snapshot.docs[0].id;
    const readingsRef = firestore.collection('ponds').doc(pondId).collection('readings');
    await readingsRef.add({
      suhu: data.suhu,
      ph: data.ph,
      kekeruhan: data.turbidity,
      relay1: data.relay1,
      relay2: data.relay2,
      relay3: data.relay3,
      relay4: data.relay4,
      relay_kuras: data.relay_kuras,
      relay_isi: data.relay_isi,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Data dari ${deviceId} berhasil disimpan ke Firestore.`);
  } catch (error) {
    console.error(`Gagal menyimpan data untuk ${deviceId} ke Firestore:`, error);
  }
}

// --- Fungsi untuk memicu notifikasi WhatsApp ---
async function triggerWhatsAppNotification(data) {
    const deviceId = data.id_perangkat_esp32;
    const botUrl = process.env.WHATSAPP_BOT_URL;

    // --- PERUBAHAN: Cek Cooldown ---
    const now = Date.now();
    const lastNotificationTime = notificationCooldowns.get(deviceId);
    if (lastNotificationTime && (now - lastNotificationTime < COOLDOWN_PERIOD_MS)) {
        console.log(`Notifikasi untuk ${deviceId} dalam masa cooldown. Permintaan diabaikan.`);
        return; // Hentikan fungsi jika masih dalam masa cooldown
    }
    // --- Selesai Cek Cooldown ---

    if (!botUrl) {
        return console.error("URL Bot WhatsApp (WHATSAPP_BOT_URL) tidak diatur di environment variables!");
    }
    if (!firestore) {
        return console.error("Firestore tidak terinisialisasi, notifikasi tidak dapat dikirim.");
    }

    try {
        // 1. Cari data kolam
        const pondsRef = firestore.collection('ponds');
        const pondSnapshot = await pondsRef.where('id_perangkat_esp32', '==', deviceId).limit(1).get();
        if (pondSnapshot.empty) return console.log(`Notifikasi gagal: Tidak ada kolam untuk perangkat ${deviceId}.`);
        
        const pondDoc = pondSnapshot.docs[0];
        const pondData = pondDoc.data();

        // 2. Cari data pengguna (nomor WA)
        const userRef = firestore.collection('users').doc(pondData.id_pengguna);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists || !userDoc.data().nomor_wa) {
            return console.log(`Notifikasi gagal: Pengguna ${pondData.id_pengguna} tidak ditemukan atau tidak memiliki nomor WA.`);
        }
        const userWhatsappNumber = userDoc.data().nomor_wa;

        // 3. Ambil data sensor terakhir untuk laporan
        const readingsQuery = await firestore.collection('ponds').doc(pondDoc.id).collection('readings').orderBy('timestamp', 'desc').limit(1).get();
        let sensorReport = "Data sensor saat ini tidak tersedia.";
        if (!readingsQuery.empty) {
            const latestReading = readingsQuery.docs[0].data();
            sensorReport = `*Kondisi Air Saat Ini:*\n - Suhu: ${latestReading.suhu.toFixed(1)}°C\n - pH: ${latestReading.ph.toFixed(2)}\n - Kekeruhan: ${latestReading.kekeruhan.toFixed(1)} NTU`;
        }

        // 4. Buat pesan notifikasi
        const notifMessage = `🔔 *Notifikasi Pakan Otomatis*\n\nServo pakan untuk kolam *${pondData.nama_kolam}* telah aktif untuk tahap *${pondData.pengaturan.tahap_aktif}*.\n\n${sensorReport}`;

        // --- PERUBAHAN: Atur timestamp cooldown SEBELUM mengirim ---
        notificationCooldowns.set(deviceId, now);

        // 5. Kirim perintah ke bot
        await axios.post(`${botUrl}/send-message`, { number: userWhatsappNumber, message: notifMessage });
        console.log(`Perintah notifikasi untuk ${userWhatsappNumber} berhasil dikirim ke bot.`);

    } catch (error) {
        // Meskipun gagal, cooldown tetap aktif untuk mencegah percobaan ulang yang cepat
        console.error(`Gagal memproses notifikasi untuk ${deviceId}: ${error.message}`);
    }
}


wss.on('connection', (ws) => {
  console.log('Client connected');
  let deviceId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message: %s', message);

      switch (data.type) {
        case 'register_device':
          deviceId = data.id_perangkat_esp32;
          if (deviceId) {
            connectedDevices.set(deviceId, ws);
            console.log(`Device ${deviceId} registered and connected.`);
          }
          break;

        case 'status_update':
          saveDataToFirestore(data);
          break;
        
        case 'feed_notification':
            triggerWhatsAppNotification(data);
            break;

        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Failed to parse message or process data:', error);
    }
  });

  ws.on('close', () => {
    if (deviceId) {
      connectedDevices.delete(deviceId);
      console.log(`Device ${deviceId} disconnected.`);
    } else {
      console.log('Client disconnected');
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
