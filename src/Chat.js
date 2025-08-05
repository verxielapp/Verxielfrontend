import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = 'https://verxiel.onrender.com';

export default function Chat({ token, user, contact, addContact }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
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

  // Kişi ekleme modalı için state (şimdilik kullanılmıyor)
  // const [showAddContact, setShowAddContact] = useState(false);
  // const [addEmail, setAddEmail] = useState('');
  // const [addUsername, setAddUsername] = useState('');
  // const [addContactMsg, setAddContactMsg] = useState('');

  useEffect(() => {
    if (!token || !user || !contact) return;
    
    console.log('Chat: Loading messages for contact:', contact);
    
    // Mesajları yükle
    axios.get('https://verxiel.onrender.com/api/messages', {
      params: { userId: user.id, to: contact._id },
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const messagesData = Array.isArray(res.data) ? res.data : [];
      console.log('Messages loaded:', messagesData);
      console.log('User ID:', user.id);
      console.log('Contact ID:', contact._id);
      console.log('Messages count:', messagesData.length);
      
      // Mesaj formatını kontrol et
      if (messagesData.length > 0) {
        console.log('First message format:', messagesData[0]);
      }
      
      setMessages(messagesData);
    }).catch(err => {
      console.error('Messages fetch error:', err);
      console.error('Error response:', err.response?.data);
    });
    
    // Socket bağlantısı
    console.log('Connecting to socket:', SOCKET_URL);
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected!');
      setIsConnected(true);
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected!');
      setIsConnected(false);
    });
    
    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });
    
    socketRef.current.on('message', msg => {
      console.log('Received message:', msg);
      const myId = (user.id || user._id)?.toString?.() || (user.id || user._id);
      const contactId = (contact.id || contact._id)?.toString?.() || (contact.id || contact._id);
      const fromId = (msg.fromId || msg.from?.id || msg.from?._id)?.toString?.() || msg.from;
      const toId = (msg.toId || msg.to?.id || msg.to?._id)?.toString?.() || msg.to;
      
      console.log('Message routing check:', { myId, contactId, fromId, toId });
      
      if ((fromId === myId && toId === contactId) || (fromId === contactId && toId === myId)) {
        console.log('Adding message to chat:', msg);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!input.trim() || !isConnected) return;
    
    const myId = (user.id || user._id)?.toString?.() || (user.id || user._id);
    const contactId = (contact.id || contact._id)?.toString?.() || (contact.id || contact._id);
    
    console.log('Sending message:', {
      from: myId,
      to: contactId,
      content: input
    });
    
    // Mesajı local olarak ekle
    const newMessage = {
      fromId: myId,
      toId: contactId,
      from: { id: myId, displayName: user.displayName },
      to: { id: contactId, displayName: contact.displayName },
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Socket ile mesaj gönder
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message', { 
        content: input, 
        to: contactId,
        from: myId
      });
    }
    
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
    socketRef.current.emit('call-offer', { to: contact.id || contact._id, offer, type });
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
  const endCall = useCallback(() => {
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
    socketRef.current.emit('call-end', { to: contact.id || contact._id });
  }, [contact.id, contact._id]);

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

  // Kişi ekle fonksiyonu (şimdilik kullanılmıyor)
  // const handleAddContact = async (e) => {
  //   e.preventDefault();
  //   setAddContactMsg('');
  //   try {
  //     await addContact({ email: addEmail, username: addUsername });
  //     setAddEmail('');
  //     setAddUsername('');
  //     setAddContactMsg('Kişi eklendi!');
  //     setTimeout(() => setShowAddContact(false), 800);
  //   } catch {
  //     setAddContactMsg('Kişi eklenemedi!');
  //   }
  // };

  // Sesli ve görüntülü arama fonksiyonları (şimdilik kullanılmıyor)
  // const handleVoiceCall = () => alert('Sesli arama yakında!');
  // const handleVideoCall = () => alert('Görüntülü arama yakında!');

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-contact-info">
          {contact?.avatarUrl ? (
            <img src={contact.avatarUrl} alt="avatar" className="chat-contact-avatar" />
          ) : (
            <div className="chat-contact-avatar-placeholder">
              {(contact?.displayName?.[0]?.toUpperCase()) || '?'}
            </div>
          )}
          <div className="chat-contact-details">
            <span className="chat-contact-name">{contact?.displayName || 'Bilinmiyor'}</span>
            <span className="chat-contact-status">
              {isConnected ? '🟢 Çevrimiçi' : '🔴 Bağlantı yok'}
            </span>
          </div>
        </div>
        <div className="chat-actions">
          <button onClick={() => startCall('audio')} className="chat-call-btn">📞</button>
          <button onClick={() => startCall('video')} className="chat-call-btn">📹</button>
        </div>
      </div>
      <div ref={scrollRef} className="chat-scroll" style={{ flex: 1, minHeight: 0, maxHeight: '100%', overflowY: 'auto', padding: 0, margin: 0, background: '#f9f9f9', display: 'flex', flexDirection: 'column' }}>
        {(Array.isArray(messages) ? messages : []).map((msg, i) => {
          const myId = (user.id || user._id)?.toString?.() || (user.id || user._id);
          const fromId = (msg.fromId || msg.from?.id || msg.from?._id)?.toString?.() || msg.from;
          const isMe = fromId === myId;
          
          // Kişi listesinde yoksa 'Bilinmeyen Kişi'
          let name = 'Bilinmeyen Kişi';
          if (isMe) {
            name = 'Sen';
          } else if (contact && (fromId === (contact.id || contact._id))) {
            name = contact.displayName || contact.username || contact.email || 'Bilinmeyen Kişi';
          } else if (msg.from?.displayName || msg.from?.username || msg.from?.email) {
            name = msg.from.displayName || msg.from.username || msg.from.email;
          }
          
          console.log(`Message ${i}:`, { fromId, myId, isMe, name, content: msg.content });
          
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