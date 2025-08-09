import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://verxiel.onrender.com/api';

export default function FriendRequests({ token, user, onBack }) {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [sendEmail, setSendEmail] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Gelen istekleri yükle
  const loadReceivedRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/friend-requests/received`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceivedRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading received requests:', error);
      setReceivedRequests([]);
    }
  };

  // Gönderilen istekleri yükle
  const loadSentRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/friend-requests/sent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSentRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading sent requests:', error);
      setSentRequests([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'received') {
      loadReceivedRequests();
    } else {
      loadSentRequests();
    }
  }, [activeTab, token]);

  // Arkadaşlık isteği gönder
  const sendFriendRequest = async (e) => {
    e.preventDefault();
    if (!sendEmail.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/friend-requests/send`, {
        receiverEmail: sendEmail,
        message: sendMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSendEmail('');
      setSendMessage('');
      alert('Arkadaşlık isteği gönderildi!');
      
      // Gönderilen istekleri yenile
      if (activeTab === 'sent') {
        loadSentRequests();
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert(error.response?.data?.message || 'Arkadaşlık isteği gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  // İsteği yanıtla (kabul et/reddet)
  const respondToRequest = async (requestId, action) => {
    try {
      const endpoint = action === 'accept' ? 'accept' : 'reject';
      await axios.post(`${API_BASE_URL}/friend-requests/${requestId}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(action === 'accept' ? 'Arkadaşlık isteği kabul edildi!' : 'Arkadaşlık isteği reddedildi!');
      loadReceivedRequests();
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('İstek yanıtlanamadı');
    }
  };

  // İsteği iptal et
  const cancelRequest = async (requestId) => {
    try {
      await axios.post(`${API_BASE_URL}/friend-requests/${requestId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Arkadaşlık isteği iptal edildi!');
      loadSentRequests();
    } catch (error) {
      console.error('Error canceling request:', error);
      alert('İstek iptal edilemedi');
    }
  };

  return (
    <div className="friend-requests-container">
      <div className="friend-requests-header">
        <button onClick={onBack} className="back-btn">←</button>
        <h2>Arkadaşlık İstekleri</h2>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Gelen İstekler ({receivedRequests.length})
        </button>
        <button 
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Gönderilen İstekler ({sentRequests.length})
        </button>
        <button 
          className={`tab ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          İstek Gönder
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'received' && (
          <div className="received-requests">
            {receivedRequests.length === 0 ? (
              <div className="empty-state">
                <p>Henüz gelen arkadaşlık isteği yok</p>
              </div>
            ) : (
              receivedRequests.map(request => (
                <div key={request.id} className="request-card">
                  <div className="request-info">
                    <div className="request-avatar">
                      {request.sender.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="request-details">
                      <div className="request-name">{request.sender.displayName || request.sender.email}</div>
                      <div className="request-email">{request.sender.email}</div>
                      {request.message && (
                        <div className="request-message">"{request.message}"</div>
                      )}
                      <div className="request-date">
                        {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      onClick={() => respondToRequest(request.id, 'accept')}
                      className="accept-btn"
                    >
                      Kabul Et
                    </button>
                    <button 
                      onClick={() => respondToRequest(request.id, 'reject')}
                      className="reject-btn"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="sent-requests">
            {sentRequests.length === 0 ? (
              <div className="empty-state">
                <p>Henüz arkadaşlık isteği göndermedin</p>
              </div>
            ) : (
              sentRequests.map(request => (
                <div key={request.id} className="request-card">
                  <div className="request-info">
                    <div className="request-avatar">
                      {request.receiver.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="request-details">
                      <div className="request-name">{request.receiver.displayName || request.receiver.email}</div>
                      <div className="request-email">{request.receiver.email}</div>
                      {request.message && (
                        <div className="request-message">"{request.message}"</div>
                      )}
                      <div className="request-date">
                        {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="request-status">Bekliyor...</div>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      onClick={() => cancelRequest(request.id)}
                      className="cancel-btn"
                    >
                      İptal Et
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'send' && (
          <div className="send-request">
            <form onSubmit={sendFriendRequest} className="send-request-form">
              <h3>Yeni Arkadaşlık İsteği</h3>
              <div className="form-group">
                <label>Email Adresi</label>
                <input
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="arkadaş@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Mesaj (İsteğe bağlı)</label>
                <textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="Merhaba! Arkadaş olmak ister misin?"
                  rows="3"
                />
              </div>
              <button type="submit" disabled={loading} className="send-btn">
                {loading ? 'Gönderiliyor...' : 'İstek Gönder'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}