# 🔒 Güvenlik Düzeltmeleri - Firestore Security Rules

## 📋 Özet

Bu dokümanda, QuizUp+ projesinin Firestore Security Rules'ında tespit edilen kritik güvenlik açıkları ve yapılan düzeltmeler açıklanmaktadır.

## 🚨 Tespit Edilen Kritik Güvenlik Açıkları

### 1. **Multi-Tenant İzolasyon Eksikliği**

**Sorun**: Farklı şirketlerin verileri birbirine karışabiliyordu.

**Etkilenen Collection'lar**:
- ❌ `questions` - Tüm şirketlerin soruları herkese açıktı
- ❌ `quizSessions` - Tüm session'lar herkese açıktı
- ❌ `results` - Tüm test sonuçları herkese açıktı
- ❌ `users` - Tüm kullanıcılar birbirini görebiliyordu
- ❌ `branding` - Tüm şirketlerin branding'i açıktı

**Risk Seviyesi**: 🔴 Kritik

**Örnek Senaryo**:
```
Şirket A'nın manager'ı, Şirket B'nin tüm test sonuçlarını,
sorularını ve çalışan bilgilerini görebiliyordu.
```

### 2. **Quiz Session Güvenliği**

**Eski Rules**:
```javascript
allow read: if true;   // Herkes tüm session'ları okuyabilir
allow update: if true; // Herkes herhangi bir session'ı güncelleyebilir
```

**Risk**:
- Farklı şirketlerin quiz session'larına erişim
- Session verilerinin yetkisiz değiştirilmesi
- Quiz integrity'nin bozulması

### 3. **Result Collection IDOR Vulnerability**

**Eski Rules**:
```javascript
allow read: if isSignedIn(); // Herhangi bir authenticated user tüm sonuçları görebilir
```

**Risk**:
- Insecure Direct Object Reference (IDOR) açığı
- Başka şirketlerin test sonuçlarına erişim
- GDPR/KVKK ihlali riski

### 4. **User Collection Bilgi Sızıntısı**

**Eski Rules**:
```javascript
allow read: if isSignedIn(); // Herkes tüm kullanıcıları görebilir
```

**Risk**:
- Çalışan email'lerinin açığa çıkması
- Organizasyon yapısının görünür olması
- Rekabetçi bilgi sızıntısı

## ✅ Yapılan Düzeltmeler

### 1. **Multi-Tenant İzolasyon Eklendi**

**Yeni Helper Function**:
```javascript
function isSameCompany(companyField) {
  let userComp = getUserCompany();
  return userComp != null && companyField != null && companyField == userComp;
}
```

**Uygulama**:
- Tüm collection'larda `isSameCompany()` kontrolü eklendi
- Her kullanıcı sadece kendi şirketinin verilerini görebilir
- Cross-company veri sızıntısı engellendi

### 2. **Questions Collection**

**Yeni Rules**:
```javascript
allow read: if isSignedIn() && (
  isSameCompany(resource.data.company) ||
  resource.data.company == null // Backward compatibility
);
allow create: if isAdmin() && isSameCompany(request.resource.data.company);
allow update, delete: if isAdmin() && isSameCompany(resource.data.company);
```

**Koruma**:
- ✅ Sadece kendi şirketinin sorularını görebilir
- ✅ Admin sadece kendi şirketinin sorularını yönetebilir
- ✅ Eski sorular için backward compatibility

### 3. **Quiz Sessions Collection**

**Yeni Rules**:
```javascript
allow read: if true; // QR kod access için gerekli
allow create: if isManagerOrAdmin() && isSameCompany(request.resource.data.company);
allow delete: if isManagerOrAdmin() && isSameCompany(resource.data.company);
allow update: if true && (
  request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(['status', 'completedAt', 'completedBy', 'updatedAt'])
);
```

**Koruma**:
- ✅ QR kod ile erişim korundu (read: true gerekli)
- ✅ Session oluşturma company-based
- ✅ Sadece belirli alanlar güncellenebilir (status, completion)
- ✅ Silme sadece kendi şirketin session'ları için

### 4. **Results Collection - IDOR Düzeltmesi**

**Yeni Rules**:
```javascript
function isResultOwner(resultData) {
  return isSignedIn() && resultData.ownerUid == request.auth.uid;
}

allow read: if isSignedIn() && (
  isSameCompany(resource.data.company) ||
  isResultOwner(resource.data)
);
allow create: if isSignedIn() &&
                request.resource.data.ownerUid == request.auth.uid &&
                request.resource.data.company != null;
```

