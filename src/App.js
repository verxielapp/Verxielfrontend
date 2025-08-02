import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Chat from './Chat';
import Profile from './Profile';
import QRLogin from './QRLogin';
import './App.css';
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
  const [showSettings, setShowSettings] = useState(false);
  const [showUnknownChat, setShowUnknownChat] = useState(false);

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
    if (!token) {
      console.log('Token yok, contacts yüklenmiyor');
      return;
    }
    
    console.log('Loading contacts with token:', token.substring(0, 20) + '...');
    
    try {
      const res = await axios.get('https://verxiel.onrender.com/api/auth/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Contacts loaded successfully:', res.data);
      // API'den gelen veriyi kontrol et
      const contactsData = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.contacts) ? res.data.contacts : []);
      setContacts(contactsData);
      // İlk kişi yoksa otomatik seç
      if (!selectedContact && contactsData.length > 0) {
        setSelectedContact(contactsData[0]);
      }
    } catch (err) {
      console.error('Load contacts error:', err);
      console.error('Error response:', err.response);
      setContacts([]); // Hata durumunda boş array
      // Eğer 500 hatası varsa, kullanıcıyı bilgilendir
      if (err.response?.status === 500) {
        console.log('Backend sunucu hatası - Lütfen daha sonra tekrar deneyin');
      }
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

  // Bilinmeyen kişi ile mesajlaşma başlat
  const startChatWithUnknown = async (email) => {
    try {
      // Önce kişiyi bul
      const res = await axios.get('https://verxiel.onrender.com/api/auth/find', {
        params: { email },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data) {
        const unknownContact = res.data;
        // Kişi listede var mı kontrol et
        const existingContact = contacts.find(c => (c.id || c._id) === (unknownContact.id || unknownContact._id));
        
        if (!existingContact) {
          // Kişiyi listeye ekle
          await addContact(email);
          // Yeni eklenen kişiyi seç
          setSelectedContact(unknownContact);
        } else {
          // Zaten listede, direkt seç
          setSelectedContact(existingContact);
        }
      }
    } catch (err) {
      console.error('Start chat with unknown error:', err);
      // Eğer kişi bulunamazsa, geçici bir contact objesi oluştur
      const tempContact = {
        id: 'temp_' + Date.now(),
        _id: 'temp_' + Date.now(),
        displayName: email.split('@')[0],
        email: email,
        avatarUrl: '',
        isTemporary: true
      };
      setSelectedContact(tempContact);
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
    setShowSettings(true);
  };

  // Ayarlar modalını kapat
  const closeSettings = () => {
    setShowSettings(false);
  };


  // Eğer token varsa sohbet ve profil ekranını göster
  if (token) {
    return (
      <div className="app-container">
        {/* HEADER */}
        <div className="app-header">
          <div className="app-header-left">
            <img src="/logo192.png" alt="Verxiel Logo" className="app-logo" />
            <span className="app-title">Verxiel</span>
          </div>
          <div className="app-header-right">
            <span className="app-user-info">{user?.displayName || user?.username || user?.email || 'Kullanıcı'}</span>
            <button onClick={handleSettings} className="app-settings-btn">⚙️</button>
            <button onClick={handleLogout} className="app-logout-btn">Çıkış</button>
          </div>
        </div>
        {/* ANA İÇERİK */}
        <div className="app-content">
          <div className="app-sidebar">
            <div className="app-sidebar-header">
              <h4>Kişiler</h4>
              <div className="app-sidebar-buttons">
                <button onClick={() => setShowAddContact(true)} className="app-add-contact-btn">+</button>
                <button onClick={() => setShowUnknownChat(true)} className="app-unknown-chat-btn">💬</button>
              </div>
            </div>
            <ul className="app-contacts-list">
              {(Array.isArray(contacts) ? contacts : []).map(c => (
                <li key={c?.id || c?._id} className={selectedContact?.id === (c?.id || c?._id) ? 'selected' : ''} onClick={() => setSelectedContact(c)}>
                  {c?.avatarUrl ? (
                    <img src={c.avatarUrl} alt="avatar" className="app-contact-avatar" />
                  ) : (
                    <div className="app-contact-avatar-placeholder">
                      {(c?.displayName?.[0]?.toUpperCase()) || '?'}
                    </div>
                  )}
                  <span className="app-contact-name">{c?.displayName || 'Bilinmiyor'}</span>
                </li>
              ))}
            </ul>
            {/* Kişi ekle modalı */}
            {showAddContact && (
              <div className="app-add-contact-modal-overlay">
                <div className="app-add-contact-modal-content">
                  <h3>Kişi Ekle</h3>
                  <input
                    type="email"
                    placeholder="Email adresi"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="app-add-contact-input"
                  />
                  <div className="app-add-contact-buttons">
                    <button onClick={() => addContact(addEmail)} className="app-add-contact-btn-primary">
                      Ekle
                    </button>
                    <button onClick={() => setShowAddContact(false)} className="app-add-contact-btn-secondary">
                      İptal
                    </button>
                  </div>
                  {addContactMsg && (
                    <div className={`app-add-contact-message ${addContactMsg.includes('eklendi') ? 'success' : 'error'}`}>
                      {addContactMsg}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Bilinmeyen kişi ile mesajlaşma modalı */}
            {showUnknownChat && (
              <div className="app-add-contact-modal-overlay">
                <div className="app-add-contact-modal-content">
                  <h3>Bilinmeyen Kişi ile Mesajlaş</h3>
                  <input
                    type="email"
                    placeholder="Email adresi"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="app-add-contact-input"
                  />
                  <div className="app-add-contact-buttons">
                    <button onClick={() => {
                      startChatWithUnknown(addEmail);
                      setShowUnknownChat(false);
                      setAddEmail('');
                    }} className="app-add-contact-btn-primary">
                      Mesajlaş
                    </button>
                    <button onClick={() => setShowUnknownChat(false)} className="app-add-contact-btn-secondary">
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="app-main-content">
            {selectedContact ? (
              <Chat token={token} user={user} contact={selectedContact} addContact={addContact} />
            ) : (
              <div className="app-no-contact-message">Bir kişi seçin...</div>
            )}
          </div>
          <div className="app-profile-sidebar">
            <Profile token={token} onContactsChange={setContacts} addContact={addContact} deleteContact={deleteContact} />
          </div>
        </div>
        
        {/* Ayarlar Modalı */}
        {showSettings && (
          <div className="app-settings-modal-overlay">
            <div className="app-settings-modal-content">
              <div className="app-settings-header">
                <h2>Ayarlar</h2>
                <button onClick={closeSettings} className="app-settings-close-btn">×</button>
              </div>
              
              <div className="app-settings-sections">
                {/* Profil Ayarları */}
                <div className="app-settings-section">
                  <h3>👤 Profil</h3>
                  <div className="app-settings-item">
                    <span>Kullanıcı Adı:</span>
                    <span className="app-settings-value">{user?.username || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="app-settings-item">
                    <span>E-posta:</span>
                    <span className="app-settings-value">{user?.email}</span>
                  </div>
                  <div className="app-settings-item">
                    <span>Görünen Ad:</span>
                    <span className="app-settings-value">{user?.displayName || 'Belirtilmemiş'}</span>
                  </div>
                </div>

                {/* Bildirim Ayarları */}
                <div className="app-settings-section">
                  <h3>🔔 Bildirimler</h3>
                  <div className="app-settings-item">
                    <span>Mesaj Bildirimleri</span>
                    <label className="app-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="app-settings-slider"></span>
                    </label>
                  </div>
                  <div className="app-settings-item">
                    <span>Arama Bildirimleri</span>
                    <label className="app-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="app-settings-slider"></span>
                    </label>
                  </div>
                  <div className="app-settings-item">
                    <span>Ses Efektleri</span>
                    <label className="app-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="app-settings-slider"></span>
                    </label>
                  </div>
                </div>

                {/* Gizlilik Ayarları */}
                <div className="app-settings-section">
                  <h3>🔒 Gizlilik</h3>
                  <div className="app-settings-item">
                    <span>Çevrimiçi Durumu</span>
                    <label className="app-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="app-settings-slider"></span>
                    </label>
                  </div>
                  <div className="app-settings-item">
                    <span>Son Görülme</span>
                    <label className="app-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="app-settings-slider"></span>
                    </label>
                  </div>
                  <div className="app-settings-item">
                    <span>Profil Fotoğrafı</span>
                    <label className="app-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="app-settings-slider"></span>
                    </label>
                  </div>
                </div>

                {/* Uygulama Ayarları */}
                <div className="app-settings-section">
                  <h3>⚙️ Uygulama</h3>
                  <div className="app-settings-item">
                    <span>Otomatik Giriş</span>
                    <label className="app-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="app-settings-slider"></span>
                    </label>
                  </div>
                  <div className="app-settings-item">
                    <span>Karanlık Tema</span>
                    <label className="app-settings-toggle">
                      <input type="checkbox" />
                      <span className="app-settings-slider"></span>
                    </label>
                  </div>
                  <div className="app-settings-item">
                    <span>Dil</span>
                    <select className="app-settings-select" defaultValue="tr">
                      <option value="tr">Türkçe</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>

                {/* Hesap İşlemleri */}
                <div className="app-settings-section">
                  <h3>💼 Hesap</h3>
                  <button className="app-settings-btn app-settings-btn-secondary">
                    🔑 Şifre Değiştir
                  </button>
                  <button className="app-settings-btn app-settings-btn-secondary">
                    📧 E-posta Değiştir
                  </button>
                  <button className="app-settings-btn app-settings-btn-danger">
                    🗑️ Hesabı Sil
                  </button>
                </div>
              </div>

              <div className="app-settings-footer">
                <button onClick={closeSettings} className="app-settings-btn app-settings-btn-primary">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Email doğrulama ekranı
  if (showEmailVerification) {
    return (
      <div className="app-auth-container">
        <div className="app-auth-content">
          <div className="app-auth-header">
            <div className="app-auth-header-icon">
              ✉️
            </div>
            <h2>E-posta Doğrulama</h2>
            <p>E-posta adresinizi girin ve doğrulama kodunu alın.</p>
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
                className="app-auth-input"
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
                className="app-auth-btn-primary"
              >
                📧 Doğrulama Kodu Gönder
              </button>
            </form>
          ) : (
            <>
              <div className="app-auth-message-info">
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
                  className="app-auth-input"
                />
                <button 
                  type="button"
                  onClick={(e) => {
                    if (verificationCode && verificationCode.trim()) {
                      handleEmailVerification(e);
                    }
                  }}
                  className="app-auth-btn-primary"
                >
                  ✅ Doğrula
                </button>
              </form>
              
              <button onClick={resendVerificationCode} className="app-auth-btn-secondary">
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
          }} className="app-auth-btn-secondary">
            ← Geri Dön
          </button>

          <div className={`app-auth-message ${message.includes('başarılı') || message.includes('gönderildi') ? 'success' : message ? 'error' : ''}`}>
            {message}
          </div>
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
    <div className="app-auth-container">
      <div className="app-auth-content">
        <div className="app-auth-header">
          <div className="app-auth-header-icon">
            {mode === 'login' ? '🔐' : '��'}
          </div>
          <h2>
            {mode === 'login' ? 'Hoş Geldiniz' : 'Hesap Oluştur'}
          </h2>
          <p>
            {mode === 'login' ? 'Hesabınıza giriş yapın' : 'Yeni hesabınızı oluşturun'}
          </p>
        </div>

      <form onSubmit={handleAuth}>
        <input
          type="email"
            placeholder="E-posta Adresi"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
            className="app-auth-input"
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
            className="app-auth-input"
        />
        {mode === 'register' && (
          <>
            <input
              type="text"
              placeholder="Görünen Ad"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
                className="app-auth-input"
            />
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
                className="app-auth-input"
            />
          </>
        )}
          <button type="submit" className="app-auth-btn-primary">
          {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>
      </form>

      {mode === 'login' && (
        <button onClick={() => setShowQRLogin(true)} className="app-auth-btn-secondary">
            📱 QR Kod ile Giriş
          </button>
        )}

        {mode === 'login' && (
          <button onClick={() => {
            setShowEmailVerification(true);
            setVerificationEmail('');
            setVerificationCode('');
            setMessage('');
          }} className="app-auth-btn-primary">
            ✉️ Email Doğrula
          </button>
        )}

        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="app-auth-btn-secondary">
          {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </button>

        {message && (
          <div className={`app-auth-message ${message.includes('başarılı') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
