// whatsappNotifier.js
// Modul ini mengelola koneksi ke WhatsApp dan menyediakan fungsi untuk mengirim pesan.

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Menggunakan LocalAuth untuk menyimpan sesi.
// Anda hanya perlu scan QR code sekali, kecuali jika Anda logout.
const client = new Client({
    authStrategy: new LocalAuth()
});

// Event ini akan berjalan saat QR code perlu di-scan.
client.on('qr', qr => {
    console.log('--------------------------------------------------');
    console.log('WHATSAPP: Scan QR Code ini dengan aplikasi WhatsApp Anda:');
    qrcode.generate(qr, { small: true });
    console.log('--------------------------------------------------');
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
