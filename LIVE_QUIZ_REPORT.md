# Canlı sınav geliştirme raporu — 13 Eylül 2026

Açık oturum, sunucunun yönettiği ortak soru sırasına ve ortak bitiş zamanına taşındı. Moderatörlü 1’e 1 modu eklendi. Tüm modlar aynı soru havuzu ve paket seçicisini kullanır. Supabase değişiklikleri MCP üzerinden uygulandı; kaynak kodu ve üretim çıktısı yerel çalışma alanında hazır. Web sitesine ayrıca yayın/deploy yapılmadı.

## Kullanım ve davranış

- **Açık Oturum:** Manager Panel → Yeni Quiz → Açık Oturum. Soruları seçip QR bağlantısını paylaşın. İlk katılımcıyla 60 saniyelik lobi ve ardından 3 saniyelik başlangıç sayımı açılır. Her soru en fazla **60 saniye** sürer. Aktif katılımcıların tamamı cevapladığında soru hemen kapanır. Doğru/yanlış gösterimi 4 saniye sürer, ardından herkes birlikte sonraki soruya geçer.
- **1’e 1 Düello:** Manager Panel → Yeni Quiz → 1’e 1 Düello. Bireysel moddakiyle aynı listeden soruları seçin veya Hızlı Paketler’den paket yükleyin. Ayrı ifade yazma formu yoktur. QR bağlantısı yarışmacılar içindir. **Moderatör panelini aç** bağlantısından iki kişi geldikten sonra ilk soruyu, her sonuç gösteriminden sonra sonraki soruyu açın; son sorudan sonra **Düelloyu bitir** düğmesine basın.
- Düelloda iki aktif koltuk vardır. Havuzdaki soru metni, soru tipi ve tüm şıklar korunur; sorular zorla iki seçeneğe dönüştürülmez. Bütün mod seçim kartları aynı yapıdan üretilir; canlı sınavlarda da Bireysel modun şık kartları kullanılır. Yanıt seçildikten sonra değiştirilemez. Her soru en fazla 60 saniye açıktır; ikisi de cevapladığında sonuç gösterilir. Sıralama mevcut zorluk/hız temelli XP hesabını kullanır; eşit XP beraberliktir.
- Sayfa yenilendiğinde aynı tarayıcıdaki katılımcı kimliği ve sunucuda kaydedilen cevap geri yüklenir. Sınav başladıktan sonra yeni katılım kapanır. Açıkça ayrılan katılımcı sonraki soruların erken kapanmasını engellemez. Bağlantısı geçici kesilen kişi süre sonuna kadar beklenen katılımcı sayısında kalır.
- Açık uçlu sorular açık oturumda desteklenir; otomatik doğru/yanlış ve XP yalnızca çoktan seçmeli sorulara uygulanır.
- Sonuçlar sunucuda her katılımcı için oluşturulur. **Sonucum ve PDF raporu** düğmesi mevcut sonuç ekranına gider.

## Teknik değişiklikler

- `src/LiveQuiz.jsx`, `src/liveQuiz.css`: katılımcı lobisi, ortak soru ekranı, Bireysel modla ortak şık kartları, moderatör kontrolleri, sonuç sıralaması ve ayrılma onayı.
- `src/liveClock.js`: cihazın duvar saati yerine sunucu zamanına bağlanan `performance.now()` hesabı. Arka plandan dönüşte yeniden eşitleme. Görünür sayfada yaklaşık saniyede bir durum sorgusu yapılır; ağ gecikmesi kadar kısa görüntü farkları mümkün olsa da cevap kabulünü ve soru geçişini sunucu belirler.
- `src/QuizRouter.jsx`, `src/App.jsx`, `src/db.js`: canlı mod yönlendirmesi ve Supabase RPC entegrasyonu. Bireysel sınavlar mevcut Quiz bileşenini kullanır.
- `components/manager.jsx`, `utils/helpers.js`: yeni modun formu, doğrulaması ve moderatör bağlantıları; açık oturumdaki toplam süre seçeneğinin kaldırılması.
- `live_quiz_rooms` ve `live_quiz_players`: ortak durum, soru anlık görüntüsü, katılımcılar ve yanıtlar. Oturum satırı kilidi, eşzamanlı katılım ve cevapları sıralar. Rastgele katılımcı anahtarının yalnızca özeti saklanır. Yeni tablolara istemciden doğrudan erişim kapalıdır.
- `create_live_quiz` ve `live_quiz`: oluşturma, katılma, durum okuma, cevaplama, moderatör ilerletmesi ve ayrılma. Oluşturma şirket/rol kontrolü gerektirir. Moderasyon için şirket yöneticisi, oturumu oluşturan manager veya super admin gerekir. Katılımcı RPC yanıtında cevap anahtarı soru kapanana kadar verilmez; mevcut soru bankası okuma politikaları bu çalışma kapsamında yeniden tasarlanmadı.
- Uygulanan migration’lar: `20260913000000_synchronized_live_quizzes.sql`, `20260913001000_live_quiz_lock_time_validation.sql` ve `20260913002000_live_modes_use_question_bank.sql`.
- Yeni Edge Function veya CORS değişikliği yok. Localhost ve üretim aynı Supabase istemcisi/RPC yetki kontrollerini kullanır. `.env` ve gizli anahtar dosyaları değiştirilmedi.

