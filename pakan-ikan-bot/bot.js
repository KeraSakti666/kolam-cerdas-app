// pakan-ikan-bot/bot.js (Versi dengan Teks QR, bukan gambar)

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal'); // --> qrcode-terminal tidak kita gunakan lagi

console.log('Inisialisasi Bot WhatsApp...');

// --- Inisialisasi WhatsApp Client ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// --- PERUBAHAN DI SINI ---
// Event 'qr' sekarang akan mencetak teks mentah, bukan gambar QR
client.on('qr', qr => {
    console.log('====================================================================');
    console.log('!!! TIDAK ADA QR CODE. LAKUKAN INI UNTUK LOGIN:');
    console.log('1. Salin semua teks yang ada di baris berikutnya.');
    console.log('2. Buka situs https://www.goqr.me/');
    console.log('3. Tempel (paste) teks tersebut di kolom "Text". QR code akan muncul di sebelah kanan.');
    console.log('4. Scan QR code yang muncul di situs tersebut dengan HP Anda.');
    console.log('--------------------------------------------------------------------');
    
    // Cetak string mentah dari QR code
    console.log(qr); 
    
    console.log('====================================================================');
});

client.on('ready', () => {
    console.log('✅ BOT WHATSAPP SIAP MENERIMA PERINTAH!');
});

client.on('auth_failure', msg => {
    console.error('AUTH GAGAL!', msg);
});

client.initialize();

// --- Inisialisasi Express Server ---
const app = express();
const PORT = process.env.PORT || 8081;

app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('WhatsApp Bot Service is running.');
});

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ success: false, error: 'Nomor dan pesan diperlukan.' });
    }
    if (!client.info) {
        return res.status(503).json({ success: false, error: 'Klien WhatsApp belum siap.' });
    }

    try {
        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        console.log(`Pesan terkirim ke ${number}`);
        res.status(200).json({ success: true, message: 'Pesan berhasil dikirim.' });
    } catch (error) {
        console.error('Gagal mengirim pesan:', error);
        res.status(500).json({ success: false, error: 'Gagal mengirim pesan WhatsApp.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server bot mendengarkan di port ${PORT}`);
});