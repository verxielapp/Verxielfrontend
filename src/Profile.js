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
    });
    // Kişi listesini çek
    axios.get('https://verxiel.onrender.com/api/auth/contacts', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setContacts(res.data);
      if (onContactsChange) onContactsChange(res.data);
    });
  }, [token]);

  const update = async e => {
    e.preventDefault();
    try {
      const res = await axios.put('https://verxiel.onrender.com/api/auth/me', { displayName, avatarUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setMsg('Profil güncellendi!');
    } catch {
      setMsg('Hata!');
    }
  };

  const handleAddContact = async e => {
    e.preventDefault();
    await addContact({ email: addEmail, username: addUsername });
    setAddEmail('');
    setAddUsername('');
  };

  if (!profile) return <div>Yükleniyor...</div>;

  return (
    <div style={{ maxWidth: 400, margin: 'auto', marginTop: 40 }}>
      <h3>Profil</h3>
      <form onSubmit={update}>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Görünen Ad" style={{ width: '100%', marginBottom: 8 }} />
        <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="Avatar URL" style={{ width: '100%', marginBottom: 8 }} />
        <button type="submit" style={{ width: '100%' }}>Güncelle</button>
      </form>
      <div style={{ marginTop: 8 }}>{msg}</div>
      <hr />
      <h4>Kişi Ekle</h4>
      <form onSubmit={handleAddContact} style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
        <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="E-posta ile kişi ekle" style={{ width: '100%' }} />
        <input value={addUsername} onChange={e => setAddUsername(e.target.value)} placeholder="Kullanıcı adı ile kişi ekle" style={{ width: '100%' }} />
        <button type="submit">Ekle</button>
      </form>
      <h4>Kişiler</h4>
      <ul>
        {contacts.map(c => (
          <li key={c?._id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {c?.avatarUrl ? (
              <img src={c.avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16 }}>
                {(c?.displayName?.[0]?.toUpperCase()) || '?'}
              </div>
            )}
            <span>{c?.displayName || 'Bilinmiyor'} ({c?.email || 'Bilinmiyor'})</span>
            <button onClick={() => deleteContact(c?._id)} style={{ marginLeft: 8, color: 'red' }}>Sil</button>
          </li>
        ))}
      </ul>
    </div>
  );
} 