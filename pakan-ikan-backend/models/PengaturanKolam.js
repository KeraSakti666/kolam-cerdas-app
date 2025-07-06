    // models/PengaturanKolam.js
    // Definisi model untuk tabel 'pengaturan_kolam' di database.

    module.exports = (sequelize, DataTypes) => {
      const PengaturanKolam = sequelize.define('pengaturan_kolam', { // 'pengaturan_kolam' adalah nama tabel di database MySQL Anda
        id: {
          type: DataTypes.INTEGER(11),
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        id_kolam: { // Kunci asing yang merujuk ke tabel 'kolam'
          type: DataTypes.INTEGER(11),
          allowNull: false,
          unique: true, // Memastikan hanya ada satu set pengaturan per kolam
          references: {
            model: 'kolam', // Nama tabel yang direferensikan
            key: 'id'
          }
        },
        min_suhu: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 20.0
        },
        maks_suhu: { // Nama kolom sesuai dengan yang Anda inginkan
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 30.0
        },
        min_ph: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 6.5
        },
        maks_ph: { // Nama kolom sesuai dengan yang Anda inginkan
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 7.5
        },
        tahap_aktif: { // Tahap pertumbuhan ikan: bibit, remaja, dewasa
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'bibit'
        },
        diperbarui_pada: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          onUpdate: DataTypes.NOW,
          allowNull: false
        }
      }, {
        tableName: 'pengaturan_kolam', // Pastikan ini sesuai dengan nama tabel di MySQL Anda
        timestamps: false
      });

      return PengaturanKolam;
    };
    