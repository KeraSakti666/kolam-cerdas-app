const { Client, LocalAuth } = require('whatsapp-web.js');
const client = new Client({
    authStrategy: new LocalAuth()
});
client.on('qr', qr => {
    console.log('--------------------------------------------------------------------');
    console.log('WHATSAPP: Gagal menampilkan QR Code. Salin semua teks di bawah ini:');
    console.log(qr); 
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

module.exports = { sendMessage };
