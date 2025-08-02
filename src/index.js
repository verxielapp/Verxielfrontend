import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';

// Axios interceptor for 401 errors
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - Clearing local storage and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only reload if we're not already on the login page
      if (!window.location.pathname.includes('login')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
