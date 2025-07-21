import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = 'https://verxiel.onrender.com';

export default function Chat({ token, user, contact, addContact }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef();
  const scrollRef = useRef();

  // WebRTC arama state'leri
  const [callType, setCallType] = useState(null); // 'audio' | 'video' | null
  const [callModal, setCallModal] = useState(false); // gelen arama modalı
  const [callIncoming, setCallIncoming] = useState(null); // { from, type }
  const [inCall, setInCall] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const pcRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  // Kişi ekleme modalı için state
  const [showAddContact, setShowAddContact] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addContactMsg, setAddContactMsg] = useState('');

  useEffect(() => {
    if (!token || !user || !contact) return;
    axios.get('https://verxiel.onrender.com/api/messages', {
      params: { userId: user.id, to: contact._id },
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setMessages(res.data);
    });
    socketRef.current = io(SOCKET_URL, {
      auth: { token }
    });
    socketRef.current.on('message', msg => {
      const myId = user.id?.toString?.() || user.id;
      const contactId = contact._id?.toString?.() || contact._id;
      const fromId = msg.from?._id?.toString?.() || msg.from;
      const toId = msg.to?._id?.toString?.() || msg.to;
      if ((fromId === myId && toId === contactId) || (fromId === contactId && toId === myId)) {
        setMessages(prev => [...prev, msg]);
      }
    });
    // WebRTC sinyalleşme
    socketRef.current.on('call-offer', async ({ from, offer, type }) => {
      setCallIncoming({ from, type, offer });
      setCallModal(true);
    });
    socketRef.current.on('call-answer', async ({ answer }) => {
      await pcRef.current.setRemoteDescription(answer);
    });
    socketRef.current.on('call-ice', async ({ candidate }) => {
      if (candidate && pcRef.current) {
        try { await pcRef.current.addIceCandidate(candidate); } catch {}
      }
    });
    socketRef.current.on('call-end', () => {
      endCall();
    });
    return () => {
      socketRef.current.disconnect();
    };
  }, [token, user, contact]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = e => {
    e.preventDefault();
    if (!input.trim()) return;
    const myId = user.id?.toString?.() || user.id;
    const contactId = contact._id?.toString?.() || contact._id;
    // Mesajı local olarak ekle
    setMessages(prev => [...prev, {
      from: { _id: myId, displayName: user.displayName },
      to: { _id: contactId, displayName: contact.displayName },
      content: input
    }]);
    socketRef.current.emit('message', { content: input, to: contact._id });
    setInput('');
  };

  // Arama başlat
  const startCall = async (type) => {
    setCallType(type);
    setInCall(true);
    // PeerConnection oluştur
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    // Kamera/mikrofon al
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    setLocalStream(stream);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('call-ice', { to: contact._id, candidate: e.candidate });
      }
    };
    // Offer oluştur ve gönder
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit('call-offer', { to: contact._id, offer, type });
  };

  // Gelen aramayı kabul et
  const acceptCall = async () => {
    setCallType(callIncoming.type);
    setInCall(true);
    setCallModal(false);
    // PeerConnection oluştur
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    // Kamera/mikrofon al
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callIncoming.type === 'video' });
    setLocalStream(stream);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('call-ice', { to: callIncoming.from._id, candidate: e.candidate });
      }
    };
    await pc.setRemoteDescription(callIncoming.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.emit('call-answer', { to: callIncoming.from._id, answer });
  };

  // Aramayı bitir
  const endCall = () => {
    setInCall(false);
    setCallType(null);
    setCallModal(false);
    setCallIncoming(null);
    setRemoteStream(null);
    setLocalStream(null);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    socketRef.current.emit('call-end', { to: contact._id });
  };

  // Video elementlerini güncelle
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Kişi ekle fonksiyonu
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

  // Sesli ve görüntülü arama fonksiyonları (şimdilik alert)
  const handleVoiceCall = () => alert('Sesli arama yakında!');
  const handleVideoCall = () => alert('Görüntülü arama yakında!');

  return (
    <div style={{ maxWidth: 600, height: '100%', minHeight: 0, margin: 'auto', marginTop: 10, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', display: 'flex', flexDirection: 'column', padding: 0 }}>
      {/* Arama ekranı */}
      {inCall && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000a', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ background: '#222', color: '#fff', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div>{callType === 'video' ? 'Görüntülü Arama' : 'Sesli Arama'}</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {callType === 'video' && <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 240, height: 180, background: '#111', borderRadius: 8 }} />}
              <audio ref={remoteVideoRef} autoPlay hidden={callType === 'video'} />
              {callType === 'video' && <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 120, height: 90, background: '#222', borderRadius: 8, position: 'absolute', right: 32, bottom: 32, border: '2px solid #a259e6' }} />}
              <audio ref={localVideoRef} autoPlay muted hidden={callType === 'video'} />
            </div>
            <button onClick={endCall} style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 'bold', fontSize: 18, marginTop: 16 }}>Kapat</button>
          </div>
        </div>
      )}
      {/* Gelen arama modalı */}
      {callModal && callIncoming && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, minWidth: 320, boxShadow: '0 2px 16px #0003', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div><b>{callIncoming.from.displayName || callIncoming.from.username || callIncoming.from.email}</b> sizi arıyor ({callIncoming.type === 'video' ? 'Görüntülü' : 'Sesli'})</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={acceptCall} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 'bold', fontSize: 18 }}>Kabul Et</button>
              <button onClick={endCall} style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 'bold', fontSize: 18 }}>Reddet</button>
            </div>
          </div>
        </div>
      )}
      {/* Başlık ve arama başlatma butonları */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', padding: '8px 12px', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {contact?.avatarUrl ? (
            <img src={contact.avatarUrl} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20 }}>
              {(contact?.displayName?.[0]?.toUpperCase()) || '?'}
            </div>
          )}
          <span style={{ fontWeight: 'bold', fontSize: 18 }}>{contact?.displayName || 'Bilinmiyor'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => startCall('audio')} style={{ background: 'none', border: 'none', color: '#a259e6', fontSize: 22, cursor: 'pointer' }} title="Sesli Arama">🔊</button>
          <button onClick={() => startCall('video')} style={{ background: 'none', border: 'none', color: '#a259e6', fontSize: 22, cursor: 'pointer' }} title="Görüntülü Arama">📹</button>
        </div>
      </div>
      <div ref={scrollRef} className="chat-scroll" style={{ flex: 1, minHeight: 0, maxHeight: '100%', overflowY: 'auto', padding: 0, margin: 0, background: '#f9f9f9', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg, i) => {
          const myId = user.id?.toString?.() || user.id;
          const fromId = msg.from?._id?.toString?.() || msg.from;
          const isMe = fromId === myId;
          const name = isMe ? 'Sen' : (msg.from?.displayName || msg.from?.username || msg.from?.email || 'Bilinmiyor');
          return (
            <div key={i} className={`message-bubble ${isMe ? 'me' : 'other'}`} style={{ textAlign: isMe ? 'right' : 'left', margin: '2px 0' }}>
              <b>{name}</b>: {msg.content}
            </div>
          );
        })}
      </div>
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, padding: 8, borderTop: '1px solid #eee', background: '#fafafa', margin: 0, boxSizing: 'border-box' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, borderRadius: 20, border: '1px solid #ccc', padding: '8px 16px', margin: 0 }}
          placeholder="Mesaj yaz..."
        />
        <button type="submit" style={{ borderRadius: 20, padding: '8px 20px', background: '#a259e6', color: '#fff', border: 'none', margin: 0 }}>Gönder</button>
      </form>
    </div>
  );
} 