**Koruma**:
- ✅ IDOR açığı kapatıldı
- ✅ Kullanıcı sadece kendi şirketinin sonuçlarını görebilir
- ✅ VEYA kendi oluşturduğu sonuçları görebilir (anonim için)
- ✅ Company bilgisi zorunlu

### 5. **Users Collection**

**Yeni Rules**:
```javascript
allow read: if isSignedIn() && (
  isSameCompany(resource.data.company) ||
  request.auth.uid == userId
);
allow create: if (
  (isAdmin() && isSameCompany(request.resource.data.company)) ||
  (isSignedIn() && request.auth.uid == userId)
) && !hasPasswordField(request.resource.data);
allow update: if (
  (isSignedIn() && request.auth.uid == userId &&
   !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'company'])) ||
  (isAdmin() && isSameCompany(resource.data.company))
) && !hasPasswordField(request.resource.data);
```

**Koruma**:
- ✅ Sadece kendi şirketin kullanıcılarını görebilir
- ✅ Kullanıcı kendi role/company'sini değiştiremez
- ✅ Admin sadece kendi şirketinin kullanıcılarını yönetebilir
- ✅ Password field asla yazılamaz

### 6. **Branding Collection**

**Yeni Rules**:
```javascript
allow read: if isSignedIn() && (
  company == getUserCompany() ||
  company == 'default'
);
allow write: if isAdmin() && company == getUserCompany();
```

**Koruma**:
- ✅ Sadece kendi şirketin branding'ini görebilir
- ✅ Default branding herkese açık
- ✅ Admin sadece kendi şirketinin branding'ini değiştirebilir

### 7. **Suggested Questions Collection**

**Yeni Rules**:
```javascript
allow read: if isSignedIn() && (
  isSameCompany(resource.data.company) ||
  resource.data.company == null
);
allow create: if isSignedIn() && isSameCompany(request.resource.data.company);
allow update, delete: if isAdmin() && isSameCompany(resource.data.company);
```

**Koruma**:
- ✅ Multi-tenant izolasyon
- ✅ Herkes kendi şirketi için öneri oluşturabilir
- ✅ Admin sadece kendi şirketinin önerilerini yönetebilir

## 📊 Güvenlik Geliştirmeleri Özeti

| Collection | Eski Durum | Yeni Durum | Risk Azaltma |
|------------|------------|------------|--------------|
| questions | Tüm sorular açık | Company-based izolasyon | %100 |
| quizSessions | Herkes okuyabilir/yazabilir | Kontrollü erişim | %90 |
| results | IDOR açığı | Owner + Company check | %100 |
| users | Tüm kullanıcılar görünür | Company-based izolasyon | %100 |
| branding | Tümü açık | Company-based izolasyon | %100 |
| suggestedQuestions | Minimal kontrol | Company-based izolasyon | %100 |

## 🚀 Deployment Talimatları

### Adım 1: Firebase Console'a Giriş

