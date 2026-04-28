# QuizUp+ Mimari Analiz Raporu

Senior yazılım mimarı perspektifiyle tüm kod tabanı incelenmiştir. Bulgular kritikten başlayarak sıralanmıştır.

---

## KRİTİK HATALAR

### 1. Client-Side Role Check Bypass
**Dosya:** `index.html:183-199`, `utils/helpers.js:599-602`

Tüm yetki kontrolleri `localStorage`'dan okunuyor:

```javascript
const isSuperAdmin = () => {
  const user = getCurrentUser(); // localStorage.getItem('currentUser')
  return user && user.isSuperAdmin === true; // Bu veriyi herkes değiştirebilir
};
```

Herhangi bir kullanıcı browser console'da şunu yapabilir:

```javascript
const u = JSON.parse(localStorage.getItem('currentUser'));
u.isSuperAdmin = true; u.role = 'admin';
localStorage.setItem('currentUser', JSON.stringify(u));
location.hash = '#/company-management';
```

Firestore rules yazma işlemlerini engelliyor ancak bazı koleksiyonlarda `allow read: if true` olduğu için UI tüm admin panel verilerini gösterecek ve okuma tabanlı saldırılara açık kalacaktır.

---

### 2. Super Admin Şirket Seçimi localStorage'da
**Dosya:** `utils/helpers.js:614-615`

```javascript
const selected = localStorage.getItem('superadmin:selectedCompany');
return selected || 'all';
```

Gerçek bir super admin olmayan bir kullanıcı bu değeri değiştirerek farklı şirketin verilerini sorgulayabilir. `questions` ve `quizSessions` koleksiyonlarında `allow read: if true` kuralı olduğu için tenant isolation bu noktada devre dışı kalır.

---

### 3. Global `window.*` Namespace
**Dosya:** `index.html`, `utils/firebase.js`, `utils/helpers.js`

30'dan fazla fonksiyon ve değişken `window`'a yazılıyor: `window.isLoggedIn`, `window.hasRole`, `window.firebase`, `window.toast`, `window.__firebaseCurrentUser`, `window.__pendingSessionRegistrations` vb.

Herhangi bir CDN kütüphanesi veya browser extension bu isimleri override ederse uygulama sessizce bozulur. `window.isLoggedIn = () => true` gibi bir override tüm auth korumasını devre dışı bırakır.

---

### 4. Script Yükleme Sırası Race Condition
**Dosya:** `index.html:91-225`

`utils/firebase.js` `type="module"` olarak yükleniyor (async). `utils/helpers.js` ise `type="text/babel"` (senkron) ve firebase.js'e bağımlı. App `fb-ready` eventini bekliyor ancak helpers.js yüklenirken `window.firebase` henüz tanımlı olmayabilir. Bu timing'e bağımlı, zaman zaman görülen "firebase is not defined" hatalarının kaynağıdır.

---

### 5. Demo Hesap Limitleri Bypass Edilebilir
**Dosya:** `functions/index.js:209-213`

```javascript
limits: { maxAdmins: 1, maxManagers: 3, maxQuestions: 25 }
```

Bu limit yalnızca Firestore dokümanına başlangıç değeri olarak yazılıyor. Ne Cloud Functions'ta, ne Firestore rules'da, ne de client'ta bu limit kontrol ediliyor. Demo hesabı sahibi, limit değerini Firestore'dan silerek 25'ten fazla soru ekleyebilir.

---

### 6. Unbounded Firestore Sorguları
**Dosya:** `components/dashboard.jsx:40-59`

```javascript
await Promise.all([
  getDocs(collection(db, 'questions')),    // limit() YOK
  getDocs(collection(db, 'quizSessions')), // limit() YOK
  getDocs(collection(db, 'results'))       // limit() YOK
]);
```

Veri büyüdükçe dashboard donacak. 10.000 soru + 10.000 result = 20.000 doküman tek seferde frontend'e iniyor. Hem Firestore maliyeti hem performans açısından ölümcüldür.

