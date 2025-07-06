// src/AuthForm.js
// Komponen ini menggantikan Login.js dan Register.js
// Menyediakan antarmuka untuk login dan registrasi menggunakan Firebase Authentication.

import React, { useState } from 'react';

// Impor fungsi autentikasi dari Firebase SDK
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from './firebaseConfig'; // Impor instance auth dari konfigurasi Anda

import './Login.css'; // Anda bisa tetap menggunakan styling lama

/**
 * Komponen untuk menangani Login dan Registrasi.
 * @param {object} props
 * @param {boolean} props.isRegister - Menentukan apakah form dalam mode register atau login.
 * @param {function} props.onAuthSuccess - Callback yang dipanggil setelah login berhasil.
 * @param {function} props.onToggleForm - Callback untuk beralih antara mode login dan register.
 */
function AuthForm({ isRegister, onAuthSuccess, onToggleForm }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // --- LOGIKA REGISTER BARU ---
        // Membuat pengguna baru langsung di Firebase Authentication
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Registrasi berhasil! Silakan login dengan akun Anda.');
        onToggleForm(); // Otomatis pindah ke form login setelah sukses register
      } else {
        // --- LOGIKA LOGIN BARU ---
        // Melakukan login langsung dengan Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Panggil callback di App.js dengan data user dari Firebase
        onAuthSuccess(userCredential.user);
      }
    } catch (err) {
      // Menangkap dan menampilkan error dari Firebase
      console.error('Firebase Auth Error:', err.code, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isRegister ? 'Daftar Akun Baru' : 'Login ke Sistem'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="Masukkan Email"
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
              placeholder="Masukkan Password"
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Memproses...' : (isRegister ? 'Daftar' : 'Login')}
          </button>
        </form>
        <p className="switch-auth">
          <span onClick={onToggleForm}>
            {isRegister ? 'Sudah punya akun? Login di sini.' : 'Belum punya akun? Daftar di sini.'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default AuthForm;
