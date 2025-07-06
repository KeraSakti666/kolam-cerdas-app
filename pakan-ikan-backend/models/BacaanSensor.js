    // models/BacaanSensor.js
    // Definisi model untuk tabel 'bacaan_sensor' di database (opsional).

    module.exports = (sequelize, DataTypes) => {
      const BacaanSensor = sequelize.define('bacaan_sensor', { // 'bacaan_sensor' adalah nama tabel di database MySQL Anda
        id: {
          type: DataTypes.INTEGER(11),
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        id_kolam: { // Kunci asing yang merujuk ke tabel 'kolam'
          type: DataTypes.INTEGER(11),
          allowNull: false,
          references: {
            model: 'kolam',
            key: 'id'
          }
        },
        waktu_baca: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          allowNull: false
        },
        suhu: {
          type: DataTypes.FLOAT,
          allowNull: true // Bisa null jika sensor gagal membaca
        },
        ph: {
          type: DataTypes.FLOAT,
          allowNull: true
        },
        kekeruhan: { // Nama kolom untuk turbidity
          type: DataTypes.FLOAT,
          allowNull: true
        },
        status_relay1: {
          type: DataTypes.BOOLEAN,
          allowNull: true
        },
        status_relay2: {
          type: DataTypes.BOOLEAN,
          allowNull: true
        },
        status_relay3: {
          type: DataTypes.BOOLEAN,
          allowNull: true
        },
        status_relay4: {
          type: DataTypes.BOOLEAN,
          allowNull: true
        },
        status_relay_kuras: {
          type: DataTypes.BOOLEAN,
          allowNull: true
        },
        status_relay_isi: {
          type: DataTypes.BOOLEAN,
          allowNull: true
        }
      }, {
        tableName: 'bacaan_sensor', 
        timestamps: false
      });

      return BacaanSensor;
    };
    