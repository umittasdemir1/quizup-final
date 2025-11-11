// Runtime Environment Configuration Şablonu
//
// ÖNEMLİ NOTLAR:
// 1. Bu dosya sadece şablon amaçlıdır - asla düzenlenmemelidir
// 2. Netlify build sırasında config/runtime-env.js otomatik oluşturulur
// 3. Yerel geliştirme için bu dosyayı config/runtime-env.js olarak kopyalayın
// 4. config/runtime-env.js dosyası .gitignore'da olduğu için commit edilmez
//
// NETLIFY KURULUMU:
// Netlify build command zaten yapılandırılmış:
// mkdir -p config && echo "window.__RUNTIME_CONFIG = { VITE_FIREBASE_API_KEY: '${VITE_FIREBASE_API_KEY}' };" > config/runtime-env.js
//
// YEREL GELİŞTİRME İÇİN:
// 1. Bu dosyayı config/runtime-env.js olarak kopyalayın
// 2. YOUR_FIREBASE_API_KEY yerine Firebase API key'inizi yazın

window.__RUNTIME_CONFIG = {
  VITE_FIREBASE_API_KEY: 'YOUR_FIREBASE_API_KEY'
};
