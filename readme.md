# QuizUp+ - Boost Your Knowledge

Modern bir perakende quiz/test platformu. Personel eğitimi ve değerlendirmesi için tasarlanmış kapsamlı bir sistem.

## 🎯 Özellikler

### Admin Panel
- Çoktan seçmeli ve açık uçlu soru ekleme
- Görsel destekli sorular (hem soru hem seçeneklerde)
- Timer/süre sınırı özelliği
- Kategori ve zorluk seviyeleri
- Soru havuzu yönetimi

### Manager Panel
- Quiz oturumu oluşturma
- QR kod ile personele atama
- Soru seçimi ve personel bilgileri
- Oturum takibi

### Quiz Arayüzü
- Süre göstergeli soru çözme
- İlerleme çubuğu
- Görsel ve metin tabanlı seçenekler
- Responsive tasarım

### Dashboard
- KPI kartları (toplam soru, oturum, başarı oranı)
- Kategori ve zorluk dağılımları
- En başarılı mağazalar/personeller
- Son aktiviteler

### Marka Ayarları
- Logo yükleme (drag & drop)
- Firebase Storage entegrasyonu
- Glassmorphism tasarım

### Raporlama
- Detaylı sonuç görüntüleme
- PDF export
- Soru bazında doğru/yanlış analizi

## 🚀 Kurulum

### Netlify'da Deploy (Önerilen)

Bu proje Netlify üzerinde otomatik deploy için optimize edilmiştir.

**1. Netlify Environment Variables Ayarları**

Netlify panelinde: **Site settings → Environment variables**

Şu değişkeni ekleyin:
- **Variable name:** `VITE_FIREBASE_API_KEY`
- **Value:** Firebase API anahtarınız (Firebase Console → Project Settings → General)

**2. Netlify Build Settings**

Netlify panelinde: **Site settings → Build & deploy → Build settings**

- **Build command:**
  ```bash
  mkdir -p config && echo "window.__RUNTIME_CONFIG = { VITE_FIREBASE_API_KEY: '${VITE_FIREBASE_API_KEY}' };" > config/runtime-env.js && echo "window.__FIREBASE_CONFIG = { apiKey: window.__RUNTIME_CONFIG?.VITE_FIREBASE_API_KEY || '${VITE_FIREBASE_API_KEY}', authDomain: 'YOUR_AUTH_DOMAIN', projectId: 'YOUR_PROJECT_ID', storageBucket: 'YOUR_STORAGE_BUCKET', messagingSenderId: 'YOUR_SENDER_ID', appId: 'YOUR_APP_ID', measurementId: 'YOUR_MEASUREMENT_ID' };" > config/firebase-config.js
  ```
  ⚠️ **Önemli:** Build command'daki Firebase config değerlerini kendi projenize göre değiştirin!

- **Publish directory:** `.` (root)

**3. Deploy**

Ayarları yaptıktan sonra Netlify otomatik olarak deploy edecektir.

### Yerel Geliştirme (Opsiyonel)

1. Repository'yi clone edin
2. `config/runtime-env.sample.js` dosyasını `config/runtime-env.js` olarak kopyalayın
3. `config/firebase-config.sample.js` dosyasını `config/firebase-config.js` olarak kopyalayın
4. Her iki dosyada `YOUR_*` placeholder'ları Firebase Console'dan aldığınız değerlerle değiştirin
5. Basit bir HTTP server ile çalıştırın:
   ```bash
   # Python ile
   python -m http.server 8000
   # veya Node.js ile
   npx http-server
   ```
6. `http://localhost:8000` adresini açın

**Not:** `config/firebase-config.js` ve `config/runtime-env.js` dosyaları `.gitignore`'da olduğu için commit edilmez.

## 📁 Dosya Yapısı

```
quizup-final/
├── .gitignore                       # Git ignore kuralları
├── index.html                       # Ana HTML shell
├── readme.md                        # Bu dosya
├── components/                      # React bileşenleri
│   ├── Admin.jsx                   # Admin paneli
│   ├── AdminForm.jsx               # Soru formu
│   ├── QuestionList.jsx            # Soru listesi
│   ├── Manager.jsx                 # Manager paneli
│   ├── Quiz.jsx                    # Quiz arayüzü
│   ├── Dashboard.jsx               # Dashboard
│   ├── Tests.jsx                   # Test sonuçları
│   ├── Result.jsx                  # Detaylı sonuç
│   ├── Branding.jsx                # Marka ayarları
│   ├── Landing.jsx                 # Ana sayfa
│   ├── Login.jsx                   # Giriş sayfası
│   ├── UserManagement.jsx          # Kullanıcı yönetimi
│   ├── SuggestQuestion.jsx         # Soru önerisi formu
│   ├── SuggestedQuestions.jsx      # Önerilen sorular listesi
│   ├── MyTests.jsx                 # Kişisel test sonuçları
│   ├── Questions.jsx               # Soru bankası
│   ├── LocationMap.jsx             # Konum haritası
│   └── Sidebar.jsx                 # Navigasyon
├── utils/                          # Yardımcı fonksiyonlar
│   ├── firebase.js                 # Firebase yapılandırması ve auth
│   ├── helpers.js                  # Genel yardımcılar ve utilities
│   ├── hooks.js                    # Custom React hooks
│   └── location.js                 # Konum servisleri
├── styles/
│   └── main.css                    # Ana stil dosyası (custom CSS)
└── config/
    ├── tailwind.config.js          # Tailwind yapılandırması
    ├── pdf-fonts.js                # PDF font yapılandırması
    ├── firebase-config.sample.js   # Firebase config şablonu (yerel geliştirme)
    ├── runtime-env.sample.js       # Runtime env şablonu (yerel geliştirme)
    ├── firebase-config.js          # (Build sırasında oluşturulur - .gitignore'da)
    └── runtime-env.js              # (Build sırasında oluşturulur - .gitignore'da)
```

## 🛠️ Teknolojiler

- **React 18** (Babel standalone)
- **Firebase** (Firestore, Storage, Auth)
- **TailwindCSS**
- **QRCode.js**
- **jsPDF**

## 🎨 Tasarım Özellikleri

- Modern gradient'ler
- Toast bildirim sistemi
- Responsive grid layout
- Smooth animasyonlar
- Glassmorphism efektler

## 📝 Lisans

Bu proje özel kullanım içindir.

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak için lütfen bir issue açın veya pull request gönderin.

## 📧 İletişim

Sorularınız için lütfen iletişime geçin.
