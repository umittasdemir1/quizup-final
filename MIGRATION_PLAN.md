# QuizUp+ Migrasyon ve Güvenlik Planı

ANALIZ.md'deki 12 bulgunun tamamı kapatılacak. Firebase → Supabase geçişi yapılacak. Mimari sıfırdan doğru kurulacak.

---

## GENEL STRATEJİ

Tek seferde her şeyi değiştirmek yerine 5 fazda ilerlenir. Her faz bağımsız olarak test edilebilir ve geri alınabilir. Kritik güvenlik açıkları en başta kapatılır — Supabase geçişi tamamlanmadan da canlıya alınabilir.

---

## FAZ 0 — Altyapı Kurulumu
**Tahmini süre:** 1 gün  
**Ön koşul:** Yok

### 0.1 MCP Sunucuları
- [x] Firebase MCP kurulumu (`@gannonh/firebase-mcp`)
- [x] Supabase MCP kurulumu (`@supabase/mcp-server-supabase`)
- [x] Her iki MCP'nin Claude Code ile bağlantısı test edildi

### 0.2 Vite Projesi
- [x] Root'a `package.json` oluşturulur
- [x] Vite + React plugin kurulur (`npm create vite@latest`)
- [x] Mevcut `components/`, `utils/`, `styles/`, `assets/` klasörleri Vite build akışına bağlanır
- [x] `index.html` CDN React/Babel script tagları temizlenir, `src/main.jsx` import sistemine geçilir
- [x] Tailwind, Vite/PostCSS plugin olarak kurulur (CDN kaldırılır)
- [x] Aktif uygulama `.env`/Vite env üzerinden çalışır; `config/runtime-env.js` kaldırıldı, `config/firebase-config.js` aktif yükleme zincirinde değil
- [x] Netlify build command: `npm run build`, publish directory: `dist`
<!-- Geçici durum: in-browser Babel kaldırıldı; legacy component dosyaları scripts/build-legacy.mjs ile derleniyor. Tam ES module dönüşümü Faz 1.1'de yapılacak. -->

### 0.3 Supabase Projesi
- [x] Supabase projesi oluşturuldu (`desydmbcbenyaksheold`)
- [x] `SUPABASE_ANON_KEY` `.env` üzerinden kullanılıyor (dosya içeriğine dokunulmadı)
- [x] `@supabase/supabase-js` paketi kurulur (Faz 0.2 sonrası)

---

## FAZ 1 — Kritik Güvenlik Açıkları (ANALIZ #1, #2, #3, #4)
**Tahmini süre:** 2 gün  
**Ön koşul:** Faz 0.2 tamamlandı (Vite kuruldu)  
**Not:** Bu faz Firebase üzerinde çalışırken de uygulanabilir.

### 1.1 Global `window.*` Kaldırılır (ANALIZ #3, #4)
- [x] Aktif Vite bootstrap içinde `window.firebase` alias'ı kaldırılır; `utils/firebase.js` artık yükleme zincirinde değil
- [x] `utils/firebase.js` dosyası arşivlenir veya kaldırılır
- [ ] `utils/helpers.js` proper ES module'e dönüştürülür, legacy global helper atamaları kaldırılır
- [ ] `utils/hooks.js` ES module'e dönüştürülür
- [ ] Tüm componentler native `import` kullanacak şekilde güncellenir
- [x] Script yükleme sırası sorunu (race condition) ortadan kalkar; Vite bootstrap legacy scriptleri sırayla yükler
- [x] Firebase isimli legacy runtime global/event adları `quizup-*` adlarına taşındı

### 1.2 Client-Side Role Check Güvenliği (ANALIZ #1, #2)
- [ ] `isLoggedIn()`, `hasRole()`, `isSuperAdmin()` fonksiyonları tamamen `localStorage`'a bağımlılıktan kurtarılır
- [x] `getCurrentUser()` auth hazır olduktan sonra Supabase bridge'in in-memory kullanıcısını localStorage'a tercih eder
- [ ] Rol bilgisi yalnızca Firebase Auth custom claims veya Supabase JWT'den okunur
- [ ] `superadmin:selectedCompany` localStorage key'i kaldırılır, server-side session'a taşınır
- [ ] Tüm route guard'lar token bazlı kontrol yapar hale getirilir

### 1.3 onSnapshot Memory Leak Kapatılır (ANALIZ #7)
- [x] `utils/firebase.js:562` — tüm error tiplerinde `detachUserSessionListener()` çağrılır
- [ ] Login/logout döngüsünde listener birikmesi test edilir

