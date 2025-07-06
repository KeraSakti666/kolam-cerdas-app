    // models/index.js
    // File ini menginisialisasi Sequelize dan mendefinisikan hubungan antar model (tabel).

    const { Sequelize, DataTypes } = require('sequelize');
    const config = require('../config/config'); // Mengimpor konfigurasi database

    // Menentukan lingkungan (development/production)
    const env = process.env.NODE_ENV || 'development';
    // Mengambil konfigurasi sesuai lingkungan
    const dbConfig = config[env];

    // Membuat instance Sequelize (koneksi ke database)
    const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
      host: dbConfig.host,
      dialect: dbConfig.dialect, // Menentukan dialek database (MySQL)
      port: dbConfig.port,
      logging: dbConfig.logging, // Mengaktifkan/menonaktifkan logging query SQL
      define: {
        timestamps: false // Kita akan mengelola kolom 'dibuat_pada'/'diperbarui_pada' secara manual di setiap model
      }
    });

    // --- Mengimpor Definisi Model ---
    // Setiap file model akan mengembalikan fungsi yang mendefinisikan tabel.
    // Pastikan nama file di sini sesuai dengan nama file yang akan Anda buat di Langkah 5.
    const Pengguna = require('./Pengguna')(sequelize, DataTypes);
    const Kolam = require('./Kolam')(sequelize, DataTypes);
    const PengaturanKolam = require('./PengaturanKolam')(sequelize, DataTypes);
    const BacaanSensor = require('./BacaanSensor')(sequelize, DataTypes); // Opsional: Hanya jika Anda ingin menyimpan data historis sensor

    // --- Mendefinisikan Asosiasi (Hubungan Antar Tabel) ---

    // Pengguna memiliki banyak Kolam (satu pengguna bisa punya banyak kolam)
    // foreignKey: 'id_pengguna' di tabel 'kolam' adalah kunci asing yang merujuk ke 'id' di tabel 'pengguna'
    // as: 'kolam' adalah alias yang digunakan saat melakukan 'include' di query Sequelize
    Pengguna.hasMany(Kolam, { foreignKey: 'id_pengguna', as: 'kolam' });
    Kolam.belongsTo(Pengguna, { foreignKey: 'id_pengguna', as: 'pengguna' }); // Kolam dimiliki oleh satu Pengguna

    // Kolam memiliki satu PengaturanKolam (setiap kolam punya satu set pengaturan)
    Kolam.hasOne(PengaturanKolam, { foreignKey: 'id_kolam', as: 'pengaturan' });
    PengaturanKolam.belongsTo(Kolam, { foreignKey: 'id_kolam', as: 'kolam' }); // PengaturanKolam dimiliki oleh satu Kolam

    // Kolam memiliki banyak BacaanSensor (opsional: jika Anda mencatat riwayat sensor)
    Kolam.hasMany(BacaanSensor, { foreignKey: 'id_kolam', as: 'bacaanSensor' });
    BacaanSensor.belongsTo(Kolam, { foreignKey: 'id_kolam', as: 'kolam' }); // BacaanSensor dimiliki oleh satu Kolam

    // Mengumpulkan semua objek penting untuk diekspor
    const db = {
      sequelize,      // Instance Sequelize (koneksi database)
      Sequelize,      // Class Sequelize
      Pengguna,       // Model Pengguna
      Kolam,          // Model Kolam
      PengaturanKolam, // Model PengaturanKolam
      BacaanSensor    // Model BacaanSensor (opsional)
    };

    module.exports = db; // Mengekspor objek db
    