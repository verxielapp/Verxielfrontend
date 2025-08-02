import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Profile({ token, onContactsChange, addContact, deleteContact }) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [contacts, setContacts] = useState([]);
  const [addEmail, setAddEmail] = useState('');
  const [addUsername, setAddUsername] = useState('');

  useEffect(() => {
    axios.get('https://verxiel.onrender.com/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setProfile(res.data);
      setDisplayName(res.data.displayName);
      setAvatarUrl(res.data.avatarUrl || '');
    }).catch(err => {
      console.error('Profile fetch error:', err);
    });
    // Kişi listesini çek
    axios.get('https://verxiel.onrender.com/api/auth/contacts', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const contactsData = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.contacts) ? res.data.contacts : []);
      setContacts(contactsData);
      if (onContactsChange) onContactsChange(contactsData);
    }).catch(err => {
      console.error('Contacts fetch error:', err);
      setContacts([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const update = async e => {
    e.preventDefault();
    try {
      const res = await axios.put('https://verxiel.onrender.com/api/auth/me', { displayName, avatarUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setMsg('Profil güncellendi!');
    } catch (err) {
      console.error('Profile update error:', err);
      setMsg('Hata!');
    }
  };

  const handleAddContact = async e => {
    e.preventDefault();
    await addContact({ email: addEmail, username: addUsername });
    setAddEmail('');
    setAddUsername('');
  };

  if (!profile) return <div className="loading-spinner">Yükleniyor...</div>;

  return (
    <div className="profile-sidebar">
      <h3>Profil</h3>
      <form onSubmit={update} className="auth-form">
        <input 
          value={displayName} 
          onChange={e => setDisplayName(e.target.value)} 
          placeholder="Görünen Ad" 
          className="auth-input"
        />
        <input 
          value={avatarUrl} 
          onChange={e => setAvatarUrl(e.target.value)} 
          placeholder="Avatar URL" 
          className="auth-input"
        />
        <button type="submit" className="auth-button">Güncelle</button>
      </form>
      {msg && <div className={`auth-message ${msg.includes('güncellendi') ? 'success' : 'error'}`}>{msg}</div>}
      
      <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)' }} />
      
      <h4>Kişi Ekle</h4>
      <form onSubmit={handleAddContact} className="auth-form">
        <input 
          value={addEmail} 
          onChange={e => setAddEmail(e.target.value)} 
          placeholder="E-posta ile kişi ekle" 
          className="auth-input"
        />
        <input 
          value={addUsername} 
          onChange={e => setAddUsername(e.target.value)} 
          placeholder="Kullanıcı adı ile kişi ekle" 
          className="auth-input"
        />
        <button type="submit" className="auth-button">Ekle</button>
      </form>
      
      <h4>Kişiler</h4>
      <ul className="contact-list">
        {(Array.isArray(contacts) ? contacts : []).map(c => (
          <li key={c?.id || c?._id} className="contact-item">
            {c?.avatarUrl ? (
              <img src={c.avatarUrl} alt="avatar" className="contact-avatar" />
            ) : (
              <div className="contact-avatar-placeholder">
                {(c?.displayName?.[0]?.toUpperCase()) || '?'}
              </div>
            )}
            <span className="contact-name">{c?.displayName || 'Bilinmiyor'} ({c?.email || 'Bilinmiyor'})</span>
            <button onClick={() => deleteContact(c?.id || c?._id)} className="auth-button secondary" style={{ marginLeft: 8, padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Sil</button>
          </li>
        ))}
      </ul>
    </div>
  );
} 