---

## FAZ 2 — Supabase Schema ve RLS Tasarımı
**Tahmini süre:** 2 gün  
**Ön koşul:** Faz 0.3 tamamlandı

### 2.1 Veritabanı Şeması ✅ TAMAMLANDI

```sql
-- Şirketler
companies (id, name, display_name, is_demo, expiry_date, limits jsonb, created_at)

-- Kullanıcılar (Supabase Auth ile entegre)
profiles (id uuid references auth.users, first_name, last_name, email, company_id, role, is_super_admin, is_demo, expiry_date, application_pin, created_at)

-- Sorular
questions (id, company_id, text, type, options jsonb, correct_answer, category, difficulty, image_url, created_by, created_at)

-- Quiz oturumları
quiz_sessions (id, company_id, employee jsonb, question_ids uuid[], status, created_by, created_at, completed_at)

-- Sonuçlar
results (id, company_id, session_id, owner_uid, answers jsonb, score jsonb, time_tracking jsonb, created_at)

-- Branding
branding (id, company_id, logo_url, primary_color, search_placeholder_words, updated_at)

-- Önerilen sorular
suggested_questions (id, company_id, text, category, suggested_by, created_at)

-- Soru paketleri
question_packages (id, company_id, name, question_ids uuid[], created_by, created_at)

-- Ayarlar
settings (id, key, value jsonb, updated_at)
```

### 2.2 Row Level Security (RLS) Politikaları ✅ TAMAMLANDI

Firestore rules'un tüm karşılıkları RLS olarak yazılır. Farklar:

- `company_id` her tabloda zorunlu foreign key — client'tan değiştirilemez
- `is_super_admin` JWT claim'den okunur — localStorage'dan değil
- Demo limit kontrolü Supabase Function ile enforce edilir
- `questions` ve `quiz_sessions` için `allow read: if true` yerine session token bazlı okuma

```sql
-- Örnek: questions tablosu
CREATE POLICY "Şirket soruları" ON questions
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );
```

### 2.3 Demo Limit Enforcement (ANALIZ #5)
- [ ] `questions` INSERT trigger'ı: şirketin soru sayısı `limits.maxQuestions`'ı geçiyorsa hata döner
- [ ] `profiles` INSERT trigger'ı: admin/manager sayısı limiti kontrol eder
- [ ] Bu kontroller database seviyesinde olduğu için client'tan bypass edilemez
<!-- Faz 2.2 sonrası yapılacak -->

---

## FAZ 3 — Veri Migrasyonu
**Tahmini süre:** 1 gün  
**Ön koşul:** Faz 2 tamamlandı, MCP'ler bağlı

### 3.1 Migrasyon Sırası ✅ TAMAMLANDI
1. [x] `companies` → 4 kayıt
2. [x] `users` → Supabase Auth + `profiles` (12 kayıt; geçici şifre dosyası lokal/ignored)
3. [x] `questions` → 103 kayıt (2 silinmiş demo şirkete ait atlandı)
4. [x] `branding` → 3 kayıt
5. [x] `quizSessions` → 49 kayıt
6. [x] `results` → 56 kayıt
7. [x] `suggestedQuestions` → 0 kayıt (koleksiyon boş)
8. [x] `questionPackages` → 5 kayıt
9. [x] `settings` → 2 kayıt

### 3.2 Migrasyon Scripti ✅
- [x] `migration/migrate.js` yazıldı ve çalıştırıldı
- [x] Her koleksiyon için kayıt sayısı doğrulandı
- [x] `migration/migrate-users.js` yazıldı ve çalıştırıldı
- [ ] Kullanıcı şifreleri Firebase'de saklanmıyor — kullanıcılara şifre sıfırlama maili gönderilecek veya geçici şifreler güvenli kanaldan iletilecek

### 3.3 Storage Migrasyonu
- [x] Firebase Storage'daki logo ve görseller Supabase Storage'a kopyalandı
- [x] URL'ler `branding` ve `questions` tablolarında Supabase public URL'lerine güncellendi

---

## FAZ 4 — Kod Migrasyonu
**Tahmini süre:** 3-4 gün  
**Ön koşul:** Faz 3 tamamlandı