## Ek düzeltmeler

- Cihaz başına yerel sayaç ve katılımcıya göre farklı soru sırasının açık oturum senkronizasyonunu bozması giderildi.
- Çift katılım, çift cevap, eski soruya gelen cevap, süresi geçmiş cevap ve tekrar gelen moderatör işlemleri için sunucu kontrolleri eklendi.
- Veritabanı kilidinde bekleyen isteklerin bekleme süresi, cevap süresinden düşülür.
- Legacy derleyici artık çalışan Vite sunucusunun izlediği klasörü silmiyor; yeniden derlemeden sonra betiklerin 404 vermesi giderildi.
- PDF font kaydı global işaret yerine belgeye özel yapılıyor; aynı sayfada ikinci PDF de Türkçe fontu yükleyebiliyor.

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npm run build` | Başarılı; mevcut büyük paket boyutu uyarısı sürüyor |
| `git diff --check` | Başarılı |
| `node scripts/test-live-clock.mjs` | 8 kontrol: süre, bitiş, cihaz saati sapması, yeniden eşitleme |
| `scripts/test-live-quizzes.sql`, Supabase MCP | Başarılı: şirket/rol kontrolü, iki kişilik kapasite, tekrar istekler, cevap gizleme, erken kapanış, geç cevap, ayrılma, arka plandan dönüş, puanlama ve tek sonuç kaydı |
| `scripts/test-live-api.mjs`, geçici gerçek oturumlar | Başarılı: gerçek public REST API üzerinden eşzamanlı üç düello katılımında tam iki kabul; açık oturumda ortak sıra/süre, eşzamanlı cevaplar, erken kapanış ve ayrı/idempotent sonuçlar |
| `node scripts/test-live-ui.mjs` | Başarılı: gerçek React bileşeninde DOM etkileşimleri; katılım, havuzdan gelen dört şıklı soru ve ortak şık kartları, 60 saniye gösterimi, cevap kilidi, doğru/yanlış sınıfları, ayrılma, moderatör başlatma/bitirme ve sonuç sıralaması |
| `node scripts/test-mode-selection.mjs` | Ortak mod kartları, havuz/paket seçiminin modlar arasında korunması, eski paket işaretinin temizlenmesi ve düellonun orijinal soru ID’leriyle oluşturulması |
| `node scripts/test-pdf-font.mjs` | Başarılı: iki ayrı jsPDF belgesine Türkçe font yükleme ve PDF üretimi |

SQL senaryo testleri transaction sonunda geri alındı. Gerçek API/tarayıcı denemelerinin geçici şirketi, moderatörü, soruları, oturumları ve sonuçları ayrıca temizlendi. Test bağımlılığı jsdom yalnızca `/tmp/quizup-dom-test` altında kuruldu; proje bağımlılıkları değiştirilmedi.

**Doğrulanamayan kapsam:** Bu ortamda Chromium/Chrome otomasyonu zaman aşımı ve render/process hataları verdi. Bu nedenle gerçek Android/iOS, Safari, ekran görüntüsüyle mobil yerleşim, QR’ın telefondan okutulması ve tarayıcı üzerinden uçtan uca PDF indirme başarılı olarak işaretlenmedi. DOM testi gerçek cihaz/görsel test yerine geçmez. Giriş, dashboard, branding yükleme ve kullanıcı yönetiminin tamamında gerçek hesapla manuel regresyon turu yapılmadı. Eski istemcilerde devam eden sınavlarla karışık sürüm geçişi test edilmedi.

## Testleri tekrar çalıştırma

```bash
node scripts/test-live-clock.mjs
npm install --prefix /tmp/quizup-dom-test --no-audit --no-fund jsdom@26
node scripts/test-live-ui.mjs
node scripts/test-mode-selection.mjs
node scripts/test-pdf-font.mjs
npm run build
```

SQL testini Supabase SQL/MCP ile çalıştırın. `test-live-api.mjs` için yalnızca test amacıyla oluşturulmuş, henüz başlamamış tek sorulu açık oturum ve düello UUID’lerini sırayla verin; betik yaklaşık 70 saniyede gerçek katılımcı ve sonuç kayıtları oluşturur. Deneme sonunda bu kayıtları temizleyin.

## 1 vs 1 doğru yanıt açıklaması — 2026-09-13

Soru havuzundaki yeni/düzenlenen sorular için isteğe bağlı “Doğru Yanıt Ekle” anahtarı eklendi. Açıldığında 1–2000 karakterlik açıklama gerekir; kapatıldığında kayıtlı açıklama temizlenir. Doğru şık seçimi ayrı olarak korunur.

1 vs 1 katılımcısının cevabı kaydedildikten sonra doğru/yanlış durumu ve açıklama alttan açılan panelde gösterilir. Her iki cevap sonucunda da görünür. Kapatılan panel polling ile tekrar açılmaz; sonraki soruda eski açıklama kapanır. Native dialog odak yönetimi, Escape, azaltılmış hareket tercihi ve mobil güvenli alan desteği kullanır. Gerçek Android/iOS cihaz testi yapılmadı.

`20260913004000_duel_answer_explanations.sql` Supabase MCP ile uygulandı. Soru açıklaması oturumun soru kopyasına alınır; yeni oluşturulan oturumlarda kullanılır. RPC yalnızca cevabı kaydedilmiş aktif 1 vs 1 katılımcısına kendi açıklamasını gönderir. Diğer modlar açıklama panelini göstermez. RLS, tenant sınırları, kimlik doğrulama ve CORS kuralları değiştirilmedi; production/localhost aynı RPC akışını kullanır.

Doğrulama: `test-answer-explanation-form.mjs`, `test-live-ui.mjs`, `test-scroll-updates.mjs`, `npm run build` ve `git diff --check` geçti. `test-live-quizzes.sql` MCP üzerinden çalıştırıldı: doğru/yanlış açıklamaları, cevapsız rakip ve yabancı token için gizlilik, oturum senkronizasyonu ve mevcut yetki testleri geçti; test verileri transaction rollback ile kaldırıldı.

## Çoklu sınavda bireysel ekran tasarımı — 2026-09-13

Açık/çok katılımcılı oturumun aktif katılımcı sınav ekranı bireysel sınavdaki `quiz-fullscreen`, üst bar, soru sayacı, mavi ilerleme çubuğu, 672 px içerik genişliği, soru yazıları ve metin/görsel seçenek sınıflarını kullanır. Dairesel sayaç bireysel sınavdaki aynı `CircularTimer` bileşenidir; değerini canlı oturumun sunucu saatinden alır. Üst barın ortası katılımcı sayısını gösterir. Uzun içeriğin kaydırılması `.quiz-content` içinde kalır.

`OpenQuizScreen` yalnızca görünümü ve yeni soruda içerik kaydırmasını yönetir. RPC, 60 saniyelik ortak zaman, cevapların kilitlenmesi, herkes cevapladığında erken kapanış ve otomatik soru geçişi `LiveQuiz` akışında kalır. Soru sırası ve seçenek sırası değiştirilmedi. 1 vs 1, moderatör, lobi ve sonuç ekranlarının akışı korunur; veritabanı/RLS/CORS değişikliği yoktur.

`test-live-ui.mjs` artık çoklu ekranın tam ekran/üst bar/ortak dairesel sayaç/ilerleme, metin ve görsel şıklar, değiştirilemeyen cevaplar, doğru-yanlış gösterimi, sunucuyla soru geçişi, açık uçlu yanıt ve ayrılma onayını da doğrular. Testler ve üretim derlemesi geçti. Gerçek Android/iOS cihaz testi yapılmadı.

## Çoklu sınav XP ve sade gösterge revizyonu — 2026-09-13

Üst barın ortasına bireyseldeki XP ikonu ve toplam XP geri eklendi. `live_quiz` RPC yanıtındaki `liveXp`, yalnızca ilgili katılımcının kapanmış sorularından, sonuç hesabındaki aynı formülle hesaplanır: doğru cevap için zorluk tabanı × (1 − 0.5 × kayıtlı süre / 60); yanlış/boş cevap 0 XP. Soru kapanmadan mevcut cevabın doğruluğu XP yoluyla açığa çıkmaz. Yenileme veya tekrar bağlantıda toplam yeniden hesaplanır, puan iki kez eklenmez.

Şık altındaki doğru/yanlış açıklamaları, seçim uyarısı, bağlantı yazısı ve sonraki soru metni kaldırıldı. Bireyseldeki yeşil/kırmızı şık stilleri korundu. Katılım durumu yalnızca `cevaplayan | toplam` olarak gösterilir; örneğin `2 | 5`.

`20260913005000_live_quiz_xp.sql` MCP ile uygulandı. RLS, CORS ve puan formülü değiştirilmedi. Sunucu testleri hızlı doğru (12 sn = 180 XP), yavaş doğru (48 sn = 120 XP), yanlış (0 XP), tekrar polling, cevap öncesi gizlilik ve canlı/sonuç toplamının eşleşmesini doğruladı; test verileri rollback edildi. Arayüz testleri ve üretim derlemesi geçti.