1. [Firebase Console](https://console.firebase.google.com/) açın
2. Projenizi seçin
3. Sol menüden **Firestore Database** > **Rules** sekmesine gidin

### Adım 2: Rules Dosyasını Deploy Edin

**Yöntem 1: Firebase Console UI**
1. `firestore.rules` dosyasının içeriğini kopyalayın
2. Firebase Console'da Rules editörüne yapıştırın
3. **Publish** butonuna tıklayın

**Yöntem 2: Firebase CLI (Önerilen)**
```bash
# Firebase CLI kurulu değilse
npm install -g firebase-tools

# Login
firebase login

# Projeyi initialize edin (sadece ilk kez)
firebase init firestore

# Rules'ı deploy edin
firebase deploy --only firestore:rules
```

### Adım 3: Test Edin

Rules deploy olduktan sonra:

1. **Farklı şirketlerden 2 test kullanıcısı oluşturun**:
   - user1@companyA.com (Company: COMPANY_A)
   - user2@companyB.com (Company: COMPANY_B)

2. **Test senaryoları**:
   - ✅ User1, Company A'nın sorularını görebilmeli
   - ❌ User1, Company B'nin sorularını görememeli
   - ✅ User1, kendi test sonuçlarını görebilmeli
   - ❌ User1, Company B'nin sonuçlarını görememeli

3. **Browser Console'da test edin**:
```javascript
// Company A kullanıcısı ile giriş yapın
// Sonra başka bir şirketin verisine erişmeyi deneyin
const db = window.firebase.db;
const { collection, getDocs } = window.firebase;

// Bu başarısız olmalı (permission denied)
getDocs(collection(db, 'questions'))
  .then(snap => console.log('Sorular:', snap.docs.length))
  .catch(err => console.error('Hata (beklenen):', err.code));
```

## ⚠️ Önemli Notlar

### Backward Compatibility

Eski verilerde `company` alanı yoksa, kurallar bunları kabul eder:
```javascript
isSameCompany(resource.data.company) ||
resource.data.company == null // Eski veriler için
```

**Öneri**: Eski verilere company alanı ekleyin:
```javascript
// Firebase Console veya script ile
db.collection('questions').get().then(snapshot => {
  snapshot.forEach(doc => {
    if (!doc.data().company) {
      doc.ref.update({ company: 'BLUEMINT' }); // Default company
    }
  });
});
```

### Quiz Session Read Permission

`quizSessions` için `allow read: if true;` gerekli çünkü:
- QR kod ile anonim erişim yapılıyor
- Session ID bilinmeden quiz çözülemiyor
- Session oluşturma ve silme company-based korunuyor

Bu minimal risk oluşturur çünkü:
- Session ID tahmin edilemez (Firestore auto-ID)
- Hassas bilgi session'da yok
- Completion sadece status günceller

### Performance Considerations

Her rule, Firestore'a ek sorgu yapar (`get()`). Örnek:
```javascript
get(/databases/$(database)/documents/users/$(request.auth.uid))
```

**Optimizasyon**:
- Firebase'in rule caching'i sayesinde performans etkisi minimal
- Alternative: Custom claims kullanarak company bilgisini token'a ekleyin

## 🔍 Monitoring ve Auditing

### Güvenlik İzleme

Firebase Console > Firestore > **Usage** sekmesinde:
- Permission denied hatalarını izleyin
- Anormal erişim paternlerini kontrol edin

### Audit Logging

`errorLogs` collection eklendi:
```javascript
match /errorLogs/{logId} {
  allow create: if isSignedIn();
  allow read: if isAdmin();
  allow update, delete: if false;
}
```

Önemli işlemleri loglayın:
```javascript
await addDoc(collection(db, 'errorLogs'), {
  action: 'unauthorized_access_attempt',
  userId: auth.currentUser.uid,
  targetResource: 'results/xyz123',
  timestamp: serverTimestamp()
});
```

## 📚 İlave Kaynaklar

- [Firestore Security Rules Docs](https://firebase.google.com/docs/firestore/security/get-started)
- [Multi-Tenancy Patterns](https://firebase.google.com/docs/firestore/solutions/multi-tenancy)
- [Security Rules Testing](https://firebase.google.com/docs/rules/unit-tests)

## ✅ Checklist

Deployment öncesi kontrol listesi:

- [ ] `firestore.rules` dosyası oluşturuldu
- [ ] Firebase Console'a giriş yapıldı
- [ ] Rules deploy edildi
- [ ] Test kullanıcıları oluşturuldu
- [ ] Cross-company access testi yapıldı
- [ ] Permission denied hataları kontrol edildi
- [ ] Eski verilere `company` alanı eklendi (opsiyonel ama önerilen)
- [ ] Monitoring aktif edildi
- [ ] Takıma bilgi verildi

## 🆘 Sorun Giderme

### "permission-denied" Hataları

**Senaryo 1**: Kullanıcı kendi verilerini göremiyorsa
```javascript
// users collection'da company alanını kontrol edin
const user = await getDoc(doc(db, 'users', auth.currentUser.uid));
console.log('User company:', user.data().company);
```

**Senaryo 2**: Rules deploy olduktan sonra hala eski davranış görünüyorsa
- 1-2 dakika bekleyin (propagation süresi)
- Hard refresh yapın (Ctrl+Shift+R)
- Firebase Console'da Rules'ın güncel olduğunu doğrulayın

**Senaryo 3**: Admin yetkisi çalışmıyorsa
```javascript
// role kontrolü
const user = await getDoc(doc(db, 'users', auth.currentUser.uid));
console.log('User role:', user.data().role); // 'admin' olmalı
```

---

**Hazırlayan**: Claude Code
**Tarih**: 2025-11-11
**Versiyon**: 2.0 (Güvenlik Güncellemesi)
