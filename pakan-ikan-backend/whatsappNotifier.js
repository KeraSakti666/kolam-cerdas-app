// whatsappNotifier.js

const { Client, LocalAuth, LegacySessionAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal'); // Pastikan Anda sudah install: npm install qrcode-terminal

console.log('Memuat WhatsApp Notifier...');

let client;
const sessionData = process.env.WA_SESSION;

// --- LOGIKA UTAMA: Cek apakah kita di Vercel atau Lokal ---

if (sessionData) {
  // --- JIKA DI VERCEL (ada environment variable WA_SESSION) ---
  console.log('Menemukan sesi di Environment Variable. Menggunakan LegacySessionAuth...');
  client = new Client({
    authStrategy: new LegacySessionAuth({
      session: JSON.parse(sessionData) // Ambil sesi dari env var
    })
  });

} else {
  // --- JIKA DI LOKAL (tidak ada environment variable WA_SESSION) ---
  console.log('Tidak ada sesi di Environment Variable. Menggunakan LocalAuth untuk membuat/membaca file sesi lokal...');
  client = new Client({
    authStrategy: new LocalAuth() // Akan menyimpan sesi di folder .wwebjs_auth
  });

  // Event QR hanya perlu dijalankan di LOKAL
  client.on('qr', qr => {
    console.log('--------------------------------------------------------------------');
    console.log('WHATSAPP: Silakan pindai QR Code di bawah ini untuk login.');
    qrcode.generate(qr, { small: true });
    console.log('--------------------------------------------------------------------');
  });

  // Event ini akan memberitahu kita jika sesi sudah tersimpan/diperbarui
    client.on('authenticated', (session) => {
        console.log('WHATSAPP: Autentikasi berhasil!');
        console.log('================== SESI JSON ANDA (SALIN SEMUA DI BAWAH INI) ==================');
        // Baris ini akan mengubah objek sesi menjadi teks JSON yang bisa kita salin
        console.log(JSON.stringify(session)); 
        console.log('================================================================================');
        // Anda bisa menghapus console.log ini setelah sesi berhasil didapatkan
    });
}

// --- Event & Fungsi yang berjalan di kedua lingkungan ---

client.on('ready', () => {
    console.log('✅ WHATSAPP: Klien WhatsApp berhasil terhubung dan siap!');
});

client.on('auth_failure', msg => {
    console.error('WHATSAPP: Autentikasi GAGAL!', msg);
});

client.on('disconnected', (reason) => {
    console.log('WHATSAPP: Klien terputus!', reason);
});

// Mulai inisialisasi client. Ini harus dipanggil setelah client didefinisikan.
client.initialize();


/**
 * Mengirim pesan ke nomor WhatsApp.
 * @param {string} number - Nomor tujuan dalam format '6281234567890'.
 * @param {string} message - Pesan yang akan dikirim.
 */
const sendMessage = async (number, message) => {
    // Pastikan client sudah siap sebelum mengirim pesan
    if (client.info) {
        try {
            // Format nomor ke standar internasional WhatsApp
            const chatId = `${number}@c.us`;
            await client.sendMessage(chatId, message);
            console.log(`WHATSAPP: Pesan laporan berhasil dikirim ke ${number}`);
            return true;
        } catch (error) {
            console.error('WHATSAPP: Gagal mengirim pesan:', error);
            return false;
        }
    } else {
        console.log('WHATSAPP: Klien belum siap, pesan tidak terkirim.');
        return false;
    }
};

module.exports = { sendMessage };