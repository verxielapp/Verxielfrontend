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
      const res = await axios.get('/api/auth/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(res.data);
      // İlk kişi yoksa otomatik seç
      if (!selectedContact && res.data.length > 0) {
        setSelectedContact(res.data[0]);
      }
    } catch (err) {
      console.error('Load contacts error:', err);
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
      await axios.post('/api/auth/add-contact-email', { email }, {
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
      await axios.post('/api/auth/delete-contact', { contactId }, {
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
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
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
      await axios.post('/api/auth/verify-email', { 
        email: verificationEmail, 
        code: verificationCode 
      });
      
      setMessage('E-posta doğrulandı! Giriş yapılıyor...');
      
      // Email doğrulandıktan sonra otomatik login yap
      try {
        const loginRes = await axios.post('/api/auth/login', {
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
      await axios.post('/api/auth/resend-code', { 
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
      const res = await axios.post('/api/auth/resend-code', { 
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
                <li key={c?.id || c?._id} className={(selectedContact?.id || selectedContact?._id) === (c?.id || c?._id) ? 'selected' : ''} style={{
                  margin: '8px 0',
                  cursor: 'pointer',
                  fontWeight: (selectedContact?.id || selectedContact?._id) === (c?.id || c?._id) ? 'bold' : 'normal',
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
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  width: '300px',
                  maxWidth: '90vw'
                }}>
                  <h3>Kişi Ekle</h3>
                  <input
                    type="email"
                    placeholder="Email adresi"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      margin: '10px 0',
                      border: '1px solid #ddd',
                      borderRadius: '5px'
                    }}
                  />
                  <div style={{ marginTop: '10px' }}>
                    <button onClick={() => addContact(addEmail)} style={{
                      padding: '10px 20px',
                      marginRight: '10px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}>
                      Ekle
                    </button>
                    <button onClick={() => setShowAddContact(false)} style={{
                      padding: '10px 20px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}>
                      İptal
                    </button>
                  </div>
                  {addContactMsg && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      background: addContactMsg.includes('eklendi') ? '#d4edda' : '#f8d7da',
                      color: addContactMsg.includes('eklendi') ? '#155724' : '#721c24',
                      borderRadius: '5px'
                    }}>
                      {addContactMsg}
                    </div>
                  )}
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

  // Email doğrulama ekranı
  if (showEmailVerification) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              ✉️
            </div>
            <h2 style={{ 
              margin: '0 0 10px 0', 
              color: '#333', 
              fontSize: '28px',
              fontWeight: 'bold'
            }}>E-posta Doğrulama</h2>
            <p style={{ 
              color: '#666', 
              margin: '0',
              fontSize: '16px'
            }}>
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
                style={{ 
                  width: '100%', 
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #e1e5e9',
                  fontSize: '16px',
                  marginBottom: '20px',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#FF6B6B'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
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
                style={{ 
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                  marginBottom: '16px'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
                📧 Doğrulama Kodu Gönder
              </button>
            </form>
          ) : (
            <>
              <div style={{ 
                background: 'rgba(255, 107, 107, 0.1)', 
                padding: '16px', 
                borderRadius: '12px', 
                marginBottom: '20px',
                border: '1px solid rgba(255, 107, 107, 0.3)'
              }}>
                <p style={{ 
                  margin: '0', 
                  color: '#FF6B6B', 
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
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
                  style={{ 
                    width: '100%', 
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px solid #e1e5e9',
                    fontSize: '16px',
                    marginBottom: '20px',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FF6B6B'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
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
                  style={{ 
                    width: '100%',
                    padding: '16px',
                    background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                    marginBottom: '16px'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
                  ✅ Doğrula
                </button>
              </form>
              
              <button onClick={resendVerificationCode} style={{ 
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#FF6B6B',
                border: '2px solid #FF6B6B',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '16px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#FF6B6B';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#FF6B6B';
              }}>
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
          }} style={{ 
            width: '100%',
            padding: '12px',
            background: 'transparent',
            color: '#666',
            border: '2px solid #ccc',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#666';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = '#666';
          }}>
            ← Geri Dön
          </button>

          <div style={{ 
            marginTop: '20px', 
            color: message.includes('başarılı') || message.includes('gönderildi') ? 'green' : message ? 'red' : 'transparent',
            textAlign: 'center',
            fontWeight: '500',
            padding: '12px',
            borderRadius: '8px',
            background: message.includes('başarılı') || message.includes('gönderildi') ? 'rgba(0, 255, 0, 0.1)' : message ? 'rgba(255, 0, 0, 0.1)' : 'transparent'
          }}>
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
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #a259e6, #764ba2)',
            borderRadius: '50%',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {mode === 'login' ? '🔐' : '📝'}
          </div>
          <h2 style={{ 
            margin: '0 0 10px 0', 
            color: '#333', 
            fontSize: '28px',
            fontWeight: 'bold'
          }}>
            {mode === 'login' ? 'Hoş Geldiniz' : 'Hesap Oluştur'}
          </h2>
          <p style={{ 
            color: '#666', 
            margin: '0',
            fontSize: '16px'
          }}>
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
            style={{ 
              width: '100%', 
              padding: '16px',
              borderRadius: '12px',
              border: '2px solid #e1e5e9',
              fontSize: '16px',
              marginBottom: '16px',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#a259e6'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
            style={{ 
              width: '100%', 
              padding: '16px',
              borderRadius: '12px',
              border: '2px solid #e1e5e9',
              fontSize: '16px',
              marginBottom: '16px',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#a259e6'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
        />
        {mode === 'register' && (
          <>
            <input
              type="text"
              placeholder="Görünen Ad"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
                style={{ 
                  width: '100%', 
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #e1e5e9',
                  fontSize: '16px',
                  marginBottom: '16px',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#a259e6'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
                style={{ 
                  width: '100%', 
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #e1e5e9',
                  fontSize: '16px',
                  marginBottom: '16px',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#a259e6'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </>
        )}
          <button type="submit" style={{ 
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #a259e6, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(162, 89, 230, 0.3)',
            marginBottom: '16px'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
          {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>
      </form>

      {mode === 'login' && (
        <button onClick={() => setShowQRLogin(true)} style={{ 
          width: '100%', 
            padding: '16px',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
            marginBottom: '16px'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
            📱 QR Kod ile Giriş
          </button>
        )}

        {mode === 'login' && (
          <button onClick={() => {
            setShowEmailVerification(true);
            setVerificationEmail('');
            setVerificationCode('');
            setMessage('');
          }} style={{ 
            width: '100%', 
            padding: '16px',
            background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            color: 'white', 
          border: 'none', 
            borderRadius: '12px', 
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
            marginBottom: '16px'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
            ✉️ Email Doğrula
          </button>
        )}

        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ 
          width: '100%',
          padding: '12px',
          background: 'transparent',
          color: '#a259e6',
          border: '2px solid #a259e6',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 'bold', 
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '16px'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#a259e6';
          e.target.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'transparent';
          e.target.style.color = '#a259e6';
        }}>
          {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </button>

        {message && (
          <div style={{ 
            marginTop: '16px', 
            color: message.includes('başarılı') ? 'green' : 'red',
            textAlign: 'center',
            fontWeight: '500',
            padding: '12px',
            borderRadius: '8px',
            background: message.includes('başarılı') ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