### 4.1 `utils/supabase.js` — Yeni Servis Katmanı
- [x] `createClient` ile Supabase client başlatılır
- [x] Auth: `signInWithPassword`, `signOut`, legacy auth bridge
- [x] Auth: `onAuthStateChange` ile Supabase session değişiklikleri legacy state'e senkronlanır
- [ ] Auth: anonymous session
- [x] Aktif frontend Firebase SDK çağrıları Supabase karşılıklarıyla değiştirilir
- [ ] `registerActiveSession` → Supabase Realtime presence
- [x] `deleteUserByAdminV2` Cloud Function → Supabase Edge Function (lokal `admin-users`; deploy/test Faz 5'te)

### 4.2 Component Güncellemeleri
- [x] `components/Login.jsx` — Supabase auth
- [x] `components/Admin.jsx` + `AdminForm.jsx` + `QuestionList.jsx` — questions tablosu
- [x] `components/Manager.jsx` — quiz_sessions tablosu
- [x] `components/Quiz.jsx` — sessions + results
- [x] `components/Dashboard.jsx` — Supabase questions/sessions/results, query limit
- [x] `components/Result.jsx` — results tablosu
- [x] `components/Branding.jsx` — Supabase Storage
- [x] `components/UserManagement.jsx` — profiles tablosu + admin create/delete Edge Function çağrısı
- [x] `components/CompanyManagement.jsx` — companies tablosu
- [x] `components/Tests.jsx` — results tablosu
- [x] `components/MyTests.jsx` — results tablosu
- [x] `components/SuggestQuestion.jsx`, `components/SuggestedQuestions.jsx` — suggested_questions + questions tablosu
- [x] `components/Sidebar.jsx` — company switcher, pending suggestions, profile/password actions

### 4.3 Cloud Functions → Supabase Edge Functions
- [x] `deleteUserByAdminV2` → Edge Function (server-side admin auth; deploy/test Faz 5'te)
- [ ] `createDemoAccount` → Edge Function (validasyon güçlendirilir, ANALIZ #10)
- [ ] `cleanupExpiredDemos` → Supabase Cron Job (pg_cron)

### 4.4 Kalan Güvenlik Düzeltmeleri
- [x] **ANALIZ #6:** Dashboard sorgularına `limit()` eklenir
- [ ] **ANALIZ #6:** Dashboard için pagination veya server-side aggregation eklenir
- [x] **ANALIZ #8:** `utils/location.js` — Nominatim'e gitmeden önce kullanıcı onayı alınır, rate limiting eklenir
- [x] **ANALIZ #9:** Session heartbeat `focus` eventi kaldırılır, yalnızca 2 dakika interval kalır
- [x] **ANALIZ #11:** Application PIN `0000` default kaldırılır
- [ ] **ANALIZ #11:** İlk girişte PIN belirleme zorunlu olur

### 4.5 State Management (ANALIZ #12)
- [ ] `AuthContext` oluşturulur — kullanıcı bilgisi React Context'te tutulur
- [ ] `getCurrentUser()` çağrıları Context'ten okuyacak şekilde güncellenir
- [ ] localStorage doğrudan okunan yerler kaldırılır

---

## FAZ 5 — Test ve Deployment
**Tahmini süre:** 1-2 gün  
**Ön koşul:** Faz 4 tamamlandı

### 5.1 Manuel Test Senaryoları
- [ ] Login / logout / şifre sıfırlama
- [ ] Admin: soru ekleme, düzenleme, silme
- [ ] Manager: quiz oturumu oluşturma, QR kod
- [ ] Quiz: QR kod ile açılma, cevap verme, tamamlama
- [ ] Result: PDF export
- [ ] Branding: logo yükleme
- [ ] Dashboard: KPI kartları doğru hesaplanıyor mu
- [ ] Super admin: şirket yönetimi
- [ ] Demo hesap: limit kontrolü çalışıyor mu
- [ ] Tenant isolation: farklı şirket verisine erişilemediği doğrulanır

### 5.2 Güvenlik Testleri
- [ ] localStorage manipulation ile role bypass denenip engel doğrulanır
- [ ] Farklı şirket company_id ile Supabase query denenip RLS engeli doğrulanır
- [ ] Demo hesap soru limitini geçmeye çalışılır

### 5.3 Deployment
- [ ] Netlify environment variables güncellenir (Supabase URL ve key)
- [ ] Firebase environment variables kaldırılır
- [x] `functions/` klasörü kaldırıldı; aktif admin işlemleri Supabase Edge Function altında
- [ ] DNS ve redirect kontrolleri yapılır

---

## BULGU → FAZ EŞLEŞMESİ

| ANALIZ # | Bulgu | Faz | Durum |
|----------|-------|-----|-------|
| #1 | Client-side role bypass | Faz 1.2 | ⬜ |
| #2 | Super admin company bypass | Faz 1.2 | ⬜ |
| #3 | Global `window.*` namespace | Faz 1.1 | ⬜ |
| #4 | Script race condition | Faz 1.1 | ✅ Vite bootstrap sıralı legacy script loader kullanıyor |
| #5 | Demo limit bypass | Faz 2.3 | ⬜ |
| #6 | Unbounded Firestore query | Faz 4.4 | 🟨 Dashboard limit eklendi; pagination/aggregation bekliyor |
| #7 | onSnapshot memory leak | Faz 1.3 | 🟨 Cleanup düzeltildi; login/logout döngü testi bekliyor |
| #8 | GPS verisi GDPR riski | Faz 4.4 | ✅ Nominatim öncesi açık onay, 1.1 sn rate limit ve kısa reverse-geocode cache eklendi |
| #9 | Heartbeat agresifliği | Faz 4.4 | 🟨 Focus/visibility write kaldırıldı; Supabase presence dönüşümü bekliyor |
| #10 | Demo validasyon zayıflığı | Faz 4.3 | ⬜ |
| #11 | PIN default `0000` | Faz 4.4 | 🟨 Default PIN kaldırıldı; ilk girişte zorunlu PIN belirleme ekranı bekliyor |
| #12 | State management yok | Faz 4.5 | ⬜ |

## TAMAMLANAN ADIMLAR

| Adım | Açıklama | Tarih |
|------|----------|-------|
| Faz 0.1 | Firebase MCP + Supabase MCP kuruldu | 2026-04-25 |
| Faz 0.2 (kısmi) | Root Vite package/build altyapısı kuruldu | 2026-04-25 |
| Faz 0.2 (kısmi) | React/Babel CDN kaldırıldı, Vite `src/main.jsx` bootstrap ve legacy derleme eklendi | 2026-04-25 |
| Faz 0.3 (kısmi) | Supabase projesi oluşturuldu | 2026-04-25 |
| Faz 2.1 | Supabase şeması (9 tablo) oluşturuldu | 2026-04-25 |
| Faz 2.2 | 32 RLS politikası uygulandı (tüm tablolar) | 2026-04-25 |
| Faz 3.1 (kısmi) | Firestore verisi Supabase'e taşındı (users hariç) | 2026-04-25 |
| Güvenlik hızlı düzeltmeleri | Toast XSS, session listener cleanup, heartbeat focus write, dashboard query limit kapatıldı | 2026-04-25 |
| Faz 4.1 (kısmi) | Supabase browser client eklendi; Landing demo settings Supabase `settings` tablosundan okunuyor | 2026-04-25 |
| Firebase cleanup | Firebase config/rules/functions/service account/runtime helper dosyaları projeden kaldırıldı | 2026-04-26 |
| Firebase cleanup | Aktif kaynaklarda Firebase runtime/global/event referansları temizlendi; kalan `firebase_*` adları Supabase legacy veri kolonları olarak sınıflandırıldı | 2026-04-26 |
| Doğrulama | `npm run build` başarıyla geçti; yalnızca bundle size uyarısı kaldı | 2026-04-26 |
| Doğrulama | Lokal Vite sunucusunda landing sayfası headless Chromium ile render edildi | 2026-04-26 |
| Supabase security | Function `search_path` uyarıları kapatıldı; `results` INSERT policy'si aktif oturum + şirket eşleşmesine bağlandı | 2026-04-26 |

## FIREBASE TEMİZLİĞİ DURUMU

- [x] Aktif Firebase SDK/bootstrap/config yükleme zinciri kaldırıldı
- [x] Firebase Rules, Hosting config ve Cloud Functions dosyaları kaldırıldı
- [x] Firebase GitHub Actions deploy workflow'u kaldırıldı
- [x] Dokümantasyon Supabase + Vite akışına göre güncellendi
- [x] Migrasyon credential JSON dosyası korundu; kullanıcı şifre/reset dağıtımı en sona bırakıldı
- [x] Eski migrasyon `node_modules` içindeki Firebase paket kalıntıları kaldırıldı
- [x] Supabase legacy kolon adları (`firebase_id`, `firebase_uid`, `session_firebase_id`, `question_firebase_ids`) uygulama fallback'lerinden çıkarıldı
- [x] Supabase DB şeması için legacy kolon silme SQL migrasyonu hazırlandı (`supabase/migrations/20260426000000_drop_legacy_compat_columns.sql`)
- [x] Legacy kolon silme SQL migrasyonu Supabase projesine uygulandı ve `information_schema` ile doğrulandı
- [x] Firebase Storage'dan kalmış logo/görsel URL'leri Supabase Storage'a taşındı ve DB'de sıfır Firebase Storage URL'i doğrulandı
| Faz 3.1/3.2 | Firebase users → Supabase Auth + profiles migrasyonu tamamlandı | 2026-04-25 |
| Faz 4.1/4.2 | Login ve Dashboard Supabase'e taşındı | 2026-04-25 |
| Faz 4.2 (kısmi) | Admin/AdminForm/QuestionList, Manager, Quiz, Result, Branding, UserManagement ve Tests doğrudan Firebase SDK çağrılarından `window.db`/Supabase katmanına taşındı | 2026-04-26 |
| Faz 4.2 (kısmi) | CompanyManagement, MyTests, SuggestQuestion, SuggestedQuestions ve Sidebar aktif Firebase SDK çağrılarından temizlendi | 2026-04-26 |
| Faz 4.3 (kısmi) | Admin user create/delete için `supabase/functions/admin-users` Edge Function eklendi; frontend service-role kullanımı kaldırıldı | 2026-04-26 |
| Faz 4.2 (kısmi) | QRCode CDN/stub yerine Vite bundle içinde `qrcode` paketiyle legacy `window.QRCode` uyumlu renderer eklendi | 2026-04-26 |
| Faz 1.1 (kısmi) | Aktif Vite bootstrap'taki boş `window.firebase` alias'ı kaldırıldı; runtime'da `window.firebase` olmadığı doğrulandı | 2026-04-26 |
| Faz 1.1 (kısmi) | Eski `utils/firebase.js` bootstrap dosyası aktif zincirden çıkarıldığı doğrulandıktan sonra kaldırıldı | 2026-04-26 |
| Faz 0.2 (kısmi) | Eski `config/runtime-env.js` placeholder dosyası kaldırıldı; aktif kaynaklarda `__RUNTIME_CONFIG` referansı kalmadı | 2026-04-26 |
| Dokümantasyon | `AGENTS.md` Vite + Supabase geçişine göre güncellendi; eski Firebase config kopyalama talimatları kaldırıldı | 2026-04-26 |
| Faz 4.1/4.5 (kısmi) | Supabase `onAuthStateChange` bridge eklendi; legacy auth ready/user eventleri canlı session değişiklikleriyle senkronlanıyor | 2026-04-26 |
| Faz 4.4 | `utils/location.js` için Nominatim öncesi açık kullanıcı onayı, rate limit ve reverse-geocode cache eklendi | 2026-04-26 |
| Faz 4.4 | Aktif kullanıcı/quiz akışlarında `0000` varsayılan PIN üretimi kaldırıldı; PIN yeni kullanıcı ve profil güncellemede zorunlu hale geldi | 2026-04-26 |
| Edge Function Tooling | `admin-users` için Deno/npm import TypeScript shim'i eklendi; lokal `tsc --skipLibCheck` kontrolü temiz | 2026-04-26 |
| Bugfix | Quiz quit/abandon akışında `results.status` olmayan kolona yazma kaldırıldı; durum `score.status` içinde tutulup session `cancelled` yapılıyor | 2026-04-26 |
| Faz 5.1 (kısmi) | `npm run build` başarılı; Vite dev server `http://localhost:5173` üzerinde açılıyor | 2026-04-26 |

---

## MCP KURULUM TALİMATLARI

### Firebase MCP
```bash
# Claude Code settings.json'a eklenecek
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "@firebase/mcp-server"],
      "env": {
        "FIREBASE_PROJECT_ID": "retail-quiz-4bb8c"
      }
    }
  }
}
```
Kurulum için `firebase login` ile authenticate olunması gerekir.

### Supabase MCP
```bash
# Claude Code settings.json'a eklenecek
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest",
               "--supabase-url", "YOUR_SUPABASE_URL",
               "--supabase-service-role-key", "YOUR_SERVICE_ROLE_KEY"]
    }
  }
}
```

---

## TOPLAM TAHMİN

| Faz | İçerik | Süre |
|-----|--------|------|
| Faz 0 | Altyapı kurulumu | 1 gün |
| Faz 1 | Kritik güvenlik açıkları | 2 gün |
| Faz 2 | Supabase schema + RLS | 2 gün |
| Faz 3 | Veri migrasyonu | 1 gün |
| Faz 4 | Kod migrasyonu | 4 gün |
| Faz 5 | Test + deployment | 2 gün |
| **Toplam** | | **~12 gün** |
