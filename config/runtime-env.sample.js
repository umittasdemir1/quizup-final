// Netlify veya başka bir barındırma ortamında derleme sırasında otomatik olarak oluşturulan çalışma zamanı değişkenleri.
// Bu dosyanın bir kopyasını `config/runtime-env.js` adıyla oluşturup yerel geliştirme için değerleri doldurabilirsiniz.
// Netlify ortamında `VITE_FIREBASE_API_KEY` değişkenini tanımlarsanız oluşturacağınız build script'i bu dosyayı
// otomatik olarak güncelleyebilir.

window.__RUNTIME_CONFIG = {
  // Örnek: window.__RUNTIME_CONFIG.VITE_FIREBASE_API_KEY = 'xxx';
  VITE_FIREBASE_API_KEY: 'FIREBASE_API_KEY_PLACEHOLDER'
};
