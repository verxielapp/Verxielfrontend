const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('Setting up proxy middleware...');
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'https://verxiel.com',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url, '->', proxyReq.path);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
      }
    })
  );
  console.log('Proxy middleware configured for /api ->', process.env.REACT_APP_API_URL || 'https://verxiel.com');
}; 