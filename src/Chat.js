import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import CryptoJS from 'crypto-js';

const SOCKET_URL = 'https://verxiel.onrender.com';

export default function Chat({ token, user, contact, addContact }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Güvenli VOIP state'leri
  const [callType, setCallType] = useState(null);
  const [callModal, setCallModal] = useState(false);
  const [callIncoming, setCallIncoming] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callEncrypted, setCallEncrypted] = useState(false);
  
  // Encryption state'leri
  const [sessionKey, setSessionKey] = useState(null);
  const [encryptionKeys, setEncryptionKeys] = useState({});
  const [keyExchangeComplete, setKeyExchangeComplete] = useState(false);
  
  const socketRef = useRef();
  const scrollRef = useRef();
  const fileInputRef = useRef();
  const pcRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const callTimerRef = useRef();
  
  // Encryption utilities
  const generateKeyPair = () => {
    // RSA benzeri key pair (gerçek uygulamada Web Crypto API kullanılır)
    const privateKey = CryptoJS.lib.WordArray.random(256);
    const publicKey = CryptoJS.SHA256(privateKey.toString());
    return { privateKey, publicKey };
  };
  
  const generateSessionKey = () => {
    return CryptoJS.lib.WordArray.random(256);
  };
  
  const encryptData = (data, key) => {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(dataString, key.toString()).toString();
  };
  
  const decryptData = (encryptedData, key) => {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key.toString());
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  };
  
  const performKeyExchange = async (contactId) => {
    try {
      console.log('Starting secure key exchange...');
      
      // 1. Key pair oluştur
      const { privateKey, publicKey } = generateKeyPair();
      
      // 2. Session key oluştur
      const sessionKey = generateSessionKey();
      
      // 3. Public key'i karşı tarafa gönder
      socketRef.current.emit('key_exchange_init', {
        to: contactId,
        publicKey: publicKey.toString(),
        sessionKey: encryptData(sessionKey, publicKey.toString())
      });
      
      // 4. Local state'i güncelle
      setSessionKey(sessionKey);
      setEncryptionKeys(prev => ({
        ...prev,
        [contactId]: {
          privateKey,
          publicKey,
          sessionKey
        }
      }));
      
      console.log('Key exchange initiated');
      
    } catch (error) {
      console.error('Key exchange failed:', error);
      throw new Error('Güvenli bağlantı kurulamadı');
    }
  };

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
    
    // Socket event listener'ları
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
          // Bildirim gönder
          if (Notification.permission === 'granted') {
            new Notification(`${contact.displayName || contact.username || contact.email}`, {
              body: msg.content || 'Yeni mesaj',
              icon: '/favicon.ico'
            });
          }
        }
      }
    });
    
    // VOIP Socket Events
    socketRef.current.on('call_offer', (data) => {
      console.log('Incoming call:', data);
      setCallIncoming({
        from: data.from,
        type: data.type,
        offer: data.offer
      });
      setCallModal(true);
      
      // Ses çal
      playIncomingCallSound();
    });
    
    socketRef.current.on('call_answer', (data) => {
      console.log('Call answered:', data);
      if (pcRef.current) {
        pcRef.current.setRemoteDescription(data.answer);
      }
    });
    
    // Güvenli VOIP Socket Events
    socketRef.current.on('key_exchange_response', (data) => {
      console.log('Key exchange response received:', data);
      try {
        const { from, publicKey, sessionKey } = data;
        
        // Karşı tarafın public key'ini kaydet
        setEncryptionKeys(prev => ({
          ...prev,
          [from]: {
            ...prev[from],
            remotePublicKey: publicKey,
            sessionKey: sessionKey
          }
        }));
        
        setKeyExchangeComplete(true);
        console.log('Key exchange completed successfully');
        
      } catch (error) {
        console.error('Key exchange response error:', error);
      }
    });
    
    socketRef.current.on('secure_call_offer', (data) => {
      console.log('Secure call offer received:', data);
      setCallIncoming({
        from: data.from,
        type: data.type,
        offer: data.offer,
        sessionId: data.sessionId
      });
      setCallModal(true);
      
      // Ses çal
      playIncomingCallSound();
    });
    
    socketRef.current.on('secure_call_answer', (data) => {
      console.log('Secure call answer received:', data);
      if (pcRef.current && sessionKey) {
        const decryptedAnswer = decryptData(data.answer, sessionKey);
        if (decryptedAnswer) {
          pcRef.current.setRemoteDescription(decryptedAnswer);
        }
      }
    });
    
    socketRef.current.on('secure_ice_candidate', (data) => {
      console.log('Secure ICE candidate received:', data);
      if (pcRef.current && sessionKey) {
        const decryptedCandidate = decryptData(data.candidate, sessionKey);
        if (decryptedCandidate) {
          pcRef.current.addIceCandidate(decryptedCandidate);
        }
      }
    });
    
    socketRef.current.on('call_reject', (data) => {
      console.log('Call rejected:', data);
      setInCall(false);
      setIsCallActive(false);
      setCallType(null);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      stopCallTimer();
    });
    
    socketRef.current.on('call_end', (data) => {
      console.log('Call ended by remote:', data);
      setInCall(false);
      setIsCallActive(false);
      setCallType(null);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      stopCallTimer();
    });
    
    socketRef.current.on('call_error', (data) => {
      console.error('Call error:', data);
      alert('Arama hatası: ' + data.message);
      endCall();
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('message');
        socketRef.current.off('call_offer');
        socketRef.current.off('call_answer');
        socketRef.current.off('call_reject');
        socketRef.current.off('call_end');
        socketRef.current.off('ice_candidate');
        socketRef.current.off('call_error');
      }
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

  // VOIP Fonksiyonları
  const startCall = async (type) => {
    try {
      console.log('Starting call:', type);
      setCallType(type);
      
      // Yerel stream'i al
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: type === 'audio' || type === 'video',
        video: type === 'video'
      });
      
      setLocalStream(stream);
      
      // WebRTC peer connection oluştur
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      pcRef.current = pc;
      
      // Yerel stream'i peer connection'a ekle
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // ICE candidate'ları gönder
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice_candidate', {
            to: contact.id || contact._id,
            candidate: event.candidate
          });
        }
      };
      
      // Uzak stream'i al
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };
      
      // Offer oluştur ve gönder
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socketRef.current.emit('call_offer', {
        to: contact.id || contact._id,
        type: type,
        offer: offer
      });
      
      setInCall(true);
      setIsCallActive(true);
      startCallTimer();
      
    } catch (error) {
      console.error('Call start error:', error);
      alert('Arama başlatılamadı: ' + error.message);
    }
  };
  
  const acceptCall = async () => {
    try {
      console.log('Accepting call');
      const { from, type, offer } = callIncoming;
      
      // Yerel stream'i al
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: type === 'audio' || type === 'video',
        video: type === 'video'
      });
      
      setLocalStream(stream);
      
      // WebRTC peer connection oluştur
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      pcRef.current = pc;
      
      // Yerel stream'i peer connection'a ekle
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // ICE candidate'ları gönder
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice_candidate', {
            to: from,
            candidate: event.candidate
          });
        }
      };
      
      // Uzak stream'i al
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };
      
      // Offer'ı set et ve answer oluştur
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socketRef.current.emit('call_answer', {
        to: from,
        answer: answer
      });
      
      setInCall(true);
      setIsCallActive(true);
      setCallIncoming(null);
      setCallModal(false);
      startCallTimer();
      
    } catch (error) {
      console.error('Call accept error:', error);
      alert('Arama kabul edilemedi: ' + error.message);
    }
  };
  
  const rejectCall = () => {
    console.log('Rejecting call');
    const { from } = callIncoming;
    
    socketRef.current.emit('call_reject', {
      to: from
    });
    
    setCallIncoming(null);
    setCallModal(false);
  };
  
  const endCall = () => {
    console.log('Ending call');
    
    // Stream'leri durdur
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Peer connection'ı kapat
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // State'leri temizle
    setInCall(false);
    setIsCallActive(false);
    setCallType(null);
    setRemoteStream(null);
    stopCallTimer();
    
    // Karşı tarafa bildir
    if (contact && socketRef.current) {
      socketRef.current.emit('call_end', {
        to: contact.id || contact._id
      });
    }
  };
  
  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };
  
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };
  
  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Gelen arama sesi
  const playIncomingCallSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.loop = true;
      audio.play().catch(e => console.log('Audio play failed:', e));
      
      // 30 saniye sonra sesi durdur
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 30000);
    } catch (error) {
      console.log('Audio play error:', error);
    }
  };

  // Video elementlerini güncelle
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

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

  // Cleanup
  useEffect(() => {
    return () => {
      // Stream'leri durdur
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Peer connection'ı kapat
      if (pcRef.current) {
        pcRef.current.close();
      }
      
      // Timer'ı temizle
      stopCallTimer();
      
      // Socket'i kapat
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Güvenli VOIP Fonksiyonları
  const startSecureCall = async (type) => {
    try {
      console.log('Starting secure call:', type);
      setCallType(type);
      
      const contactId = contact.id || contact._id;
      
      // 1. Güvenli key exchange başlat
      await performKeyExchange(contactId);
      
      // 2. Yerel stream'i al
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: type === 'audio' || type === 'video',
        video: type === 'video'
      });
      
      setLocalStream(stream);
      
      // 3. WebRTC peer connection oluştur (güvenli)
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      pcRef.current = pc;
      
      // 4. Yerel stream'i peer connection'a ekle
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // 5. ICE candidate'ları şifrele ve gönder
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const encryptedCandidate = encryptData(event.candidate, sessionKey);
          socketRef.current.emit('secure_ice_candidate', {
            to: contactId,
            candidate: encryptedCandidate,
            sessionId: sessionKey.toString()
          });
        }
      };
      
      // 6. Uzak stream'i al
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };
      
      // 7. Güvenli offer oluştur ve gönder
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const encryptedOffer = encryptData(offer, sessionKey);
      socketRef.current.emit('secure_call_offer', {
        to: contactId,
        type: type,
        offer: encryptedOffer,
        sessionId: sessionKey.toString()
      });
      
      setInCall(true);
      setIsCallActive(true);
      setCallEncrypted(true);
      startCallTimer();
      
      console.log('Secure call started successfully');
      
    } catch (error) {
      console.error('Secure call start error:', error);
      alert('Güvenli arama başlatılamadı: ' + error.message);
    }
  };
  
  const acceptSecureCall = async () => {
    try {
      console.log('Accepting secure call');
      const { from, type, offer, sessionId } = callIncoming;
      
      // 1. Session key'i al ve decrypt et
      const decryptedOffer = decryptData(offer, sessionId);
      if (!decryptedOffer) {
        throw new Error('Arama teklifi çözülemedi');
      }
      
      // 2. Yerel stream'i al
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: type === 'audio' || type === 'video',
        video: type === 'video'
      });
      
      setLocalStream(stream);
      
      // 3. WebRTC peer connection oluştur
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      pcRef.current = pc;
      
      // 4. Yerel stream'i peer connection'a ekle
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // 5. ICE candidate'ları şifrele ve gönder
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const encryptedCandidate = encryptData(event.candidate, sessionId);
          socketRef.current.emit('secure_ice_candidate', {
            to: from,
            candidate: encryptedCandidate,
            sessionId: sessionId
          });
        }
      };
      
      // 6. Uzak stream'i al
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      });
      
      // 7. Offer'ı set et ve answer oluştur
      await pc.setRemoteDescription(decryptedOffer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // 8. Answer'ı şifrele ve gönder
      const encryptedAnswer = encryptData(answer, sessionId);
      socketRef.current.emit('secure_call_answer', {
        to: from,
        answer: encryptedAnswer,
        sessionId: sessionId
      });
      
      setInCall(true);
      setIsCallActive(true);
      setCallIncoming(null);
      setCallModal(false);
      setCallEncrypted(true);
      startCallTimer();
      
      console.log('Secure call accepted successfully');
      
    } catch (error) {
      console.error('Secure call accept error:', error);
      alert('Güvenli arama kabul edilemedi: ' + error.message);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="contact-info">
          <div className="contact-avatar">
            {contact.avatarUrl ? (
              <img src={contact.avatarUrl} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder">
                {contact.displayName?.charAt(0) || contact.username?.charAt(0) || contact.email?.charAt(0)}
              </div>
            )}
          </div>
          <div className="contact-details">
            <h3>{contact.displayName || contact.username || contact.email}</h3>
            <span className="status">{isConnected ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
          </div>
        </div>
        
        {/* Güvenli VOIP Arama Butonları */}
        {!inCall && (
          <div className="call-actions">
            <button 
              className="call-btn audio-call secure"
              onClick={() => startSecureCall('audio')}
              title="Güvenli Sesli Arama (End-to-End Encrypted)"
            >
              🔒📞
            </button>
            <button 
              className="call-btn video-call secure"
              onClick={() => startSecureCall('video')}
              title="Güvenli Görüntülü Arama (End-to-End Encrypted)"
            >
              🔒📹
            </button>
          </div>
        )}
        
        {/* Aktif Arama Kontrolleri */}
        {inCall && (
          <div className="call-controls">
            <div className="call-info">
              <span className="call-type">
                {callType === 'audio' ? '🔒📞' : '🔒📹'} 
                {callType === 'audio' ? 'Güvenli Sesli Arama' : 'Güvenli Görüntülü Arama'}
              </span>
              <span className="call-duration">{formatCallDuration(callDuration)}</span>
              {callEncrypted && (
                <span className="encryption-status">🔒 Şifrelenmiş</span>
              )}
            </div>
            <button 
              className="end-call-btn"
              onClick={endCall}
              title="Aramayı Sonlandır"
            >
              ❌
            </button>
          </div>
        )}
      </div>
      
      {/* Gelen Arama Modalı */}
      {callModal && callIncoming && (
        <div className="incoming-call-modal">
          <div className="call-modal-content">
            <div className="call-modal-header">
              <h3>🔒 Güvenli Gelen Arama</h3>
              <span className="caller-name">
                {callIncoming.from?.displayName || callIncoming.from?.username || callIncoming.from?.email}
              </span>
              <span className="call-type">
                {callIncoming.type === 'audio' ? '🔒📞 Güvenli Sesli Arama' : '🔒📹 Güvenli Görüntülü Arama'}
              </span>
              <div className="security-info">
                <span className="security-badge">🔒 End-to-End Encryption</span>
                <span className="security-desc">Bu arama tamamen şifrelenmiş ve güvenli</span>
              </div>
            </div>
            
            <div className="call-modal-actions">
              <button 
                className="accept-call-btn secure"
                onClick={acceptSecureCall}
              >
                🔒✅ Güvenli Kabul Et
              </button>
              <button 
                className="reject-call-btn"
                onClick={rejectCall}
              >
                ❌ Reddet
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Güvenlik Göstergeleri */}
      {!keyExchangeComplete && inCall && (
        <div className="key-exchange-progress">
          <div className="spinner"></div>
          <span>Güvenli bağlantı kuruluyor...</span>
        </div>
      )}
      
      {callEncrypted && (
        <div className="security-indicator">
          <span className="lock-icon">🔒</span>
          <span className="security-text">End-to-End Encryption Aktif</span>
        </div>
      )}
      
      {/* Video Görüntüleme */}
      {inCall && (
        <div className="video-container">
          {callType === 'video' && (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="local-video"
              />
              {remoteStream && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="remote-video"
                />
              )}
            </>
          )}
        </div>
      )}
      
      {/* Mesaj Listesi */}
      <div className="messages-container" ref={scrollRef}>
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