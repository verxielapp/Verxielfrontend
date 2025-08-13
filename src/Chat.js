import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = 'https://verxiel.onrender.com';

export default function Chat({ token, user, contact, addContact }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef();
  const scrollRef = useRef();
  const fileInputRef = useRef();

  // WebRTC arama state'leri - şimdilik kullanılmıyor
  // const [callType, setCallType] = useState(null); // 'audio' | 'video' | null
  // const [callModal, setCallModal] = useState(false); // gelen arama modalı
  // const [callIncoming, setCallIncoming] = useState(null); // { from, type }
  // const [inCall, setInCall] = useState(false);
  // const [remoteStream, setRemoteStream] = useState(null);
  // const [localStream, setLocalStream] = useState(null);
  // const pcRef = useRef();
  // const localVideoRef = useRef();
  // const remoteVideoRef = useRef();

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
        // Bildirim: Sadece karşıdan gelen mesajlar için
        if (fromId === contactId && fromId !== myId) {
          // Bildirim izni yoksa iste
          if (window.Notification && Notification.permission !== 'granted') {
            Notification.requestPermission();
          }
          // Bildirim göster
          if (window.Notification && Notification.permission === 'granted') {
            new Notification(msg.from?.displayName || 'Yeni Mesaj', {
              body: msg.content || 'Resim gönderildi',
              icon: contact.avatarUrl || '/logo192.png'
            });
          }
        }
      }
    });
    // WebRTC sinyalleşme - şimdilik devre dışı
    // socketRef.current.on('call-offer', async ({ from, offer, type }) => {
    //   setCallIncoming({ from, type, offer });
    //   setCallModal(true);
    // });
    // WebRTC socket eventleri - şimdilik devre dışı
    // socketRef.current.on('call-answer', async ({ answer }) => {
    //   await pcRef.current.setRemoteDescription(answer);
    // });
    // socketRef.current.on('call-ice', async ({ candidate }) => {
    //   if (candidate && pcRef.current) {
    //     try { await pcRef.current.addIceCandidate(candidate); } catch {}
    //   }
    // });
    // socketRef.current.on('call-end', () => {
    //   endCall();
    // });
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || !isConnected) return;
    
    setIsLoading(true);
    
    try {
      const myId = (user.id || user._id)?.toString?.() || (user.id || user._id);
      const contactId = (contact.id || contact._id)?.toString?.() || (contact.id || contact._id);
      
      console.log('Sending message:', {
        from: myId,
        to: contactId,
        content: input,
        hasImage: !!selectedImage
      });
      
      // Socket ile mesaj gönder
      if (socketRef.current && isConnected) {
        socketRef.current.emit('message', { 
          content: input.trim() || null, 
          to: contactId,
          from: myId,
          image: selectedImage,
          type: selectedImage ? 'image' : 'text'
        });
        
        // Mesajı local olarak ekle (socket'ten gelene kadar)
        const tempMessage = {
          id: Date.now(),
          content: input.trim() || null,
          image: selectedImage,
          fromId: myId,
          toId: contactId,
          from: { id: myId, displayName: 'Sen' },
          timestamp: new Date().toISOString(),
          type: selectedImage ? 'image' : 'text'
        };
        
        setMessages(prev => [...prev, tempMessage]);
      }
      
      setInput('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // Dosya boyutu kontrolü (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Resim dosyası 5MB\'dan küçük olmalıdır!');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setSelectedImage(e.target.result); // Base64 string olarak sakla
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert('Lütfen geçerli bir resim dosyası seçin!');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Arama başlat - şimdilik devre dışı
  // const startCall = async (type) => {
  //   setCallType(type);
  //   setInCall(true);
  //   // PeerConnection oluştur
  //   const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  //   pcRef.current = pc;
  //   // Kamera/mikrofon al
  //   const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
  //   setLocalStream(stream);
  //   stream.getTracks().forEach(track => pc.addTrack(track, stream));
  //   pc.ontrack = (e) => {
  //     setRemoteStream(e.streams[0]);
  //   };
  //   pc.onicecandidate = (e) => {
  //     if (e.candidate) {
  //       socketRef.current.emit('call-ice', { to: contact._id, candidate: e.candidate });
  //     }
  //   };
  //   // Offer oluştur ve gönder
  //   const offer = await pc.createOffer();
  //   await pc.setLocalDescription(offer);
  //   socketRef.current.emit('call-offer', { to: contact.id || contact._id, offer, type });
  // };

  // Gelen aramayı kabul et - şimdilik kullanılmıyor
  // const acceptCall = async () => {
  //   setCallType(callIncoming.type);
  //   setInCall(true);
  //   setCallModal(false);
  //   // PeerConnection oluştur
  //   const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  //   pcRef.current = pc;
  //   // Kamera/mikrofon al
  //   const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callIncoming.type === 'video' });
  //   setLocalStream(stream);
  //   stream.getTracks().forEach(track => pc.addTrack(track, stream));
  //   pc.ontrack = (e) => {
  //     setRemoteStream(e.streams[0]);
  //     setRemoteStream(e.streams[0]);
  //   };
  //   pc.onicecandidate = (e) => {
  //     if (e.candidate) {
  //       socketRef.current.emit('call-ice', { to: callIncoming.from._id, candidate: e.candidate });
  //     }
  //   };
  //   await pc.setRemoteDescription(callIncoming.offer);
  //   const answer = await pc.createAnswer();
  //   await pc.setLocalDescription(answer);
  //   socketRef.current.emit('call-answer', { to: callIncoming.from._id, answer });
  // };

  // Aramayı bitir - şimdilik devre dışı
  // const endCall = useCallback(() => {
  //   setInCall(false);
  //   setCallType(null);
  //   setCallModal(false);
  //   setCallIncoming(null);
  //   setRemoteStream(null);
  //   setLocalStream(null);
  //   if (pcRef.current) {
  //     pcRef.current.close();
  //     pcRef.current = null;
  //   }
  //   socketRef.current.emit('call-end', { to: contact.id || contact._id });
  // }, [contact.id, contact._id]);

  // Video elementlerini güncelle - şimdilik devre dışı
  // useEffect(() => {
  //   if (localVideoRef.current && localStream) {
  //     localVideoRef.current.srcObject = localStream;
  //   }
  // }, [localStream]);
  // useEffect(() => {
  //   if (remoteVideoRef.current && remoteStream) {
  //     remoteVideoRef.current.srcObject = remoteStream;
  //   }
  // }, [remoteStream]);

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
          <button 
            style={{
              background: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '8px'
            }}
            title="Sesli arama (yakında)"
          >
            📞
          </button>
          <button 
            style={{
              background: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            title="Görüntülü arama (yakında)"
          >
            📹
          </button>
        </div>
      </div>
      
      <div ref={scrollRef} className="chat-scroll" style={{ 
        flex: 1, 
        minHeight: 0, 
        maxHeight: '100%', 
        overflowY: 'auto', 
        padding: 0, 
        margin: 0, 
        background: '#f9f9f9', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
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
          
          console.log(`Message ${i}:`, { fromId, myId, isMe, name, content: msg.content, image: msg.image });
          
          return (
            <div key={msg.id || i} className={`message-bubble ${isMe ? 'me' : 'other'}`} style={{ 
              textAlign: isMe ? 'right' : 'left', 
              margin: '8px 12px',
              maxWidth: '70%',
              alignSelf: isMe ? 'flex-end' : 'flex-start'
            }}>
              <div className="message-bubble-content" style={{
                background: isMe ? '#a259e6' : '#fff',
                color: isMe ? '#fff' : '#333',
                padding: '10px 16px',
                borderRadius: '18px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: isMe ? 'none' : '1px solid #e0e0e0',
                wordWrap: 'break-word',
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  opacity: 0.8, 
                  marginBottom: '4px',
                  fontWeight: 'bold'
                }}>
                  {name}
                </div>
                {msg.image && (
                  <div style={{ marginBottom: '8px' }}>
                    <img 
                      src={msg.image} 
                      alt="Gönderilen resim" 
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        // Resmi büyük göster
                        const newWindow = window.open();
                        newWindow.document.write(`
                          <html>
                            <head>
                              <title>Resim Görüntüle</title>
                              <style>
                                body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                              </style>
                            </head>
                            <body>
                              <img src="${msg.image}" alt="Resim" />
                            </body>
                          </html>
                        `);
                      }}
                    />
                  </div>
                )}
                {msg.content && (
                  <div>{msg.content}</div>
                )}
                {!msg.content && !msg.image && (
                  <div style={{ fontStyle: 'italic', opacity: 0.7 }}>
                    {msg.type === 'image' ? 'Resim gönderildi' : 'Mesaj gönderildi'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Resim Önizleme */}
      {imagePreview && (
        <div className="image-preview-container" style={{ 
          padding: '8px 12px', 
          background: '#f0f0f0', 
          borderTop: '1px solid #ddd',
          position: 'relative'
        }}>
          <div className="image-preview-content" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: '#fff',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}>
            <img 
              src={imagePreview} 
              alt="Önizleme" 
              style={{
                width: '40px',
                height: '40px',
                objectFit: 'cover',
                borderRadius: '4px'
              }}
            />
            <span style={{ fontSize: '12px', color: '#666' }}>
              Resim seçildi
            </span>
            <button 
              onClick={removeImage}
              className="image-preview-remove"
              style={{
                background: '#ff4444',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '12px',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={sendMessage} className="chat-input-container" style={{ 
        display: 'flex', 
        gap: 8, 
        padding: '12px', 
        borderTop: '1px solid #eee', 
        background: '#fafafa', 
        margin: 0, 
        boxSizing: 'border-box',
        alignItems: 'center'
      }}>
        {/* Resim Seçme Butonu */}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            background: '#fff', 
            border: '1px solid #ddd', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            minWidth: '40px',
            minHeight: '40px'
          }}
          title="Resim ekle"
        >
          📷
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="chat-input"
          style={{ 
            flex: 1, 
            borderRadius: 20, 
            border: '1px solid #ccc', 
            padding: '12px 16px', 
            margin: 0,
            fontSize: '14px',
            minHeight: '40px'
          }}
          placeholder="Mesaj yaz veya resim ekle..."
        />
        
        <button 
          type="submit" 
          className="chat-send-btn"
          disabled={isLoading}
          style={{ 
            borderRadius: 20, 
            padding: '12px 24px', 
            background: isLoading ? '#ccc' : '#a259e6', 
            color: '#fff', 
            border: 'none', 
            margin: 0,
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            minWidth: '40px',
            minHeight: '40px'
          }}
        >
          {isLoading ? '⏳' : 'Gönder'}
        </button>
      </form>
    </div>
  );
} 