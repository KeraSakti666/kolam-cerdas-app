// whatsappNotifier.js
// Modul ini mengelola koneksi ke WhatsApp dan menyediakan fungsi untuk mengirim pesan.

const { Client, LocalAuth } = require('whatsapp-web.js');
// Kita tidak akan menggunakan qrcode-terminal lagi karena log di Render merusaknya.
// const qrcode = require('qrcode-terminal'); 

// Menggunakan LocalAuth untuk menyimpan sesi.
const client = new Client({
    authStrategy: new LocalAuth()
});

// Event ini akan berjalan saat QR code perlu di-scan.
client.on('qr', qr => {
    // --- PERUBAHAN DI SINI ---
    // Daripada menampilkan gambar, kita akan mencetak data string QR code.
    // Anda bisa menyalin string ini dan menggunakannya di generator QR code online.
    console.log('--------------------------------------------------------------------');
    console.log('WHATSAPP: Gagal menampilkan QR Code. Salin semua teks di bawah ini:');
    console.log(qr); // Cetak data string mentah dari QR code
    console.log('LALU: Buka situs seperti goqr.me, tempel teks di atas, lalu scan QR code yang muncul.');
    console.log('--------------------------------------------------------------------');
});

// Event ini berjalan saat koneksi berhasil.
client.on('ready', () => {
    console.log('✅ WHATSAPP: Klien WhatsApp berhasil terhubung!');
});

// Mulai inisialisasi client
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

// Ekspor fungsi agar bisa digunakan di file lain
module.exports = { sendMessage };
