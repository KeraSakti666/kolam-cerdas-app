// src/App.js
// Komponen utama aplikasi yang mengelola state, autentikasi, dan tampilan.

import React, { useState, useEffect } from 'react';
import './App.css'; // Pastikan Anda memiliki file CSS ini

// --- Impor dari Firebase ---
import { auth, firestore } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  limit,
  orderBy,
} from 'firebase/firestore';

// --- Impor Komponen Lokal ---
import AuthForm from './AuthForm';

// --- Komponen UI Kecil ---
const RelayStatus = ({ label, isActive }) => (
  <div className={`relay-status ${isActive ? 'active' : ''}`}>
    {label}: <strong>{isActive ? 'ON' : 'OFF'}</strong>
  </div>
);

// --- Komponen Utama Aplikasi ---
function App() {
  // State untuk Autentikasi dan UI
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [message, setMessage] = useState('');

  // State untuk Manajemen Kolam
  const [ponds, setPonds] = useState([]);
  const [selectedPondId, setSelectedPondId] = useState('');

  // State untuk Data Real-time
  const [pondSettings, setPondSettings] = useState(null);
  const [latestReading, setLatestReading] = useState(null);

  // --- State untuk Fitur WhatsApp ---
  const [userWhatsapp, setUserWhatsapp] = useState('');
  const [isWhatsappLoading, setIsWhatsappLoading] = useState(false);

  // --- PERUBAHAN DI SINI ---
  // Gunakan string kosong untuk backendUrl sesuai panduan rewrite
  const backendUrl = '';

  const feedDurations = {
    bibit: '15 detik',
    remaja: '30 detik',
    dewasa: '60 detik'
  };

  // Efek untuk memantau status autentikasi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (!user) {
        setPonds([]);
        setSelectedPondId('');
        setPondSettings(null);
        setLatestReading(null);
        setUserWhatsapp('');
      }
    });
    return () => unsubscribe();
  }, []);

  // Efek untuk mengambil data pengguna (termasuk nomor WA)
  useEffect(() => {
    if (!currentUser) return;
    const userDocRef = doc(firestore, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists() && doc.data().nomor_wa) {
        setUserWhatsapp(doc.data().nomor_wa);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Efek untuk mengambil daftar kolam
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(firestore, 'ponds'), where('id_pengguna', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pondsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPonds(pondsData);
      if (pondsData.length > 0 && !pondsData.find(p => p.id === selectedPondId)) {
        setSelectedPondId(pondsData[0].id);
      } else if (pondsData.length === 0) {
        setSelectedPondId('');
      }
    });
    return () => unsubscribe();
  }, [currentUser, selectedPondId]);

  // Efek untuk memantau data kolam yang dipilih
  useEffect(() => {
    if (!selectedPondId) {
      setPondSettings(null);
      setLatestReading(null);
      return;
    }
    const pondDocRef = doc(firestore, 'ponds', selectedPondId);
    const unsubscribeSettings = onSnapshot(pondDocRef, (doc) => {
      if (doc.exists()) {
        setPondSettings(doc.data().pengaturan);
      }
    });
    const readingsQuery = query(
      collection(firestore, 'ponds', selectedPondId, 'readings'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const unsubscribeReadings = onSnapshot(readingsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setLatestReading(snapshot.docs[0].data());
      } else {
        setLatestReading(null);
      }
    });
    return () => {
      unsubscribeSettings();
      unsubscribeReadings();
    };
  }, [selectedPondId]);

  // Handler fungsi
  const handleLogout = () => signOut(auth);

  // --- FUNGSI API CALL YANG DIPERBARUI ---
  const handleApiCall = async (endpoint, method, body, setLoadingState) => {
    if (!currentUser) return;
    setMessage('');
    if (setLoadingState) setLoadingState(true);
    const token = await currentUser.getIdToken();
    try {
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      // Periksa dulu apakah responsnya OK (status 200-299)
      if (!response.ok) {
        // Jika tidak OK, coba baca respons sebagai teks biasa
        const errorText = await response.text();
        // Tampilkan pesan error dari server, atau status error jika kosong
        throw new Error(errorText || `Server Error: ${response.status}`);
      }

      // Jika respons OK, baru baca sebagai JSON
      const data = await response.json();
      setMessage(`✅ ${data.message}`);

    } catch (error) {
      // Tampilkan pesan error yang lebih informatif
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      if (setLoadingState) setLoadingState(false);
    }
  };
  
  const handleSetLimits = (e) => {
    e.preventDefault();
    if (!selectedPondId || !pondSettings) return;
    handleApiCall(`/api/ponds/${selectedPondId}/set-limits`, 'POST', {
      minSuhu: pondSettings.min_suhu,
      maxSuhu: pondSettings.maks_suhu,
      minPh: pondSettings.min_ph,
      maxPh: pondSettings.maks_ph
    });
  };

  const handleSetTahap = (tahap) => {
    if (!selectedPondId) return;
    handleApiCall(`/api/ponds/${selectedPondId}/set-tahap`, 'POST', { tahap });
  };
  
  const handleAddPond = async () => {
    const nama_kolam = prompt('Masukkan nama kolam baru:');
    const id_perangkat_esp32 = prompt('Masukkan ID perangkat ESP32:');
    if (nama_kolam && id_perangkat_esp32) {
      await handleApiCall('/api/ponds', 'POST', { nama_kolam, id_perangkat_esp32 });
    }
  };

  const handleSetWhatsapp = () => {
    const nomor_wa = prompt('Masukkan nomor WhatsApp Anda (format: 628...):', userWhatsapp);
    if (nomor_wa) {
      handleApiCall('/api/user/whatsapp', 'POST', { nomor_wa }, setIsWhatsappLoading);
    }
  };

  // Render logic
  if (loading) return <div className="loading-screen">Memuat Aplikasi...</div>;
  if (!currentUser) return <AuthForm isRegister={showRegister} onAuthSuccess={setCurrentUser} onToggleForm={() => setShowRegister(!showRegister)} />;

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-top">
          <h1>Kontrol Cerdas Kolam Ikan</h1>
          <div className="user-info">
            <p>Halo, {currentUser.email}!</p>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        </div>

        <div className="pond-selection">
          <h2>Pilih Kolam:</h2>
          <select value={selectedPondId} onChange={(e) => setSelectedPondId(e.target.value)} className="pond-selector">
            <option value="" disabled>Pilih Kolam</option>
            {ponds.map(pond => <option key={pond.id} value={pond.id}>{pond.nama_kolam}</option>)}
          </select>
          <button onClick={handleAddPond} className="add-pond-button">+ Tambah Kolam</button>
        </div>

        {selectedPondId ? (
          <>
            <div className="status-grid">
              <div className="status-card"><span>Suhu</span><strong>{latestReading ? `${latestReading.suhu.toFixed(1)}°C` : '...'}</strong></div>
              <div className="status-card"><span>pH</span><strong>{latestReading ? latestReading.ph.toFixed(2) : '...'}</strong></div>
              <div className="status-card"><span>Kekeruhan</span><strong>{latestReading ? `${latestReading.kekeruhan.toFixed(1)} NTU` : '...'}</strong></div>
              <div className="status-card relay-container"><h3>Kontrol Suhu</h3><RelayStatus label="Pendingin" isActive={latestReading?.relay1} /><RelayStatus label="Pemanas" isActive={latestReading?.relay2} /></div>
              <div className="status-card relay-container"><h3>Kontrol pH</h3><RelayStatus label="pH Up" isActive={latestReading?.relay3} /><RelayStatus label="pH Down" isActive={latestReading?.relay4} /></div>
              <div className="status-card relay-container"><h3>Sirkulasi Air</h3><RelayStatus label="Kuras" isActive={latestReading?.relay_kuras} /><RelayStatus label="Isi" isActive={latestReading?.relay_isi} /></div>
            </div>

            {pondSettings && (
              <>
                <div className="settings-section">
                  <h2>Pengaturan Batas Otomatis</h2>
                  <form onSubmit={handleSetLimits} className="limits-form">
                    <div className="input-row"><label>Suhu Min/Max (°C):</label><input type="number" step="0.1" value={pondSettings.min_suhu} onChange={(e) => setPondSettings({...pondSettings, min_suhu: e.target.value})} /><input type="number" step="0.1" value={pondSettings.maks_suhu} onChange={(e) => setPondSettings({...pondSettings, maks_suhu: e.target.value})} /></div>
                    <div className="input-row"><label>pH Min/Max:</label><input type="number" step="0.1" value={pondSettings.min_ph} onChange={(e) => setPondSettings({...pondSettings, min_ph: e.target.value})} /><input type="number" step="0.1" value={pondSettings.maks_ph} onChange={(e) => setPondSettings({...pondSettings, maks_ph: e.target.value})} /></div>
                    <button type="submit">Simpan Pengaturan</button>
                  </form>
                </div>
                <div className="button-container">
                  <h3>
                    Tahap Pakan Aktif: <strong>{pondSettings.tahap_aktif}</strong>
                    <span style={{ fontWeight: 'normal', marginLeft: '8px', fontSize: '0.9rem' }}>
                      (Durasi: {feedDurations[pondSettings.tahap_aktif]})
                    </span>
                  </h3>
                  <div style={{ marginTop: '10px' }}>
                    {['bibit', 'remaja', 'dewasa'].map(tahap => (
                      <button key={tahap} onClick={() => handleSetTahap(tahap)} className={pondSettings.tahap_aktif === tahap ? 'active' : ''}>
                        Set ke {tahap}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="settings-section">
                  <h2>Notifikasi WhatsApp</h2>
                  <p>Notifikasi otomatis akan dikirim ke: <strong>{userWhatsapp || 'Belum diatur'}</strong></p>
                  <div className="button-container" style={{ marginTop: '10px' }}>
                    <button onClick={handleSetWhatsapp} disabled={isWhatsappLoading}>
                      {isWhatsappLoading ? 'Menyimpan...' : 'Ubah Nomor WhatsApp'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="status-message">Silakan pilih atau tambahkan kolam untuk memulai.</p>
        )}
        {message && <p className="status-message">{message}</p>}
      </header>
    </div>
  );
}

export default App;
