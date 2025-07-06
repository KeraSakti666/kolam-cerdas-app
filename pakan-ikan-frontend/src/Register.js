    // src/Register.js
    // Komponen ini menyediakan antarmuka untuk pendaftaran akun pengguna baru.

    import React, { useState } from 'react';
    import axios from 'axios';
    import './Login.css'; // Menggunakan styling yang sama dengan Login.css

    function Register({ onRegisterSuccess, onGoToLogin }) {
      // State untuk menyimpan input username dan password
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      // State untuk pesan error yang akan ditampilkan ke pengguna
      const [error, setError] = useState('');
      // State untuk mengelola status loading (saat request ke backend)
      const [loading, setLoading] = useState(false);

      // Fungsi yang dipanggil saat form disubmit
      const handleRegister = async (e) => {
        e.preventDefault(); // Mencegah reload halaman
        setError(''); // Reset pesan error
        setLoading(true); // Set loading menjadi true

        try {
          // Mengirim permintaan POST ke endpoint register di backend
          await axios.post('http://localhost:8080/api/register', {
            username, // Data username dari state
            password, // Data password dari state
          });
          // Jika registrasi berhasil, panggil fungsi callback dari App.js
          onRegisterSuccess();
        } catch (err) {
          console.error('Register error:', err);
          // Menampilkan pesan error dari respons backend atau pesan default
          setError(err.response?.data?.message || 'Gagal registrasi. Coba lagi.');
        } finally {
          setLoading(false); // Set loading menjadi false setelah request selesai
        }
      };

      return (
        <div className="login-container">
          <div className="login-box">
            <h2>Daftar Akun Baru</h2>
            <form onSubmit={handleRegister}>
              <div className="input-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)} // Update state saat input berubah
                  required // Kolom wajib diisi
                  disabled={loading} // Nonaktifkan input saat loading
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} // Update state saat input berubah
                  required // Kolom wajib diisi
                  disabled={loading} // Nonaktifkan input saat loading
                />
              </div>
              {/* Menampilkan pesan error jika ada */}
              {error && <p className="error-message">{error}</p>}
              <button type="submit" disabled={loading}>
                {/* Teks tombol berubah sesuai status loading */}
                {loading ? 'Mendaftar...' : 'Daftar'}
              </button>
            </form>
            <p className="switch-auth">
              {/* Link untuk kembali ke halaman login */}
              Sudah punya akun? <span onClick={onGoToLogin}>Login di sini.</span>
            </p>
          </div>
        </div>
      );
    }

    export default Register;
    