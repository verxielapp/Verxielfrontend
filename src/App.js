import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Chat from './Chat';
import Profile from './Profile';
// import logo from '../public/logo192.png'; // Bunu kaldır

function App() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [username, setUsername] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addContactMsg, setAddContactMsg] = useState('');

  // Oturum bilgisini localStorage'dan yükle
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Token veya user değişince localStorage'a kaydet
  useEffect(() => {
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [token, user]);

  useEffect(() => {
    if (token) {
      axios.get('https://verxiel.onrender.com/api/auth/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setContacts(res.data));
    }
  }, [token]);

  // Kişi ekle
  const addContact = async ({ email, username }) => {
    try {
      let userRes;
      if (email) {
        userRes = await axios.get('https://verxiel.onrender.com/api/auth/find', {
          params: { email },
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (username) {
        userRes = await axios.get('https://verxiel.onrender.com/api/auth/find', {
          params: { username },
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        return;
      }
      const contactId = userRes.data._id;
      await axios.post('https://verxiel.onrender.com/api/auth/add-contact', { contactId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Kişi listesini güncelle
      const contactsRes = await axios.get('https://verxiel.onrender.com/api/auth/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(contactsRes.data);
      // İlk kişi yoksa otomatik seç
      if (!selectedContact && contactsRes.data.length > 0) setSelectedContact(contactsRes.data[0]);
    } catch {}
  };

  // Kişi sil
  const deleteContact = async (contactId) => {
    try {
      await axios.post('https://verxiel.onrender.com/api/auth/delete-contact', { contactId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = contacts.filter(c => c._id !== contactId);
      setContacts(updated);
      if (selectedContact && selectedContact._id === contactId) setSelectedContact(updated[0] || null);
    } catch {}
  };

  // Giriş yaptıktan sonra ilk kişiyi otomatik seç
  useEffect(() => {
    if (contacts.length > 0 && !selectedContact) setSelectedContact(contacts[0]);
  }, [contacts, selectedContact]);

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://verxiel.onrender.com/api/auth/verify-email', { email: pendingEmail, code: verifyCode });
      setMessage('E-posta doğrulandı! Şimdi giriş yapabilirsin.');
      setMode('login');
      setVerifyCode('');
      setPendingEmail('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Doğrulama başarısız');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'register') {
        await axios.post('https://verxiel.onrender.com/api/auth/register', { email, password, displayName, username });
        setMessage('Kayıt başarılı! Lütfen e-posta adresinize gelen kodu girin.');
        setPendingEmail(email);
        setMode('verify');
      } else {
        const res = await axios.post('https://verxiel.onrender.com/api/auth/login', { email, password });
        setMessage('Giriş başarılı!');
        setToken(res.data.token);
        setUser({ ...res.data.user, id: res.data.user._id });
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Bir hata oluştu');
    }
  };

  // Çıkış fonksiyonu
  const handleLogout = () => {
    setToken('');
    setUser(null);
    setSelectedContact(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Ayarlar butonu için örnek fonksiyon
  const handleSettings = () => {
    alert('Ayarlar yakında!');
  };

  // Kişi ekle fonksiyonunu güncelle
  const handleAddContact = async (e) => {
    e.preventDefault();
    setAddContactMsg('');
    try {
      await addContact({ email: addEmail, username: addUsername });
      setAddEmail('');
      setAddUsername('');
      setAddContactMsg('Kişi eklendi!');
      setTimeout(() => setShowAddContact(false), 800);
    } catch {
      setAddContactMsg('Kişi eklenemedi!');
    }
  };

  // Eğer token varsa sohbet ve profil ekranını göster
  if (token) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={{
          width: '100%',
          background: '#222',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          height: 60,
          minHeight: 60,
          boxSizing: 'border-box',
          boxShadow: '0 2px 8px #0002',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src="/logo192.png" alt="Verxiel Logo" style={{ width: 40, height: 40, borderRadius: 12, background: 'white', boxShadow: '0 1px 4px #0002' }} />
            <span style={{ fontWeight: 'bold', fontSize: 24, letterSpacing: 1 }}>Verxiel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{user?.displayName || user?.username || user?.email || 'Kullanıcı'}</span>
            <button onClick={handleSettings} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', marginRight: 8 }} title="Ayarlar">⚙️</button>
            <button onClick={handleLogout} style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 'bold', cursor: 'pointer' }}>Çıkış</button>
          </div>
        </div>
        {/* ANA İÇERİK */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div className="app-sidebar" style={{ width: 220, borderRight: '1px solid #ccc', padding: 12, background: '#fafafa', minWidth: 120, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>Kişiler</h4>
              <button onClick={() => setShowAddContact(true)} style={{ background: '#a259e6', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 22, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Kişi Ekle">+</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {contacts.map(c => (
                <li key={c?._id} className={selectedContact?._id === c?._id ? 'selected' : ''} style={{
                  margin: '8px 0',
                  cursor: 'pointer',
                  fontWeight: selectedContact?._id === c._id ? 'bold' : 'normal',
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderRadius: 8, padding: 4
                }} onClick={() => setSelectedContact(c)}>
                  {c?.avatarUrl ? (
                    <img src={c.avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16 }}>
                      {(c?.displayName?.[0]?.toUpperCase()) || '?'}
                    </div>
                  )}
                  <span style={{ flex: 1 }}>{c?.displayName || 'Bilinmiyor'}</span>
                </li>
              ))}
            </ul>
            {/* Kişi ekle modalı */}
            {showAddContact && (
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }} onClick={() => setShowAddContact(false)}>
                <div style={{ background: '#fff', padding: 32, borderRadius: 16, minWidth: 320, boxShadow: '0 2px 16px #0003', position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowAddContact(false)} style={{ position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
                  <h3>Kişi Ekle</h3>
                  <form onSubmit={handleAddContact} style={{ display: 'flex', gap: 8, flexDirection: 'column', marginTop: 12 }}>
                    <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="E-posta ile kişi ekle" style={{ width: '100%' }} />
                    <input value={addUsername} onChange={e => setAddUsername(e.target.value)} placeholder="Kullanıcı adı ile kişi ekle" style={{ width: '100%' }} />
                    <button type="submit" style={{ background: '#a259e6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontWeight: 'bold', fontSize: 16 }}>Ekle</button>
                  </form>
                  <div style={{ marginTop: 8, color: addContactMsg === 'Kişi eklendi!' ? 'green' : 'red' }}>{addContactMsg}</div>
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            {selectedContact ? (
              <Chat token={token} user={user} contact={selectedContact} addContact={addContact} />
            ) : (
              <div style={{ margin: 40, color: '#888' }}>Bir kişi seçin...</div>
            )}
          </div>
          <div style={{ width: 320, borderLeft: '1px solid #ccc', padding: 12 }}>
            <Profile token={token} onContactsChange={setContacts} addContact={addContact} deleteContact={deleteContact} />
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'verify') {
    return (
      <div style={{ maxWidth: 400, margin: 'auto', marginTop: 100 }}>
        <h2>E-posta Doğrulama</h2>
        <form onSubmit={handleVerify}>
          <input
            type="text"
            placeholder="E-posta adresinize gelen kod"
            value={verifyCode}
            onChange={e => setVerifyCode(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button type="submit" style={{ width: '100%' }}>Doğrula</button>
        </form>
        <div style={{ marginTop: 16, color: 'red' }}>{message}</div>
      </div>
    );
  }

  // Giriş/kayıt ekranı
  return (
    <div style={{ maxWidth: 400, margin: 'auto', marginTop: 100 }}>
      <h2>{mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h2>
      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8 }}
        />
        {mode === 'register' && (
          <>
            <input
              type="text"
              placeholder="Görünen Ad"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 8 }}
            />
          </>
        )}
        <button type="submit" style={{ width: '100%' }}>
          {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ marginTop: 8 }}>
        {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
      </button>
      <div style={{ marginTop: 16, color: 'red' }}>{message}</div>
    </div>
  );
}

export default App;
