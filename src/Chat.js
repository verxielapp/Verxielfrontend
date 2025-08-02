import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = window.location.origin;

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

  // Kişi ekleme modalı için state (şimdilik kullanılmıyor)
  // const [showAddContact, setShowAddContact] = useState(false);
  // const [addEmail, setAddEmail] = useState('');
  // const [addUsername, setAddUsername] = useState('');
  // const [addContactMsg, setAddContactMsg] = useState('');

  useEffect(() => {
    if (!token || !user || !contact) return;
    axios.get('https://verxiel.onrender.com/api/messages', {
      params: { userId: user.id, to: contact._id },
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const messagesData = Array.isArray(res.data) ? res.data : [];
      setMessages(messagesData);
    }).catch(err => {
      console.error('Messages fetch error:', err);
    });
    socketRef.current = io(SOCKET_URL, {
      auth: { token }
    });
    socketRef.current.on('message', msg => {
          const myId = (user.id || user._id)?.toString?.() || (user.id || user._id);
    const contactId = (contact.id || contact._id)?.toString?.() || (contact.id || contact._id);
    const fromId = (msg.from?.id || msg.from?._id)?.toString?.() || msg.from;
    const toId = (msg.to?.id || msg.to?._id)?.toString?.() || msg.to;
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
    if (!input.trim()) return;
    const myId = (user.id || user._id)?.toString?.() || (user.id || user._id);
    const contactId = (contact.id || contact._id)?.toString?.() || (contact.id || contact._id);
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
    <div className="chat-area">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-contact-info">
          {contact?.avatarUrl ? (
            <img src={contact.avatarUrl} alt="avatar" className="contact-avatar" />
          ) : (
            <div className="contact-avatar-placeholder">
              {(contact?.displayName?.[0]?.toUpperCase()) || '?'}
            </div>
          )}
          <span className="chat-contact-name">{contact?.displayName || 'Bilinmiyor'}</span>
        </div>
        <div className="chat-actions">
          <button onClick={() => startCall('Sesli Arama')} className="chat-action-btn" title="Sesli Arama">📞</button>
          <button onClick={() => startCall('Görüntülü Arama')} className="chat-action-btn" title="Görüntülü Arama">📹</button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container" ref={scrollRef}>
        {(Array.isArray(messages) ? messages : []).map((msg, i) => {
          const myId = (user.id || user._id)?.toString?.() || (user.id || user._id);
          const fromId = (msg.from?.id || msg.from?._id)?.toString?.() || msg.from;
          const isMe = fromId === myId;
          
          return (
            <div key={i} className={`message ${isMe ? 'own' : 'other'}`}>
              <div className="message-content">
                {msg.content}
                <div className="message-time">
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <form onSubmit={sendMessage} className="message-input-form">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className="message-input"
          />
          <button type="submit" disabled={!input.trim()} className="send-button">
            ➤
          </button>
        </form>
      </div>

      {/* Call Modal */}
      {callModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Gelen Arama</h3>
            <p>{callIncoming?.from?.displayName || 'Bilinmiyor'} sizi {callIncoming?.type === 'video' ? 'görüntülü' : 'sesli'} arama yapıyor</p>
            <div className="modal-actions">
              <button onClick={acceptCall} className="modal-button primary">Kabul Et</button>
              <button onClick={() => setCallModal(false)} className="modal-button secondary">Reddet</button>
            </div>
          </div>
        </div>
      )}

      {/* Call Interface */}
      {inCall && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3 className="modal-title">{callType} - Devam Ediyor</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <video ref={localVideoRef} autoPlay muted style={{ width: '200px', height: '150px', background: '#000' }} />
              {remoteStream && (
                <video ref={remoteVideoRef} autoPlay style={{ width: '200px', height: '150px', background: '#000' }} />
              )}
            </div>
            <div className="modal-actions">
              <button onClick={endCall} className="modal-button secondary">Aramayı Sonlandır</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 