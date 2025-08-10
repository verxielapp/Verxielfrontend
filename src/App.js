import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Chat from './Chat';
import FriendRequests from './FriendRequests';
import './App.css';

// Icon imports
import addPeopleIcon from '../icon/addpeople.png';
import profileIcon from '../icon/profileicon.png';
import messagePaneIcon from '../icon/messagepaneicon.png';
import logoIcon from '../icon/logo.png';

// Icons için import edilen dosyalar
const Icons = {
  menu: '☰',
  search: '🔍',
  add: addPeopleIcon,
  chat: messagePaneIcon,
  contacts: '👥',
  profile: profileIcon,
  settings: '⚙️',
  logout: '🚪',
  back: '←',
  send: '📤',
  call: '📞',
  close: '✕',
  logo: logoIcon
};

function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addContactMsg, setAddContactMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  // const [showProfile, setShowProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'contacts', 'profile', 'friend-requests'
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'verify'
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Token geçerliliğini kontrol et
  const verifyToken = async (tokenToVerify) => {
    try {
      console.log('Verifying token:', tokenToVerify.substring(0, 20) + '...');
      const res = await axios.get('https://verxiel.onrender.com/api/verify-token', {
        headers: { Authorization: `Bearer ${tokenToVerify}` }
      });
      console.log('Token verification result:', res.data);
      return res.data.valid === true; // Explicit boolean check
    } catch (err) {
      console.error('Token verification failed:', err.response?.data || err.message);
      // Token süresi dolmuşsa veya geçersizse false döndür
      if (err.response?.status === 401) {
        console.log('Token expired or invalid - clearing data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken('');
        setUser(null);
      }
      return false;
    }
  };

  // LocalStorage'ı temizle
  // const clearLocalStorage = () => {
  //   localStorage.removeItem('token');
  //   localStorage.removeItem('user');
  //   setToken('');
  //   setUser(null);
  //   console.log('LocalStorage temizlendi');
  // };

  // Token geçerliliğini kontrol et
  useEffect(() => {
    const checkTokenValidity = async () => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
      
      console.log('Debug - Saved token:', savedToken ? savedToken.substring(0, 20) + '...' : 'NO TOKEN');
      console.log('Debug - Saved user:', savedUser);
      
    if (savedToken && savedUser) {
        console.log('Checking token validity...');
        try {
          const isValid = await verifyToken(savedToken);
          console.log('Token validity result:', isValid);
          
          if (isValid === true) {
            console.log('Token is valid, setting user data');
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
            console.log('Token is invalid, clearing data');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
            setToken('');
            setUser(null);
          }
        } catch (error) {
          console.error('Token check error:', error);
          // Hata durumunda da temizle
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken('');
          setUser(null);
        }
      }
    };
    
    checkTokenValidity();
  }, []);

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
  // const deleteContact = async (contactId) => {
  //   try {
  //     await axios.post('https://verxiel.onrender.com/api/auth/delete-contact', { contactId }, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
  //     const updated = contacts.filter(c => (c.id || c._id) !== contactId);
  //     setContacts(updated);
  //     if (selectedContact && (selectedContact.id || selectedContact._id) === contactId) setSelectedContact(updated[0] || null);
  //   } catch (err) {
  //     console.error('Delete contact error:', err);
  //   }
  // };

  // Bilinmeyen kişi ile sohbet başlat
  const startChatWithUnknown = async (email) => {
    try {
      // Önce kişiyi eklemeye çalış
      await axios.post('https://verxiel.onrender.com/api/auth/add-contact-email', { email }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Kişi listesini yenile
      await loadContacts();
      
      // Eklenen kişiyi bul ve seç
      const newContact = contacts.find(c => c.email === email);
      if (newContact) {
        setSelectedContact(newContact);
      }
      
      setAddEmail('');
      setShowAddContact(false);
    } catch (err) {
      // Eğer kişi zaten varsa, direkt sohbet başlat
      const existingContact = contacts.find(c => c.email === email);
      if (existingContact) {
        setSelectedContact(existingContact);
        setAddEmail('');
        setShowAddContact(false);
      } else {
        setAddContactMsg(err.response?.data?.message || 'Kişi bulunamadı!');
      }
    }
  };

  // Authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const displayName = formData.get('displayName');
    const username = formData.get('username');

    try {
      if (authMode === 'login') {
        const res = await axios.post('https://verxiel.onrender.com/api/auth/login', { email, password });
        const { token: newToken, user: userData } = res.data;
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
      } else if (authMode === 'register') {
        const res = await axios.post('https://verxiel.onrender.com/api/auth/register', { 
          email, 
          password, 
          displayName, 
          username 
        });
        
        if (res.data.needsVerification) {
          setVerificationEmail(email);
          setAuthMode('verify');
          alert('Kayıt başarılı! Email adresinizi doğrulayın.');
        } else {
          alert('Kayıt başarılı! Giriş yapabilirsiniz.');
          setAuthMode('login');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      alert(err.response?.data?.message || 'İşlem başarısız!');
    }
  };

  // Email verification
  const handleEmailVerification = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const code = formData.get('code');

    try {
      const res = await axios.post('https://verxiel.onrender.com/api/auth/verify-email', { email, code });
      const { token: newToken, user: userData } = res.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      setAuthMode('login');
    } catch (err) {
      console.error('Email verification error:', err);
      alert(err.response?.data?.message || 'Doğrulama başarısız!');
    }
  };

  // Verification code resend
  const resendVerificationCode = async () => {
    const email = verificationEmail || document.querySelector('input[name="email"]')?.value;
    if (!email) {
      alert('Lütfen email adresinizi girin!');
      return;
    }

    try {
      await axios.post('https://verxiel.onrender.com/api/auth/resend-code', { email });
      alert('Doğrulama kodu tekrar gönderildi!');
    } catch (err) {
      alert(err.response?.data?.message || 'Kod gönderilemedi!');
    }
  };

  // Verification code send
  const sendVerificationCode = async (email) => {
    if (!email) {
      alert('Lütfen önce email adresinizi girin!');
      return;
    }
    
    try {
      await axios.post('https://verxiel.onrender.com/api/auth/resend-code', { email });
      setVerificationEmail(email);
      setAuthMode('verify');
      alert('Doğrulama kodu gönderildi! Email adresinizi kontrol edin.');
    } catch (err) {
      alert(err.response?.data?.message || 'Kod gönderilemedi!');
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setContacts([]);
    setSelectedContact(null);
  };

  // QR Login success
  // const handleQRLoginSuccess = (userData) => {
  //   localStorage.setItem('token', userData.token);
  //   localStorage.setItem('user', JSON.stringify(userData.user));
  //   setToken(userData.token);
  //   setUser(userData.user);
  // };

  // Back to login
  const handleBackToLogin = () => {
    // setShowProfile(false);
  };

  // Settings
  const handleSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Mobile navigation
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleMobileNav = (view) => {
    setCurrentView(view);
    closeMobileMenu();
  };

  // Render authentication screen
  if (!token || !user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">V</div>
            <h1 className="auth-title">Verxiel</h1>
            <p className="auth-subtitle">Güvenli Mesajlaşma</p>
          </div>
          
          {authMode === 'login' && (
            <>
              <form onSubmit={handleAuth} className="auth-form">
                  <input
                    type="email"
                  name="email"
                  placeholder="E-posta"
                  required
                  className="auth-input"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Şifre"
                  required
                  className="auth-input"
                />
                <button type="submit" className="auth-button">
                  Giriş Yap
                    </button>
              </form>
              
              <button onClick={() => {
                const email = document.querySelector('input[name="email"]')?.value;
                if (email) {
                  sendVerificationCode(email);
                } else {
                  alert('Lütfen önce email adresinizi girin!');
                }
              }} className="auth-button secondary">
                Email Doğrulama
                    </button>
              
              <button onClick={() => setAuthMode('register')} className="auth-button secondary">
                Kayıt Ol
              </button>
            </>
          )}

          {authMode === 'register' && (
            <>
              <form onSubmit={handleAuth} className="auth-form">
                <input
                  type="text"
                  name="displayName"
                  placeholder="Ad Soyad"
                  required
                  className="auth-input"
                />
                <input
                  type="text"
                  name="username"
                  placeholder="Kullanıcı Adı"
                  required
                  className="auth-input"
                />
              <input
                type="email"
                  name="email"
                  placeholder="E-posta"
                required
                  className="auth-input"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Şifre"
                  required
                  className="auth-input"
                />
                <button type="submit" className="auth-button">
                  Kayıt Ol
              </button>
            </form>
              
              <button onClick={() => setAuthMode('login')} className="auth-button secondary">
                Giriş Yap
              </button>
            </>
          )}

          {authMode === 'verify' && (
            <>
              <form onSubmit={handleEmailVerification} className="auth-form">
                <input
                  type="email"
                  name="email"
                  placeholder="E-posta"
                  value={verificationEmail}
                  onChange={(e) => setVerificationEmail(e.target.value)}
                  required
                  className="auth-input"
                />
                <input
                  type="text"
                  name="code"
                  placeholder="Doğrulama Kodu"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  className="auth-input"
                />
                <button type="submit" className="auth-button">
                  Doğrula
                </button>
              </form>
              
              <button onClick={resendVerificationCode} className="auth-button secondary">
                Kodu Yeniden Gönder
              </button>
              
              <button onClick={() => setAuthMode('login')} className="auth-button secondary">
                Giriş Yap
          </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-overlay open" onClick={closeMobileMenu}></div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <img src="/logo192.png" alt="Verxiel" />
          <span>Verxiel</span>
          </div>
        
        <div className="header-user">
          <span>{user.displayName || user.email}</span>
          <button onClick={toggleTheme} className="theme-toggle-btn">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={handleSettings} className="app-settings-btn">
            {Icons.settings}
          </button>
          <button onClick={handleLogout} className="app-logout-btn">
            {Icons.logout}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Mobile Menu Toggle */}
        <button className="mobile-nav-toggle" onClick={toggleMobileMenu}>
          {Icons.menu}
        </button>

        {/* Sidebar */}
        <aside className={`app-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          {/* Desktop Navigation Tabs */}
          <div className="desktop-nav-tabs">
            <div 
              className={`desktop-nav-tab ${currentView === 'chat' ? 'active' : ''}`}
              onClick={() => handleMobileNav('chat')}
            >
              <span><img src={Icons.chat} alt="Chat" className="nav-icon" /></span>
              <span>Sohbet</span>
            </div>
            <div 
              className={`desktop-nav-tab ${currentView === 'contacts' ? 'active' : ''}`}
              onClick={() => handleMobileNav('contacts')}
            >
              <span><img src={Icons.contacts} alt="Contacts" className="nav-icon" /></span>
              <span>Kişiler</span>
            </div>
            <div 
              className={`desktop-nav-tab ${currentView === 'friend-requests' ? 'active' : ''}`}
              onClick={() => handleMobileNav('friend-requests')}
            >
              <span>🤝</span>
              <span>İstekler</span>
            </div>
            <div 
              className={`desktop-nav-tab ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => handleMobileNav('profile')}
            >
              <span><img src={Icons.profile} alt="Profile" className="nav-icon" /></span>
              <span>Profil</span>
            </div>
          </div>

          {/* Contacts Section */}
          {currentView === 'chat' && (
            <>
              <div className="sidebar-header">
                <h4>Kişiler</h4>
                <button onClick={() => setShowAddContact(true)} className="add-contact-btn">
                  <img src={Icons.add} alt="Add Contact" className="add-icon" />
                </button>
              </div>
              
              <ul className="contact-list">
                {Array.isArray(contacts) && contacts.map(contact => (
                  <li
                    key={contact.id || contact._id}
                    className={`contact-item ${selectedContact && (selectedContact.id || selectedContact._id) === (contact.id || contact._id) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedContact(contact);
                      setCurrentView('chat');
                      closeMobileMenu();
                    }}
                  >
                    {contact.avatarUrl ? (
                      <img src={contact.avatarUrl} alt={contact.displayName} className="contact-avatar" />
                    ) : (
                      <div className="contact-avatar-placeholder">
                        {contact.displayName ? contact.displayName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <div className="contact-name">{contact.displayName || contact.email}</div>
                  </li>
                ))}
              </ul>
          </>
        )}
        </aside>

        {/* Main Content Area */}
        <div className="app-main-content">
          {currentView === 'chat' && selectedContact ? (
            <Chat contact={selectedContact} token={token} user={user} />
          ) : currentView === 'contacts' ? (
            <div className="contacts-view">
              <div className="contacts-header">
                <h2>Kişiler</h2>
                                <button onClick={() => setShowAddContact(true)} className="add-contact-btn mobile">
                  <img src={Icons.add} alt="Add Contact" className="add-icon" />
                </button>
                  </div>
              <ul className="contact-list">
                {Array.isArray(contacts) && contacts.map(contact => (
                  <li key={contact.id || contact._id} className="contact-item">
                    {contact.avatarUrl ? (
                      <img src={contact.avatarUrl} alt={contact.displayName} className="contact-avatar" />
                    ) : (
                      <div className="contact-avatar-placeholder">
                        {contact.displayName ? contact.displayName.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                    <div className="contact-name">{contact.displayName || contact.email}</div>
                  </li>
                ))}
                {(!contacts || contacts.length === 0) && (
                  <li className="contact-item empty">
                    <div className="contact-empty-message">
                      <span>Henüz kişi yok</span>
                      <button onClick={() => setShowAddContact(true)} className="add-first-contact-btn">
                        İlk Kişiyi Ekle
                      </button>
                </div>
                  </li>
            )}
              </ul>
          </div>
          ) : currentView === 'profile' ? (
            <Profile user={user} contacts={contacts} token={token} onBack={handleBackToLogin} />
          ) : currentView === 'friend-requests' ? (
            <FriendRequests token={token} user={user} onBack={() => setCurrentView('chat')} />
            ) : (
            <div className="no-contact-message">
              <h2>Hoş Geldiniz!</h2>
              <p>Bir kişi seçin veya yeni kişi ekleyin</p>
            </div>
            )}
          </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <div 
          className={`mobile-bottom-nav-item ${currentView === 'chat' ? 'active' : ''}`}
          onClick={() => handleMobileNav('chat')}
        >
          <span><img src={Icons.chat} alt="Chat" className="nav-icon" /></span>
          <span>Sohbet</span>
          </div>
        <div 
          className={`mobile-bottom-nav-item ${currentView === 'contacts' ? 'active' : ''}`}
          onClick={() => handleMobileNav('contacts')}
        >
          <span><img src={Icons.contacts} alt="Contacts" className="nav-icon" /></span>
          <span>Kişiler</span>
        </div>
        <div 
          className={`mobile-bottom-nav-item ${currentView === 'friend-requests' ? 'active' : ''}`}
          onClick={() => handleMobileNav('friend-requests')}
        >
          <span>🤝</span>
          <span>İstekler</span>
        </div>
        <div 
          className={`mobile-bottom-nav-item ${currentView === 'profile' ? 'active' : ''}`}
          onClick={() => handleMobileNav('profile')}
        >
          <span><img src={Icons.profile} alt="Profile" className="nav-icon" /></span>
          <span>Profil</span>
      </div>
      </nav>

      {/* Floating Action Button for Mobile */}
      <button 
        className="mobile-fab"
        onClick={() => setShowAddContact(true)}
        title="Kişi Ekle"
      >
        <img src={Icons.add} alt="Add Contact" className="add-icon" />
          </button>

      {/* Add Contact Modal */}
            {showAddContact && (
        <div className="modal-overlay" onClick={() => setShowAddContact(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Kişi Ekle</h3>
                  <input
                    type="email"
              placeholder="E-posta adresi"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
              className="modal-input"
            />
            <div className="modal-actions">
              <button onClick={() => addContact(addEmail)} className="modal-button primary">
                      Ekle
                    </button>
              <button onClick={() => startChatWithUnknown(addEmail)} className="modal-button secondary">
                Sohbet Başlat
                    </button>
                  </div>
            {addContactMsg && <div className="modal-message">{addContactMsg}</div>}
          </div>
                    </div>
                  )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="app-settings-modal-overlay" onClick={closeSettings}>
          <div className="app-settings-modal-content" onClick={e => e.stopPropagation()}>
            <div className="app-settings-header">
              <h2>Ayarlar</h2>
              <button onClick={closeSettings} className="app-settings-close-btn">
                {Icons.close}
        </button>
                </div>
            
            <div className="app-settings-sections">
              <div className="app-settings-section">
                <h3>Profil Bilgileri</h3>
                <div className="app-settings-item">
                  <span>Ad Soyad</span>
                  <span className="app-settings-value">{user.displayName}</span>
              </div>
                <div className="app-settings-item">
                  <span>E-posta</span>
                  <span className="app-settings-value">{user.email}</span>
          </div>
          </div>
              
              <div className="app-settings-section">
                <h3>Bildirimler</h3>
                <div className="app-settings-item">
                  <span>Mesaj Bildirimleri</span>
                  <label className="app-settings-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="app-settings-slider"></span>
                  </label>
          </div>
                <div className="app-settings-item">
                  <span>Ses Bildirimleri</span>
                  <label className="app-settings-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="app-settings-slider"></span>
                  </label>
        </div>
      </div>
              
              <div className="app-settings-section">
                <h3>Gizlilik</h3>
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
              </div>
              </div>
              
            <div className="app-settings-footer">
              <button onClick={handleLogout} className="app-settings-btn app-settings-btn-danger">
                Çıkış Yap
                </button>
          </div>
        </div>
          </div>
        )}
      </div>
    );
  }

// Chat Component - Ana chat bileşeni Chat.js'de tanımlı, burada sadece import edilecek

// Profile Component
function Profile({ user, contacts, token, onBack }) {
  return (
    <div className="profile-sidebar">
      <div className="profile-header">
        <h3>Profil</h3>
        <button onClick={onBack} className="back-btn">{Icons.back}</button>
      </div>
      
      <div className="profile-info">
        <div className="profile-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} />
          ) : (
            <div className="profile-avatar-placeholder">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
          </div>
          )}
        </div>
        <h4>{user.displayName}</h4>
        <p>{user.email}</p>
        </div>

      <div className="profile-stats">
        <div className="stat-item">
          <span className="stat-label">Toplam Kişi</span>
          <span className="stat-value">{Array.isArray(contacts) ? contacts.length : 0}</span>
          </div>
      </div>
    </div>
  );
}

export default App;