---

### 7. `onSnapshot` Memory Leak
**Dosya:** `utils/firebase.js:562-630`

```javascript
userSessionUnsubscribe = onSnapshot(userRef, (snapshot) => {
  // handler
}, (error) => {
  if (error?.code === 'permission-denied') {
    detachUserSessionListener(); // Sadece bu hata tipinde temizleniyor
  }
  // Diğer hatalarda listener askıda kalıyor!
});
```

Network hatası veya quota aşımı gibi durumlarda listener temizlenmiyor. Login/logout döngüsünde birden fazla listener birikebilir.

---

## ÖNEMLİ İYİLEŞTİRMELER

### 8. Konum Verisi GDPR Riski
**Dosya:** `utils/location.js:41-84`

Kullanıcının GPS koordinatları doğrudan OpenStreetMap Nominatim API'sine (üçüncü taraf) gönderiliyor. Nominatim'in saniyede 1 istek kuralı var, bunu aşmak IP ban'ına yol açar. Kullanıcının konum verisinin toplanması için açık onay alınıyor mu?

---

### 9. Session Heartbeat Agresifliği
**Dosya:** `utils/helpers.js:574-580`

Her tab odağına dönüldüğünde (`focus` eventi) Firestore'a write atılıyor. Birden fazla tab açık olan bir kullanıcı sürekli write üretiyor ve gereksiz Firestore maliyeti oluşturuyor.

---

### 10. `createDemoAccount` Zayıf Validasyon
**Dosya:** `functions/index.js:144-149`

Email format kontrolü yok, isim uzunluğu kontrolü yok, şifre yalnızca 6 karakter minimum olarak kontrol ediliyor. Geçersiz girdi Firebase Auth'a ulaştığında error handling yüzeysel kalıyor.

---

### 11. Application PIN Default `0000`
**Dosya:** `utils/firebase.js:297-304`

Yeni kullanıcıya otomatik olarak `0000` PIN atanıyor. `updateDoc` başarısız olsa bile `0000` ile devam ediyor. Zayıf default değer ve sessiz başarısızlık kombinasyonu güvenlik açığı oluşturuyor.

---

### 12. Merkezi State Management Yok
**Dosyalar:** Tüm component dosyaları

Her component `getCurrentUser()` çağırıyor ve `localStorage`'ı ayrı ayrı parse ediyor. Bir component kullanıcıyı güncellese diğerleri eski veriyle çalışmaya devam edebilir. React Context API ile bu sorun kolayca çözülebilir.

---

## ÖZET TABLO

| # | Bulgu | Dosya | Severity |
|---|-------|-------|----------|
| 1 | Client-side role bypass | `index.html`, `helpers.js` | 🔴 KRİTİK |
| 2 | Super admin company bypass | `helpers.js:614` | 🔴 KRİTİK |
| 3 | Global `window.*` namespace | `firebase.js`, `helpers.js` | 🔴 KRİTİK |
| 4 | Script yükleme race condition | `index.html:99-104` | 🔴 KRİTİK |
| 5 | Demo limit bypass | `functions/index.js:209` | 🟠 YÜKSEK |
| 6 | Unbounded Firestore query | `dashboard.jsx:40` | 🟠 YÜKSEK |
| 7 | onSnapshot memory leak | `firebase.js:562` | 🟠 YÜKSEK |
| 8 | GPS verisi üçüncü tarafa gidiyor | `location.js:41` | 🟡 ORTA |
| 9 | Heartbeat her focus'ta Firestore write | `helpers.js:574` | 🟡 ORTA |
| 10 | Demo account zayıf validasyon | `functions/index.js:144` | 🟡 ORTA |
| 11 | PIN default `0000` + sessiz fail | `firebase.js:297` | 🟡 ORTA |
| 12 | Merkezi state management yok | Tüm componentler | 🟡 ORTA |
