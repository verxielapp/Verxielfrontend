const express = require('express');
const path = require('path');

const app = express();

// cPanel Node.js App PORT'u otomatik ayarlar, yoksa hata ver
const PORT = process.env.PORT;
if (!PORT) {
  console.error('❌ PORT environment variable bulunamadı!');
  console.error('💡 cPanel Node.js App ayarlarında PORT environment variable ekleyin.');
  process.exit(1);
}

const buildPath = path.join(__dirname, 'build');

// Build klasörü kontrolü
const fs = require('fs');
if (!fs.existsSync(buildPath)) {
  console.error(`❌ Build klasörü bulunamadı: ${buildPath}`);
  console.error('💡 Önce "npm run build" çalıştırıp build klasörünü oluşturun.');
  process.exit(1);
}

app.use(express.static(buildPath));

// Sitemap ve robots.txt için özel route'lar
app.get('/sitemap.xml', (_req, res) => {
  res.sendFile(path.join(buildPath, 'sitemap.xml'));
});

app.get('/robots.txt', (_req, res) => {
  res.sendFile(path.join(buildPath, 'robots.txt'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Verxiel frontend serving build on port ${PORT}`);
  console.log(`📁 Build path: ${buildPath}`);
});

