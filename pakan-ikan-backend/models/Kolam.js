    // models/Kolam.js
    // Definisi model untuk tabel 'kolam' di database.

    module.exports = (sequelize, DataTypes) => {
      const Kolam = sequelize.define('kolam', { // 'kolam' adalah nama tabel di database MySQL Anda
        id: {
          type: DataTypes.INTEGER(11),
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        id_pengguna: { // Kunci asing yang merujuk ke tabel 'pengguna'
          type: DataTypes.INTEGER(11),
          allowNull: false,
          references: {
            model: 'pengguna', // Nama tabel yang direferensikan (nama tabel aktual di DB)
            key: 'id'          // Kolom yang direferensikan di tabel 'pengguna'
          }
        },
        nama_kolam: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        lokasi: {
          type: DataTypes.STRING(255),
          allowNull: true // Boleh kosong
        },
        id_perangkat_esp32: { // ID unik untuk setiap perangkat ESP32 yang terhubung ke kolam
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true // Memastikan setiap ID perangkat ESP32 hanya bisa dikaitkan dengan satu kolam
        },
        dibuat_pada: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          allowNull: false
        },
        diperbarui_pada: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          onUpdate: DataTypes.NOW,
          allowNull: false
        }
      }, {
        tableName: 'kolam', // Pastikan ini sesuai dengan nama tabel di MySQL Anda
        timestamps: false
      });

      return Kolam;
    };
    