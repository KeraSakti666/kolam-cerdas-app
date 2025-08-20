// server.js untuk WebSocket di Render

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// Buat aplikasi Express dasar untuk health check
const app = express();
app.get('/', (req, res) => {
  res.send('WebSocket Server is running');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Objek untuk menyimpan koneksi perangkat yang aktif
// Key: esp32DeviceId, Value: objek WebSocket
const connectedDevices = new Map();

console.log('WebSocket server is starting...');

wss.on('connection', (ws) => {
  console.log('Client connected');
  let deviceId = null; // Variabel untuk menyimpan ID perangkat untuk koneksi ini

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message: %s', message);

      // Logika untuk menangani berbagai jenis pesan
      switch (data.type) {
        // Saat perangkat pertama kali terhubung dan mendaftarkan dirinya
        case 'register_device':
          deviceId = data.id_perangkat_esp32;
          if (deviceId) {
            connectedDevices.set(deviceId, ws);
            console.log(`Device ${deviceId} registered and connected.`);
            // Kirim konfirmasi atau konfigurasi awal jika perlu
            // ws.send(JSON.stringify({ type: 'initial_config', ... }));
          }
          break;

        // Saat perangkat mengirim pembaruan status rutin
        case 'status_update':
          // Di sini Anda bisa memproses data sensor
          // Misalnya, menyimpannya ke database, atau meneruskannya ke frontend
          console.log(`Status update from ${data.id_perangkat_esp32}: Suhu=${data.suhu}, pH=${data.ph}`);
          break;
        
        // Saat perangkat memberi notifikasi pakan
        case 'feed_notification':
            console.log(`Feed notification received from ${data.id_perangkat_esp32}`);
            // Di sini Anda bisa memicu logika notifikasi WhatsApp Anda
            // (Meskipun notifikasi WA Anda sudah ada di server HTTP,
            // Anda bisa memindahkannya ke sini atau memicunya dari sini)
            break;

        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Failed to parse message or process data:', error);
    }
  });

  ws.on('close', () => {
    // Hapus perangkat dari daftar saat koneksi terputus
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
