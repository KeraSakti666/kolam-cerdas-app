    // models/Pengguna.js
    // Definisi model untuk tabel 'pengguna' di database.

    module.exports = (sequelize, DataTypes) => {
      // 'pengguna' adalah nama tabel di database MySQL Anda.
      const Pengguna = sequelize.define('pengguna', {
        id: {
          type: DataTypes.INTEGER(11),
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        username: { // Nama kolom ini sesuai dengan yang Anda inginkan
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true // Memastikan username harus unik
        },
        password: { // Nama kolom ini sesuai dengan yang Anda inginkan (untuk menyimpan hash password)
          type: DataTypes.STRING(255),
          allowNull: false
        },
        dibuat_pada: { // Kolom untuk timestamp creation
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          allowNull: false
        },
        diperbarui_pada: { // Kolom untuk timestamp update
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          onUpdate: DataTypes.NOW, // Otomatis update timestamp saat data diubah
          allowNull: false
        }
      }, {
        tableName: 'pengguna', // Pastikan ini sesuai dengan nama tabel di MySQL Anda
        timestamps: false // Karena kita mengelola 'dibuat_pada' dan 'diperbarui_pada' secara manual
      });

      return Pengguna;
    };
    