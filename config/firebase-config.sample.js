// Firebase Yapılandırma Şablonu
//
// ÖNEMLİ NOTLAR:
// 1. Bu dosya sadece şablon amaçlıdır - asla düzenlenmemelidir
// 2. Netlify build sırasında config/firebase-config.js otomatik oluşturulur
// 3. Yerel geliştirme için bu dosyayı config/firebase-config.js olarak kopyalayın
// 4. config/firebase-config.js dosyası .gitignore'da olduğu için commit edilmez
//
// NETLIFY KURULUMU:
// - Netlify → Site settings → Environment variables
// - VITE_FIREBASE_API_KEY environment variable'ını ekleyin
// - Build command zaten yapılandırılmış durumda
//
// YEREL GELİŞTİRME İÇİN:
// 1. Bu dosyayı config/firebase-config.js olarak kopyalayın
// 2. Aşağıdaki placeholder değerlerini Firebase Console'dan alın
// 3. Firebase Console → Project Settings → General → Your apps

window.__FIREBASE_CONFIG = {
  // API key Netlify environment variable'dan gelir (otomatik)
  // Yerel geliştirme için buraya Firebase API key'inizi yazın
  apiKey: window.__RUNTIME_CONFIG?.VITE_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",

  // Firebase Console'dan alınacak değerler:
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
