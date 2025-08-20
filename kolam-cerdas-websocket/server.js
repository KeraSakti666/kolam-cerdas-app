// server.js untuk WebSocket di Render (dengan koneksi Firestore)

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const admin = require('firebase-admin');

// --- Inisialisasi Firebase Admin SDK ---
try {
  // Ambil kredensial dari environment variable
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
  // Jangan keluar dari proses, biarkan server tetap berjalan
  // Mungkin hanya koneksi ke Firebase yang gagal
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

console.log('WebSocket server is starting...');

// --- Fungsi untuk menyimpan data ke Firestore ---
async function saveDataToFirestore(data) {
  if (!firestore) {
    console.error("Firestore tidak terinisialisasi, data tidak dapat disimpan.");
    return;
  }
  
  const deviceId = data.id_perangkat_esp32;
  if (!deviceId) {
    console.error("Pesan tidak memiliki id_perangkat_esp32.");
    return;
  }

  try {
    // 1. Cari dokumen 'pond' berdasarkan id_perangkat_esp32
    const pondsRef = firestore.collection('ponds');
    const snapshot = await pondsRef.where('id_perangkat_esp32', '==', deviceId).limit(1).get();

    if (snapshot.empty) {
      console.log(`Tidak ada kolam yang terdaftar untuk perangkat ${deviceId}.`);
      return;
    }

    const pondDoc = snapshot.docs[0];
    const pondId = pondDoc.id;

    // 2. Tambahkan data sensor baru ke subcollection 'readings'
    const readingsRef = firestore.collection('ponds').doc(pondId).collection('readings');
    await readingsRef.add({
      suhu: data.suhu,
      ph: data.ph,
      turbidity: data.turbidity,
      relay1: data.relay1,
      relay2: data.relay2,
      relay3: data.relay3,
      relay4: data.relay4,
      relay_kuras: data.relay_kuras,
      relay_isi: data.relay_isi,
      timestamp: admin.firestore.FieldValue.serverTimestamp() // Gunakan timestamp server
    });

    console.log(`Data dari ${deviceId} berhasil disimpan ke Firestore di kolam ${pondId}.`);

  } catch (error) {
    console.error(`Gagal menyimpan data untuk ${deviceId} ke Firestore:`, error);
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
          // PANGGIL FUNGSI UNTUK MENYIMPAN KE FIRESTORE
          saveDataToFirestore(data);
          break;
        
        case 'feed_notification':
            console.log(`Feed notification received from ${data.id_perangkat_esp32}`);
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
