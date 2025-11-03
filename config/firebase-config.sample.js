// Firebase yapılandırmanızı bu dosyayı kopyalayarak oluşturun.
// 1. `config/firebase-config.sample.js` dosyasını `config/firebase-config.js` adıyla kopyalayın.
// 2. Aşağıdaki alanları kendi Firebase projenizdeki değerlerle güncelleyin.
// 3. Dosya `.gitignore` içinde olduğu için gerçek anahtarınız depo geçmişine eklenmez.

const runtimeApiKey = (window.__RUNTIME_CONFIG && window.__RUNTIME_CONFIG.VITE_FIREBASE_API_KEY) || 'FIREBASE_API_KEY';

window.__FIREBASE_CONFIG = {
  apiKey: runtimeApiKey,
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.appspot.com',
  messagingSenderId: '000000000000',
  appId: '0:000000000000:web:abcdefghijklmnopqrstuvwxyz',
  measurementId: 'G-XXXXXXXXXX'
};
