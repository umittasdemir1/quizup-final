# Firebase Functions Deployment Talimatı

Şirket bilgisayarınıza Firebase CLI kuramadığınız için **GitHub Actions** ile otomatik deployment kurulumu:

## Adım 1: Firebase Service Account Key Oluştur

1. **Firebase Console** açın: https://console.firebase.google.com/
2. Projenizi seçin: **retail-quiz-4bb8c**
3. ⚙️ **Settings** (Project settings) → **Service accounts** sekmesi
4. **Generate new private key** butonuna tıklayın
5. İndirilecek **JSON dosyasını** kaydedin (örn: `retail-quiz-4bb8c-firebase-adminsdk.json`)

## Adım 2: GitHub Secret Ekle

1. **GitHub** reponuzu açın: https://github.com/umittasdemir1/quizup-final
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** tıklayın
4. **Secret ekleyin:**
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** İndirdiğiniz JSON dosyasının **TÜM içeriğini** buraya yapıştırın
   ```json
   {
     "type": "service_account",
     "project_id": "retail-quiz-4bb8c",
     "private_key_id": "...",
     "private_key": "...",
     ...
   }
   ```
5. **Add secret** tıklayın

6. İkinci bir secret daha ekleyin:
   - **Name:** `FIREBASE_PROJECT_ID`
   - **Value:** `retail-quiz-4bb8c`

## Adım 3: Workflow Aktif Et

Artık her `main` branch'e push yaptığınızda:
- ✅ GitHub Actions otomatik çalışacak
- ✅ Firebase Functions deploy edilecek
- ✅ CORS sorunu çözülecek

## Workflow Durumunu Kontrol

GitHub reponuzda **Actions** sekmesinden deployment loglarını görebilirsiniz.

---

## Alternatif: Ev Bilgisayarından Deploy

Eğer başka bir bilgisayardan yapabilirseniz:

```bash
# 1. Firebase CLI kur (bir kere)
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Proje seç
firebase use retail-quiz-4bb8c

# 4. Deploy
cd /path/to/quizup-final
firebase deploy --only functions
```

---

## Hangi Yöntem Daha İyi?

✅ **GitHub Actions (Önerilen):** Hiçbir kurulum gerekmez, otomatik deploy
⚡ **Manuel Deploy:** Bir kere yapılır, sonra unutursunuz

İkiniz de olabilir!
