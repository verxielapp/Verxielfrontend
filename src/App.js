import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Chat from './Chat';
import Profile from './Profile';
import QRLogin from './QRLogin';
// import logo from '../public/logo192.png'; // Bunu kaldır

function App() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [username, setUsername] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [addEmail, setAddEmail] = useState('');

  const [addContactMsg, setAddContactMsg] = useState('');
  const [showQRLogin, setShowQRLogin] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationPassword, setVerificationPassword] = useState('');

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

  // Kişi listesini yükle
  const loadContacts = useCallback(async () => {
    try {
      const res = await axios.get('https://verxiel.onrender.com/api/auth/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // API'den gelen veriyi kontrol et
      const contactsData = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.contacts) ? res.data.contacts : []);
      setContacts(contactsData);
      // İlk kişi yoksa otomatik seç
      if (!selectedContact && contactsData.length > 0) {
        setSelectedContact(contactsData[0]);
      }
    } catch (err) {
      console.error('Load contacts error:', err);
      setContacts([]); // Hata durumunda boş array
    }
  }, [token, selectedContact]);

  useEffect(() => {
    if (token) {
      loadContacts();
    }
  }, [token, loadContacts]);

  // Kişi ekle
  const addContact = async (email) => {
    try {
      await axios.post('https://verxiel.onrender.com/api/auth/add-contact-email', { email }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddContactMsg('Kişi eklendi!');
      setAddEmail('');
      setShowAddContact(false);
      loadContacts(); // Kişi listesini yenile
    } catch (err) {
      setAddContactMsg(err.response?.data?.message || 'Kişi eklenemedi!');
    }
  };

  // Kişi sil
  const deleteContact = async (contactId) => {
    try {
      await axios.post('https://verxiel.onrender.com/api/auth/delete-contact', { contactId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = contacts.filter(c => (c.id || c._id) !== contactId);
      setContacts(updated);
      if (selectedContact && (selectedContact.id || selectedContact._id) === contactId) setSelectedContact(updated[0] || null);
    } catch (err) {
      console.error('Delete contact error:', err);
    }
  };

  // Giriş yaptıktan sonra ilk kişiyi otomatik seç
  useEffect(() => {
    if (contacts.length > 0 && !selectedContact) setSelectedContact(contacts[0]);
  }, [contacts, selectedContact]);



  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      const endpoint = mode === 'login' ? 'https://verxiel.onrender.com/api/auth/login' : 'https://verxiel.onrender.com/api/auth/register';
      const data = mode === 'login' ? { email, password } : { email, password, displayName, username };
      
      const res = await axios.post(endpoint, data);
      
      if (mode === 'register') {
        // Register işlemi
        if (res.data.needsVerification) {
          // Email doğrulama gerekiyor
          setVerificationEmail(email);
          setVerificationPassword(password); // Password'ü sakla
          setShowEmailVerification(true);
          setMessage('Kayıt başarılı! Email adresinizi doğrulayın.');
        } else {
          // Email doğrulama gerekmiyorsa direkt giriş yap
        setMessage('Kayıt başarılı! Giriş yapabilirsiniz.');
          setMode('login');
          setEmail('');
          setPassword('');
          setDisplayName('');
          setUsername('');
        }
      } else {
        // Login işlemi
        if (res.data.needsVerification) {
          // Email doğrulama gerekiyor
          setVerificationEmail(email);
          setVerificationPassword(password); // Password'ü sakla
          setShowEmailVerification(true);
          setMessage('Email adresinizi doğrulamanız gerekiyor!');
        } else {
          // Normal login
          localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
          setUser(res.data.user);
          setMessage('Giriş başarılı!');
        }
      }
    } catch (err) {
      if (mode === 'login' && err.response?.data?.needsVerification) {
        // Login'de email doğrulama gerekiyor
        setVerificationEmail(email);
        setVerificationPassword(password); // Password'ü sakla
        setShowEmailVerification(true);
        setMessage('Email adresinizi doğrulamanız gerekiyor!');
      } else {
        setMessage(err.response?.data?.message || 'Bir hata oluştu!');
      }
    }
  };

  // Email doğrulama işlemi
  const handleEmailVerification = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://verxiel.onrender.com/api/auth/verify-email', { 
        email: verificationEmail, 
        code: verificationCode 
      });
      
      setMessage('E-posta doğrulandı! Giriş yapılıyor...');
      
      // Email doğrulandıktan sonra otomatik login yap
      try {
        const loginRes = await axios.post('https://verxiel.onrender.com/api/auth/login', {
          email: verificationEmail,
          password: verificationPassword // Saklanan password'ü kullan
        });
        
        localStorage.setItem('token', loginRes.data.token);
        setToken(loginRes.data.token);
        setUser(loginRes.data.user);
        setShowEmailVerification(false);
        setVerificationEmail('');
        setVerificationCode('');
        setVerificationPassword(''); // Password'ü temizle
        setMessage('Giriş başarılı!');
      } catch (loginErr) {
        setMessage('Email doğrulandı! Şimdi giriş yapabilirsiniz.');
        setShowEmailVerification(false);
        setMode('login');
        setVerificationCode('');
        setVerificationPassword(''); // Password'ü temizle
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Doğrulama kodu hatalı!');
    }
  };

  // Email doğrulama kodu yeniden gönder
  const resendVerificationCode = async () => {
    try {
      await axios.post('https://verxiel.onrender.com/api/auth/resend-code', { 
        email: verificationEmail 
      });
      setMessage('Doğrulama kodu yeniden gönderildi!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Kod gönderilemedi!');
    }
  };

  // Email doğrulama kodu gönder
  const sendVerificationCode = async (email) => {
    try {
      const res = await axios.post('https://verxiel.onrender.com/api/auth/resend-code', { 
        email: email 
      });
      console.log('Backend response:', res.data);
      setMessage('Doğrulama kodu gönderildi! Backend console\'unu kontrol edin.');
      return true;
    } catch (err) {
      console.error('Email gönderme hatası:', err);
      setMessage(err.response?.data?.message || 'Kod gönderilemedi!');
      return false;
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

  // QR login fonksiyonları
  const handleQRLoginSuccess = (userData) => {
    setUser(userData);
    setToken(localStorage.getItem('token'));
    setShowQRLogin(false);
  };

  const handleBackToLogin = () => {
    setShowQRLogin(false);
  };

  // Ayarlar butonu için örnek fonksiyon
  const handleSettings = () => {
    alert('Ayarlar yakında!');
  };



  // Eğer token varsa sohbet ve profil ekranını göster
  if (token) {
    return (
      <div className="app-container">
        {/* HEADER */}
        <div className="app-header">
          <div className="header-logo">
            <img src="/logo192.png" alt="Verxiel Logo" />
            <span>Verxiel</span>
          </div>
          <div className="header-user">
            <span>{user?.displayName || user?.username || user?.email || 'Kullanıcı'}</span>
            <button onClick={handleSettings} className="chat-action-btn" title="Ayarlar">⚙️</button>
            <button onClick={handleLogout} className="auth-button secondary">Çıkış</button>
          </div>
        </div>
        {/* ANA İÇERİK */}
        <div className="app-main">
          <div className="app-sidebar">
            <div className="sidebar-header">
              <h4>Kişiler</h4>
              <button onClick={() => setShowAddContact(true)} className="add-contact-btn" title="Kişi Ekle">+</button>
            </div>
            <ul className="contact-list">
              {(Array.isArray(contacts) ? contacts : []).map(c => (
                <li key={c?.id || c?._id} 
                    className={`contact-item ${(selectedContact?.id || selectedContact?._id) === (c?.id || c?._id) ? 'selected' : ''}`}
                    onClick={() => setSelectedContact(c)}>
                  {c?.avatarUrl ? (
                    <img src={c.avatarUrl} alt="avatar" className="contact-avatar" />
                  ) : (
                    <div className="contact-avatar-placeholder">
                      {(c?.displayName?.[0]?.toUpperCase()) || '?'}
                    </div>
                  )}
                  <span className="contact-name">{c?.displayName || 'Bilinmiyor'}</span>
                </li>
              ))}
            </ul>
            {/* Kişi ekle modalı */}
            {showAddContact && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h3 className="modal-title">Kişi Ekle</h3>
                  <input
                    type="email"
                    placeholder="Email adresi"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="modal-input"
                  />
                  <div className="modal-actions">
                    <button onClick={() => addContact(addEmail)} className="modal-button primary">
                      Ekle
                    </button>
                    <button onClick={() => setShowAddContact(false)} className="modal-button secondary">
                      İptal
                    </button>
                  </div>
                  {addContactMsg && (
                    <div className={`auth-message ${addContactMsg.includes('eklendi') ? 'success' : 'error'}`}>
                      {addContactMsg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="chat-area">
            {selectedContact ? (
              <Chat token={token} user={user} contact={selectedContact} addContact={addContact} />
            ) : (
              <div style={{ margin: 40, color: '#888', textAlign: 'center' }}>Bir kişi seçin...</div>
            )}
          </div>
          <div className="profile-sidebar">
            <Profile token={token} onContactsChange={setContacts} addContact={addContact} deleteContact={deleteContact} />
          </div>
        </div>
      </div>
    );
  }

  // Email doğrulama ekranı
  if (showEmailVerification) {
    return (
      <div className="auth-container">
        <div className="auth-card fade-in">
          <div className="auth-header">
            <div className="auth-logo">✉️</div>
            <h2 className="auth-title">E-posta Doğrulama</h2>
            <p className="auth-subtitle">
              E-posta adresinizi girin ve doğrulama kodunu alın.
            </p>
          </div>

          {!verificationEmail ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (verificationEmail && verificationEmail.trim()) {
                const success = await sendVerificationCode(verificationEmail);
                if (success) {
                  // Email başarıyla gönderildi, form temizlenmez
                }
              }
            }}>
              <input
                type="email"
                placeholder="E-posta Adresi"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                required
                className="auth-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (verificationEmail && verificationEmail.trim()) {
                      sendVerificationCode(verificationEmail);
                    }
                  }
                }}
              />
              <button 
                type="button"
                onClick={async () => {
                  if (verificationEmail && verificationEmail.trim()) {
                    const success = await sendVerificationCode(verificationEmail);
                    if (success) {
                      // Email başarıyla gönderildi
                    }
                  }
                }}
                className="auth-button">
                📧 Doğrulama Kodu Gönder
              </button>
            </form>
          ) : (
            <>
              <div className="auth-message success">
                <p>
                  📧 <strong>{verificationEmail}</strong> adresine doğrulama kodu gönderildi.
                </p>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                if (verificationCode && verificationCode.trim()) {
                  handleEmailVerification(e);
                }
              }}>
                <input
                  type="text"
                  placeholder="Doğrulama Kodu"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  className="auth-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (verificationCode && verificationCode.trim()) {
                        handleEmailVerification(e);
                      }
                    }
                  }}
                />
                <button 
                  type="button"
                  onClick={(e) => {
                    if (verificationCode && verificationCode.trim()) {
                      handleEmailVerification(e);
                    }
                  }}
                  className="auth-button">
                  ✅ Doğrula
                </button>
              </form>
              
              <button onClick={resendVerificationCode} className="auth-button secondary">
                🔄 Kodu Yeniden Gönder
              </button>
            </>
          )}

          <button onClick={() => {
            setShowEmailVerification(false);
            setVerificationEmail('');
            setVerificationCode('');
            setVerificationPassword('');
            setMessage('');
          }} className="auth-button secondary">
            ← Geri Dön
          </button>

          {message && (
            <div className={`auth-message ${message.includes('başarılı') || message.includes('gönderildi') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // QR login gösteriliyorsa QR login ekranını göster
  if (showQRLogin) {
    return <QRLogin onLoginSuccess={handleQRLoginSuccess} onBackToLogin={handleBackToLogin} />;
  }

  // Giriş/kayıt ekranı
  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            {mode === 'login' ? '🔐' : '📝'}
          </div>
          <h2 className="auth-title">
            {mode === 'login' ? 'Hoş Geldiniz' : 'Hesap Oluştur'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Hesabınıza giriş yapın' : 'Yeni hesabınızı oluşturun'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          <input
            type="email"
            placeholder="E-posta Adresi"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="auth-input"
          />
          {mode === 'register' && (
            <>
              <input
                type="text"
                placeholder="Görünen Ad"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="auth-input"
              />
              <input
                type="text"
                placeholder="Kullanıcı Adı"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="auth-input"
              />
            </>
          )}
          <button type="submit" className="auth-button">
            {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        {mode === 'login' && (
          <button onClick={() => setShowQRLogin(true)} className="auth-button secondary">
            📱 QR Kod ile Giriş
          </button>
        )}

        {mode === 'login' && (
          <button onClick={() => {
            setShowEmailVerification(true);
            setVerificationEmail('');
            setVerificationCode('');
            setMessage('');
          }} className="auth-button secondary">
            ✉️ Email Doğrula
          </button>
        )}

        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="auth-button secondary">
          {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </button>

        {message && (
          <div className={`auth-message ${message.includes('başarılı') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
