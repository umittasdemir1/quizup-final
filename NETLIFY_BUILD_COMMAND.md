# 🚀 Netlify Build Command Kılavuzu

## ⚠️ ÖNEMLİ: Bu adımları sırayla takip edin

Bu dosya, Firebase config dosyalarını güvenli bir şekilde Netlify build sırasında oluşturmak için gerekli talimatları içerir.

---

## 📋 ADIM 1: Netlify Environment Variables

Netlify Dashboard → Site settings → Environment variables

**Eklenecek değişken:**
- **Key:** `VITE_FIREBASE_API_KEY`
- **Value:** `AIzaSyAtGQUD_-8JhVI73cTg21MeucPorYpgTRs`

✅ Bu değişkenin zaten ekli olduğunu varsayıyoruz. Kontrol edin!

---

## 📋 ADIM 2: Netlify Build Command Güncelleme

Netlify Dashboard → Site settings → Build & deploy → Build settings

### 🔧 Build Command (Tek satır olarak kopyalayın)

```bash
mkdir -p config && echo "window.__RUNTIME_CONFIG = { VITE_FIREBASE_API_KEY: '\${VITE_FIREBASE_API_KEY}' };" > config/runtime-env.js && echo "window.__FIREBASE_CONFIG = { apiKey: window.__RUNTIME_CONFIG?.VITE_FIREBASE_API_KEY || '\${VITE_FIREBASE_API_KEY}', authDomain: 'retail-quiz-4bb8c.firebaseapp.com', projectId: 'retail-quiz-4bb8c', storageBucket: 'retail-quiz-4bb8c.firebasestorage.app', messagingSenderId: '656506684656', appId: '1:656506684656:web:a3e97785fdbe50737f6e35', measurementId: 'G-WMBNP0BZ27' };" > config/firebase-config.js
```

### 📝 Publish Directory
```
.
```
(root dizin, nokta karakteri)

---

## 🧪 ADIM 3: Test Deploy

1. Netlify'da build command'ı güncelleyin
2. **Deploy Settings → Trigger Deploy → Deploy site** yapın
3. Deploy loglarını kontrol edin:
   - `config/runtime-env.js` oluşturuldu mu?
   - `config/firebase-config.js` oluşturuldu mu?
4. Deploy başarılı olduktan sonra canlı siteyi test edin
5. Firebase bağlantısının çalıştığını doğrulayın (login yapabilme, veri okuma vb.)

---

## ✅ Başarı Kriterleri

Deploy başarılı sayılır eğer:
- ✅ Build hatasız tamamlandı
- ✅ Canlı site açılıyor
- ✅ Firebase authentication çalışıyor
- ✅ Veri okuma/yazma işlemleri çalışıyor
- ✅ Console'da Firebase hatası yok

---

## 🚨 Sorun Giderme

### Eğer build başarısız olursa:

**Hata: "VITE_FIREBASE_API_KEY not found"**
- Environment variables sayfasında `VITE_FIREBASE_API_KEY` değişkenini kontrol edin
- Değişken ekledikten sonra yeni deploy tetikleyin

**Hata: "Permission denied" veya "Cannot create file"**
- Build command'daki `mkdir -p config` kısmını kontrol edin
- Tek satır olarak kopyaladığınızdan emin olun

**Site açılıyor ama Firebase çalışmıyor:**
- Browser console'u açın (F12)
- Firebase config hatalarını kontrol edin
- Build log'larında `config/firebase-config.js` dosyasının oluşturulduğunu doğrulayın

---

## 📞 Test Sonrası

Build başarılı olduktan sonra bana bildirin, AŞAMA 3'e geçeceğiz:
- `config/firebase-config.js` dosyasını Git'ten sileceğiz
- `config/runtime-env.js` dosyasını Git'ten sileceğiz
- Artık bu dosyalar sadece build sırasında oluşturulacak

---

## 🎯 Beklenen Sonuç

Bu işlemler tamamlandığında:
1. ✅ Firebase credentials GitHub'da görünmeyecek
2. ✅ Her deploy'da config dosyaları otomatik oluşturulacak
3. ✅ Canlı site eskisi gibi sorunsuz çalışacak
4. ✅ Güvenlik açığı kapatılmış olacak

---

**Not:** Bu dosya sadece referans amaçlıdır. İşlemler tamamlandıktan sonra silinebilir.
