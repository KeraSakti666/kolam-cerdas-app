    // src/Login.js
    // Komponen ini menyediakan antarmuka untuk login pengguna.

    import React, { useState } from 'react';
    import axios from 'axios';
    import './Login.css'; // Menggunakan styling yang sama

    // onGoToRegister adalah prop baru untuk beralih ke halaman register
    function Login({ onLoginSuccess, onGoToRegister }) {
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);

      // Fungsi yang dipanggil saat form disubmit
      const handleLogin = async (e) => {
        e.preventDefault(); // Mencegah reload halaman
        setError(''); // Reset pesan error
        setLoading(true); // Set loading menjadi true

        try {
          // Mengirim permintaan POST ke endpoint login di backend
          const response = await axios.post('http://localhost:8080/api/login', {
            username,
            password,
          });
          // Jika login berhasil, panggil fungsi callback dari App.js
          // Mengirim token JWT, userId, dan username ke App.js
          onLoginSuccess(response.data.token, response.data.userId, response.data.username);
        } catch (err) {
          console.error('Login error:', err);
          // Menampilkan pesan error dari respons backend atau pesan default
          setError(err.response?.data?.message || 'Gagal login. Coba lagi.');
        } finally {
          setLoading(false); // Set loading menjadi false
        }
      };

      return (
        <div className="login-container">
          <div className="login-box">
            <h2>Login ke Sistem Kontrol Kolam</h2>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && <p className="error-message">{error}</p>}
              <button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <p className="switch-auth">
              {/* Link untuk beralih ke halaman pendaftaran */}
              Belum punya akun? <span onClick={onGoToRegister}>Daftar di sini.</span>
            </p>
          </div>
        </div>
      );
    }

    export default Login;
    