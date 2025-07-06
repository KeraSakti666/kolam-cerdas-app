    // config/config.js
    // File ini berisi konfigurasi untuk database Anda.
    // Variabel lingkungan (dari .env) akan dimuat di server.js
    // dan digunakan di sini sebagai nilai default.

    module.exports = {
      development: {
        username: process.env.DB_USER || 'root',      
        password: process.env.DB_PASSWORD || '',      
        database: process.env.DB_NAME || 'kolam_pintar_db', 
        host: process.env.DB_HOST || 'localhost',     
        dialect: 'mysql',                             
        port: process.env.DB_PORT || 3306,           
        logging: false                                
      },

    };