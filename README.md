# Verxiel Frontend - Modern Mesajlaşma Uygulaması

Verxiel'in React.js tabanlı frontend uygulaması. Modern, responsive ve kullanıcı dostu arayüz ile güvenli mesajlaşma deneyimi sunar.

## 🚀 Özellikler

- **Modern UI/UX:** Material Design prensipleri ile modern arayüz
- **Responsive Design:** Tüm cihazlarda mükemmel görünüm
- **Real-time Chat:** Socket.io ile anlık mesajlaşma
- **QR Kod Girişi:** Hızlı ve güvenli giriş sistemi
- **Sesli/Görüntülü Arama:** WebRTC ile kaliteli arama
- **Kişi Yönetimi:** Kolay kişi ekleme ve yönetimi
- **Dark/Light Mode:** Kullanıcı tercihi tema seçenekleri

## 🛠️ Teknolojiler

- **React.js** - UI framework
- **Socket.io-client** - Real-time communication
- **Axios** - HTTP client
- **CSS3/SCSS** - Advanced styling
- **WebRTC** - Voice/Video calls
- **QR Code** - QR kod oluşturma/okuma

## 📦 Kurulum

```bash
# Repository'yi klonlayın
git clone https://github.com/yourusername/verxielfrontend.git
cd verxielfrontend

# Bağımlılıkları yükleyin
npm install

# Development sunucusunu başlatın
npm start

# Production build oluşturun
npm run build
```

## 🔧 Environment Variables

```env
# API URL
REACT_APP_API_URL=https://verxiel.onrender.com

# Socket URL
REACT_APP_SOCKET_URL=https://verxiel.onrender.com

# Google Analytics
REACT_APP_GA_ID=G-XXXXXXXXXX
```

## 📱 Sayfalar

- **Ana Sayfa** - Giriş ve kayıt seçenekleri
- **Login** - Kullanıcı girişi
- **Register** - Kullanıcı kaydı
- **QR Login** - QR kod ile giriş
- **Chat** - Mesajlaşma arayüzü
- **Profile** - Kullanıcı profili

## 🎨 UI/UX Özellikleri

- **Modern Design:** Temiz ve minimal arayüz
- **Responsive Layout:** Mobile-first yaklaşım
- **Smooth Animations:** CSS transitions ve animations
- **Accessibility:** WCAG 2.1 uyumlu
- **Performance:** Lazy loading ve code splitting

## 🔒 Güvenlik

- **JWT Authentication** - Token tabanlı kimlik doğrulama
- **HTTPS Only** - Güvenli bağlantı
- **Input Validation** - Client-side veri doğrulama
- **XSS Protection** - Cross-site scripting koruması

## 📊 SEO Optimizasyonu

- **Meta Tags** - Open Graph, Twitter Cards
- **Sitemap.xml** - Search engine indexing
- **Robots.txt** - Crawler directives
- **Google Analytics** - Traffic tracking
- **Structured Data** - Rich snippets

## 🚀 Deployment

### Netlify (Önerilen)
```bash
# Netlify'da deploy edin
# Build command: npm run build
# Publish directory: build
# Environment variables'ları ayarlayın
```

### Vercel
```bash
# Vercel'de deploy edin
# Framework preset: Create React App
# Build command: npm run build
# Output directory: build
```

## 📈 Performance

- **Lighthouse Score:** 90+ (Performance, Accessibility, Best Practices, SEO)
- **Core Web Vitals:** Green (LCP, FID, CLS)
- **Bundle Size:** < 500KB (gzipped)
- **Load Time:** < 3s (3G connection)

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 📞 İletişim

- **Website:** https://verxiel.netlify.app
- **Email:** contact@verxiel.com
- **GitHub:** https://github.com/yourusername/verxielfrontend

## 🙏 Teşekkürler

Bu projeyi mümkün kılan tüm açık kaynak topluluğuna teşekkürler.

---

**Not:** Node modules dahil değildir, `npm install` komutu ile yükleyin.
