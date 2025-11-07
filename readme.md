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

1. `config/runtime-env.sample.js` dosyasını `config/runtime-env.js` olarak kopyalayın ve yerel geliştirme için `VITE_FIREBASE_API_KEY` değerini girin (Netlify dağıtımında bu dosya build sırasında otomatik üretilecektir).
2. `config/firebase-config.sample.js` dosyasını `config/firebase-config.js` olarak kopyalayıp Firebase projenizin `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId` gibi alanlarını doldurun. `apiKey` alanı Netlify ortam değişkeninden otomatik olarak gelecektir.
3. Dosyaları bir web sunucusuna yükleyin veya yerelde statik sunucu ile çalıştırın.
4. `index.html` dosyasını açın.

### Netlify üzerinde VITE_FIREBASE_API_KEY tanımlama

1. Netlify panelinde sitenizi açın ve **Site settings → Environment variables** sayfasına gidin.
2. Yeni değişken ekleyerek adını **`VITE_FIREBASE_API_KEY`** olarak belirleyin ve Firebase projenizdeki API anahtarını değer olarak kaydedin.
3. Build komutunuzun bir parçası olarak aşağıdaki satırı ekleyin ki Netlify dağıtımı sırasında `config/runtime-env.js` dosyası otomatik üretilebilsin:
   ```bash
   echo "window.__RUNTIME_CONFIG = { VITE_FIREBASE_API_KEY: '${VITE_FIREBASE_API_KEY}' };" > config/runtime-env.js
   ```
4. Yerel geliştirmede aynı dosyayı manuel olarak oluşturarak anahtarı güvenli bir şekilde yönetebilirsiniz; dosya `.gitignore` içinde olduğu için sürüm kontrolüne dahil edilmez.

## 📁 Dosya Yapısı

```
quizup-project/
├── index.html                  # Ana HTML shell
├── components/                 # React bileşenleri
│   ├── Admin.jsx              # Admin paneli
│   ├── AdminForm.jsx          # Soru formu
│   ├── QuestionList.jsx       # Soru listesi
│   ├── Manager.jsx            # Manager paneli
│   ├── Quiz.jsx               # Quiz arayüzü
│   ├── Dashboard.jsx          # Dashboard
│   ├── Tests.jsx              # Test sonuçları
│   ├── Result.jsx             # Detaylı sonuç
│   ├── Branding.jsx           # Marka ayarları
│   ├── Landing.jsx            # Ana sayfa
│   └── Sidebar.jsx            # Navigasyon
├── utils/                     # Yardımcı fonksiyonlar
│   ├── firebase.js            # Firebase yapılandırması
│   ├── helpers.js             # Genel yardımcılar
│   └── hooks.js               # React hooks
├── styles/
│   └── main.css               # Ana stil dosyası
└── config/
    ├── tailwind.config.js           # Tailwind yapılandırması
    └── firebase-config.sample.js    # Yerel Firebase yapılandırma şablonu
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
