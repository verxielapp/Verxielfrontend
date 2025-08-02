import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './QRLogin.css';

const QRLogin = ({ onLoginSuccess, onBackToLogin }) => {
    const [qrCode, setQrCode] = useState('');
    const [status, setStatus] = useState('Generating QR code...');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const qrCodeRef = useRef(null);
    const intervalRef = useRef(null);

    const startQRCheck = useCallback((qrCodeData) => {
        intervalRef.current = setInterval(async () => {
            try {
                const response = await axios.post('https://verxiel.onrender.com/api/qr/qr-login', {
                    qrCode: qrCodeData
                });

                if (response.data.success) {
                    switch (response.data.status) {
                        case 'pending':
                            setStatus('Waiting for scan...');
                            break;
                        case 'scanned':
                            setStatus('QR code scanned, waiting for confirmation...');
                            break;
                        case 'confirmed':
                            // Login successful
                            localStorage.setItem('token', response.data.token);
                            localStorage.setItem('user', JSON.stringify(response.data.user));
                            setStatus('Login successful!');
                            onLoginSuccess(response.data.user);
                            break;
                        case 'expired':
                            setStatus('QR code expired');
                            setError('QR code has expired. Please generate a new one.');
                            break;
                        case 'invalid':
                            setStatus('Invalid QR code');
                            setError('Invalid QR code. Please try again.');
                            break;
                        default:
                            setStatus('Unknown status');
                    }
                }
            } catch (error) {
                console.error('QR check error:', error);
            }
        }, 2000); // Check every 2 seconds
    }, [onLoginSuccess]);

    const generateQRCode = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            setStatus('Generating QR code...');

            const response = await axios.post('https://verxiel.onrender.com/api/qr/generate-qr');
            
            if (response.data.success) {
                setQrCode(response.data.qrCode);
                setStatus('Scan QR code with your phone');
                startQRCheck(response.data.qrCode);
            } else {
                setError('Failed to generate QR code');
            }
        } catch (error) {
            console.error('QR generation error:', error);
            setError('Failed to generate QR code');
        } finally {
            setIsLoading(false);
        }
    }, [startQRCheck]);

    useEffect(() => {
        generateQRCode();
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [generateQRCode]);



    const handleRefresh = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        generateQRCode();
    };

    const createQRCodeSVG = (data) => {
        if (!data) return '';
        
        // Simple QR code representation using SVG
        // In a real app, you'd use a QR code library like qrcode.react
        const size = 200;
        const cellSize = 4;
        const cells = Math.floor(size / cellSize);
        
        let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
        svg += `<rect width="${size}" height="${size}" fill="white"/>`;
        
        // Create a simple pattern based on the QR code data
        for (let i = 0; i < cells; i++) {
            for (let j = 0; j < cells; j++) {
                const hash = data.charCodeAt((i * cells + j) % data.length);
                if (hash % 2 === 0) {
                    svg += `<rect x="${i * cellSize}" y="${j * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
                }
            }
        }
        
        svg += '</svg>';
        return svg;
    };

    return (
        <div className="qr-login-container">
            <div className="qr-login-card">
                <div className="qr-header">
                    <h2>QR Code Login</h2>
                    <p>Scan this QR code with your phone to log in</p>
                </div>

                <div className="qr-code-container">
                    {isLoading ? (
                        <div className="qr-loading">
                            <div className="spinner"></div>
                            <p>Generating QR code...</p>
                        </div>
                    ) : error ? (
                        <div className="qr-error">
                            <p>{error}</p>
                            <button onClick={handleRefresh} className="qr-button">
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="qr-code">
                            <div 
                                ref={qrCodeRef}
                                dangerouslySetInnerHTML={{ __html: createQRCodeSVG(qrCode) }}
                            />
                            <p className="qr-status">{status}</p>
                        </div>
                    )}
                </div>

                <div className="qr-actions">
                    <button onClick={handleRefresh} className="qr-button">
                        Refresh QR Code
                    </button>
                    <button onClick={onBackToLogin} className="qr-button secondary">
                        Back to Login
                    </button>
                </div>

                <div className="qr-instructions">
                    <ul>
                        <li>QR code expires in 2 minutes</li>
                        <li>Make sure your phone is connected to the internet</li>
                        <li>Open Verxiel app and scan this code</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default QRLogin; 