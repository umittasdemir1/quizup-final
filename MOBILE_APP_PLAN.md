# QuizUp Mobile — Sıfırdan İnşa Planı (React Native + Expo)

> **Hedef:** QuizUp'ı **sıfırdan**, mobile-first bir ürün olarak React Native + Expo üzerinde inşa etmek.
> Web uygulaması (`quizup-final/`) **sadece feature ve UX referansı**dır — kod taşıma yok, mimari/yığın yeniden seçiliyor.
>
> **Build türü:** Expo **Dev Build** (Expo Go değil — native modüller gerekli)
> **IDE:** Google **Antigravity**
> **AI Asistan:** **Claude Opus 4.7**
> **Hedef Platformlar:** iOS 15+, Android 8+ (API 26+)
> **Tarih:** 2026-05-29

---

## 0. Felsefe

- **Mobile-first**: ekranlar küçük cihaz için tasarlanır, tablete genişler. Web'in birebir kopyası DEĞİL.
- **Greenfield**: yeni repo, yeni mimari, yeni stil sistemi. Sadece **veri modeli + Supabase backend** ortak.
- **Tek kaynak gerçek**: Supabase (DB + Auth + Storage + Edge Functions + Realtime).
- **TypeScript strict**, **feature-first** klasörleme, **server state ≠ client state** ayrımı.
- **Offline-aware**: quiz oynatma ağsız da çalışır, sonradan senkronlar.

---

## 1. Yeni Repo

```
quizup-mobile/                 # quizup-final ile ilgisi YOK, ayrı git repo
```

Web reposu (`quizup-final/`) yalnızca:
- Veri modeli / Supabase şema referansı
- Mevcut RLS politikaları
- Domain dili (test, attempt, suggestion, manager, vb.)
- UX akış referansı (ekran görüntüleri, kullanıcı yolculukları)

için açılır. **Hiçbir kod kopyalanmaz.**

---

## 2. Teknoloji Yığını (Karar Verilmiş)

### 2.1 Çekirdek
| Amaç | Paket | Not |
|---|---|---|
| Framework | **Expo SDK 52+** | Managed workflow + Dev Client |
| RN | **React Native 0.76+** | New Architecture (Fabric + TurboModules) açık |
| Router | **expo-router v4** | File-based, type-safe routes |
| Dil | **TypeScript 5.6+** | `strict: true` |
| Node | 20 LTS | EAS uyumlu |

### 2.2 UI / Stil
| Amaç | Paket |
|---|---|
| Stil sistemi | **NativeWind v4** (Tailwind for RN) |
| Tema/tokens | `tailwind.config.ts` + `src/theme/tokens.ts` |
| Animasyon | **react-native-reanimated v3** |
| Gesture | `react-native-gesture-handler` |
| Bottom sheet | `@gorhom/bottom-sheet v5` |
| Liste perf | **`@shopify/flash-list`** |
| Görsel | **`expo-image`** (cache + perf) |
| SVG | `react-native-svg` + `react-native-svg-transformer` |
| İkon | `lucide-react-native` + `@expo/vector-icons` |
| Gradient/Blur | `expo-linear-gradient`, `expo-blur` |
| Toast | `react-native-toast-message` |

### 2.3 Veri & State
| Amaç | Paket |
|---|---|
| Backend SDK | `@supabase/supabase-js` v2 |
| Session storage | `@react-native-async-storage/async-storage` |
| Hassas storage | **`expo-secure-store`** (token, biyometrik kilit) |
| Server state | **`@tanstack/react-query v5`** |
| Offline cache | `@tanstack/react-query-persist-client` + `query-async-storage-persister` |
| Client state | **`zustand v5`** |
| Form | `react-hook-form v7` + `zod` + `@hookform/resolvers` |

### 2.4 Cihaz Yetenekleri
| İhtiyaç | Paket |
|---|---|
| Kamera (QR oku) | `expo-camera` |
| QR üret | `react-native-qrcode-svg` |
| Harita | `react-native-maps` |
| Konum | `expo-location` |
| PDF üret | `expo-print` + `expo-sharing` |
| Dosya / Image | `expo-file-system`, `expo-image-picker`, `expo-document-picker` |
| Push | `expo-notifications` + `expo-device` |
| Haptic | `expo-haptics` |
| Biyometrik | `expo-local-authentication` |
| Network | `@react-native-community/netinfo` |
| Deep link | `expo-linking` |
| OTA | `expo-updates` |

### 2.5 Gözlem & Kalite
- `@sentry/react-native` — crash + performans
- `posthog-react-native` — analytics (opsiyonel)
- `jest` + `jest-expo` + `@testing-library/react-native`
- `detox` (E2E, Sprint 4+)
- `eslint-config-expo`, `prettier`, `husky`, `lint-staged`, `commitlint`

### 2.6 i18n
- `i18next` + `react-i18next` + `expo-localization` — TR/EN'den başla.

---

## 3. Hedef Klasör Yapısı

```
quizup-mobile/
├── app/                            # expo-router (sadece route iskeleti)
│   ├── _layout.tsx                 # Providers (Query, Theme, Auth, Toast, GestureHandler)
│   ├── index.tsx                   # Bootstrap → auth'a göre redirect
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── open-session.tsx
│   │   └── reset-password.tsx
│   ├── (app)/
│   │   ├── _layout.tsx             # Bottom tabs
│   │   ├── home/index.tsx          # Ana Sayfa (KPI + hızlı eylemler)
│   │   ├── tests/
│   │   │   ├── index.tsx           # Test listesi
│   │   │   ├── [id].tsx            # Test detay / başlat
│   │   │   └── play/[attemptId].tsx# Quiz oynatıcı
│   │   ├── results/[attemptId].tsx
│   │   ├── profile/index.tsx
│   │   └── admin/                  # Rol-gated stack
│   │       ├── _layout.tsx
│   │       ├── users.tsx
│   │       ├── companies.tsx
│   │       └── questions/...
│   └── +not-found.tsx
├── src/
│   ├── api/                        # Supabase facade — tek erişim noktası
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── tests.ts
│   │   ├── attempts.ts
│   │   ├── questions.ts
│   │   ├── suggestions.ts
│   │   ├── admin.ts                # edge function çağrıları
│   │   └── realtime.ts
│   ├── features/                   # Domain ekranları (UI + hook + state)
│   │   ├── auth/
│   │   ├── home/
│   │   ├── quiz/                   # quiz oynatma + offline kuyruk
│   │   ├── tests/
│   │   ├── results/
│   │   ├── admin/
│   │   └── suggestions/
│   ├── components/ui/              # Button, Card, Input, KPI, Badge, Skeleton...
│   ├── hooks/                      # useAuth, useNetwork, useQuizSession...
│   ├── providers/                  # AuthProvider, ThemeProvider, ToastProvider
│   ├── store/                      # Zustand slice'ları
│   │   ├── auth.store.ts
│   │   ├── quiz.store.ts
│   │   └── ui.store.ts
│   ├── lib/
│   │   ├── secureStorage.ts
│   │   ├── notifications.ts
│   │   ├── analytics.ts
│   │   ├── logger.ts
│   │   └── queryClient.ts
│   ├── theme/                      # tokens + tipografi
│   ├── i18n/                       # tr.json, en.json, index.ts
│   ├── types/
│   │   ├── database.ts             # `supabase gen types` çıktısı
│   │   └── domain.ts
│   └── utils/
├── assets/                         # fontlar, ikonlar, lottie, sesler
├── e2e/                            # detox (sonra)
├── app.config.ts                   # Dinamik Expo config
├── eas.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.ts
├── nativewind-env.d.ts
├── tsconfig.json
├── .env.development
├── .env.staging
├── .env.production
└── package.json
```

### Mimari kuralları
- **`app/` ince**: route + layout. İş mantığı `src/features/`'da.
- **Veriye yalnız `src/api/` üzerinden erişim** — bileşen içinde `supabase.from(...)` yasak.
- **Server state → React Query**, **client state → Zustand**.
- **Tek `<provider>` ağacı** `app/_layout.tsx`'da kurulur.
- **`features/<x>/` self-contained**: o feature'ın hook'u, store'u, UI'ı.

---

## 4. Backend Stratejisi

### 4.1 Aynı Supabase projesi mi, yeni mi?
**Karar (önerilen):** Aynı Supabase projesi — DB + RLS + Storage + Edge Functions paylaşılır.
- Web ve mobile **iki ayrı client**, **tek backend**.
- Yeni mobil-spesifik tablolar:
  - `push_tokens (user_id, expo_token, platform, updated_at)`
  - `mobile_sessions (open session metaverisi, varsa)`
  - `app_releases (min_supported_version, force_update)` — force-update gate

### 4.2 Edge Functions (yeni)
- `mobile-bootstrap` — soğuk açılışta tek istek: kullanıcı + rol + tenant + feature flags + min sürüm.
- `register-push-token` — Expo push token kaydet.
- `submit-attempt` — sunucuda skor hesapla (cheat-proof).
- (Mevcut `admin-users` yeniden kullanılır.)

### 4.3 RLS
- Web'deki politikalar baz alınır; "Açık Oturum" için JWT claim üzerinden kontrol.
- Mobil bootstrap çağrısı için authenticated rol kontrolü.

### 4.4 Realtime
- Canlı quiz, lider tablosu, manager dashboard sayaçları.

### 4.5 Tip üretimi
```bash
npm run gen:types
# supabase gen types typescript --project-id <id> > src/types/database.ts
```

### 4.6 Güvenlik
- `SUPABASE_SERVICE_ROLE_KEY` **asla** mobilde değil — sadece edge function'da.
- Anon key `app.config.ts` extra'sında, derleme zamanında embed.
- Hassas alanlar (örn. biyometrik flag, refresh token) **SecureStore**'da.

---

## 5. Ekran Listesi (MVP)

| Bölüm | Ekran | Notlar |
|---|---|---|
| Auth | Login, Açık Oturum, Reset Password | Deep link: `quizup://reset?token=…` |
| Onboarding | 3 adım slider | Sadece ilk açılış |
| Home | Ana Sayfa | KPI kartları (count-up), aktif testler, son sonuçlar, hızlı QR start |
| Tests | Test listesi + arama + filtre | FlashList + skeleton |
| Tests | Test detay | Süre, soru sayısı, başla CTA |
| Quiz | Oynatıcı | 1/N sayacı, süre, haptik, offline kuyruk |
| Quiz | Sonuç | Skor, doğru/yanlış, PDF paylaş |
| Profile | Profil | Tema, dil, biyometrik kilit, çıkış |
| Suggest | Soru öner / önerilen sorular | Görsel upload (image-picker) |
| Admin | Kullanıcı yönetimi | Rol-gated, kart liste |
| Admin | Şirket yönetimi | |
| Admin | Soru/test yönetimi | |
| Misc | Konum haritası | `react-native-maps` |
| Misc | QR tarayıcı | `expo-camera` |

---

## 6. Quiz Oynatıcısı — Kritik Tasarım

- **State**: `quiz.store.ts` (Zustand) — `{ attemptId, questionIdx, answers, startedAt, deadline }`.
- **Persist**: MMKV/AsyncStorage'a yaz — uygulama kapanırsa devam edebilsin.
- **Offline cevap kuyruğu**: cevap → local queue → ağ varsa `submit-attempt` edge function'a flush.
- **Süre**: `useDeadlineTimer` hook'u + her saniye reanimated worklet ile progress.
- **Bitiş**: süre/son soru → `finalize` mutation → sonuç ekranı.
- **Anti-cheat**: skor sunucuda hesaplanır; client sadece cevap gönderir.

---

## 7. Dev Build (Expo Dev Client) Akışı

> Expo Go yeterli değil — `react-native-maps`, push, secure-store, sentry vb. gerektirir.

### 7.1 Kurulum
```bash
npx create-expo-app quizup-mobile -t expo-template-blank-typescript
cd quizup-mobile
npx expo install expo-dev-client expo-router react-native-safe-area-context react-native-screens
npx expo install nativewind tailwindcss
# ... (Bkz. §11 package.json)
```

### 7.2 EAS Yapılandırma
```bash
npm i -g eas-cli
eas login
eas init        # Project ID
eas build:configure
```

`eas.json`:
```json
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" },
      "env": { "APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": { "APP_ENV": "production" }
    }
  },
  "submit": { "production": {} }
}
```

### 7.3 İlk Build
```bash
# iOS Simulator
eas build --profile development --platform ios

# Android cihaz/emulator
eas build --profile development --platform android

# Geliştirme sunucusu
npx expo start --dev-client
```

### 7.4 OTA Update
- JS-only değişiklik: `eas update --branch preview`
- Native değişiklik: yeni dev build şart.

---

## 8. `app.config.ts` Taslağı

```ts
import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'development';

const config: ExpoConfig = {
  name: APP_ENV === 'production' ? 'QuizUp' : `QuizUp (${APP_ENV})`,
  slug: 'quizup-mobile',
  scheme: 'quizup',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: { image: './assets/splash.png', resizeMode: 'cover', backgroundColor: '#0B0B0F' },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: APP_ENV === 'production' ? 'com.quizup.app' : `com.quizup.app.${APP_ENV}`,
    supportsTablet: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: APP_ENV === 'production' ? 'com.quizup.app' : `com.quizup.app.${APP_ENV}`,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#0B0B0F' },
    permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-notifications', { icon: './assets/notification-icon.png' }],
    ['expo-camera', { cameraPermission: 'QR kod okumak için kamera izni gerekli.' }],
    ['expo-location', { locationWhenInUsePermission: 'Konum tabanlı özellikler için.' }],
    ['expo-image-picker', { photosPermission: 'Görsel seçmek için fotoğraf izni gerekli.' }],
    ['@sentry/react-native/expo', { organization: 'quizup', project: 'mobile' }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    sentryDsn: process.env.SENTRY_DSN,
    appEnv: APP_ENV,
    eas: { projectId: 'YOUR_EAS_PROJECT_ID' },
  },
  updates: { url: 'https://u.expo.dev/YOUR_EAS_PROJECT_ID' },
  runtimeVersion: { policy: 'appVersion' },
};

export default config;
```

---

## 9. `package.json` Taslağı

```json
{
  "name": "quizup-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start --dev-client",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "build:dev:ios": "eas build --profile development --platform ios",
    "build:dev:android": "eas build --profile development --platform android",
    "build:preview": "eas build --profile preview --platform all",
    "update:preview": "eas update --branch preview",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "gen:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.ts",
    "prepare": "husky"
  },
  "dependencies": {
    "expo": "^52.0.0",
    "expo-router": "^4.0.0",
    "expo-dev-client": "^5.0.0",
    "expo-secure-store": "^14.0.0",
    "expo-notifications": "^0.29.0",
    "expo-camera": "^16.0.0",
    "expo-location": "^18.0.0",
    "expo-print": "^14.0.0",
    "expo-sharing": "^13.0.0",
    "expo-image": "^2.0.0",
    "expo-image-picker": "^16.0.0",
    "expo-document-picker": "^13.0.0",
    "expo-file-system": "^18.0.0",
    "expo-haptics": "^14.0.0",
    "expo-linking": "^7.0.0",
    "expo-localization": "^16.0.0",
    "expo-status-bar": "^2.0.0",
    "expo-splash-screen": "^0.29.0",
    "expo-font": "^13.0.0",
    "expo-updates": "^0.26.0",
    "expo-blur": "^14.0.0",
    "expo-linear-gradient": "^14.0.0",
    "expo-local-authentication": "^15.0.0",
    "expo-application": "^6.0.0",
    "expo-device": "^7.0.0",
    "expo-constants": "^17.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-reanimated": "^3.16.0",
    "react-native-gesture-handler": "^2.20.0",
    "react-native-screens": "^4.0.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-svg": "^15.8.0",
    "react-native-url-polyfill": "^2.0.0",
    "react-native-maps": "^1.18.0",
    "react-native-qrcode-svg": "^6.3.0",
    "react-native-gifted-charts": "^1.4.0",
    "react-native-toast-message": "^2.2.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "@react-native-community/netinfo": "^11.4.0",
    "@gorhom/bottom-sheet": "^5.0.0",
    "@shopify/flash-list": "^1.7.0",
    "@supabase/supabase-js": "^2.45.0",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-query-persist-client": "^5.59.0",
    "@tanstack/query-async-storage-persister": "^5.59.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.0",
    "i18next": "^23.16.0",
    "react-i18next": "^15.1.0",
    "lucide-react-native": "^0.460.0",
    "@sentry/react-native": "^6.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.0",
    "typescript": "~5.6.0",
    "eslint": "^9.0.0",
    "eslint-config-expo": "^8.0.0",
    "prettier": "^3.3.0",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    "@testing-library/react-native": "^12.8.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0"
  }
}
```

---

## 10. Antigravity IDE + Claude Opus 4.7 Kurulumu

### 10.1 Workspace
- `quizup-mobile/` ana workspace.
- `quizup-final/` ikinci pencere, **read-only referans** (UX + backend şema).

### 10.2 Mobile repo'ya `AGENTS.md` ekle
İçeriği — Claude'a verilecek kurallar:
```
- Default model: claude-opus-4-7
- Stack: Expo SDK 52+, RN 0.76+ (New Arch), expo-router v4, TypeScript strict.
- Stil: yalnız NativeWind class'ları; inline style sadece dinamik değer için.
- Veri erişimi: yalnız `src/api/` facade'ı üzerinden — bileşende `supabase.from(...)` yasak.
- Server state: TanStack Query. Client state: Zustand. Form: react-hook-form + zod.
- Yeni native modül eklemeden ÖNCE sor (dev build gerekecek).
- `any` yasak. Edge case'lerde `unknown` + zod parse.
- Liste = FlashList. Görsel = expo-image. İkon = lucide-react-native.
- Web reposundan kod KOPYALAMA — sadece UX referansı al.
- Her PR: typecheck + lint + test geçmeli.
```

### 10.3 MCP & araçlar
- Supabase MCP (read-only başlangıçta; schema/log/ tablolar için).
- Filesystem + Git MCP.

### 10.4 Bağlam dosyaları (Claude için)
- `MOBILE_APP_PLAN.md` (bu dosya)
- `docs/SCREENS.md` — her ekranın amacı, state'i, API çağrıları
- `docs/DATA_MODEL.md` — Supabase tablo + RLS özet
- `src/types/database.ts` (generated)

---

## 11. Yol Haritası

### Sprint 0 — Kurulum (3 gün)
- [ ] `npx create-expo-app quizup-mobile -t expo-template-blank-typescript`
- [ ] expo-router + dev-client + NativeWind + Reanimated kurulumu
- [ ] Theme tokens + dark/light
- [ ] EAS init + ilk dev build (iOS sim + Android cihaz)
- [ ] Supabase client + AsyncStorage + auth bridge
- [ ] CI: GitHub Actions → lint + typecheck + preview EAS build (PR'larda)

### Sprint 1 — Auth & Shell (1 hafta)
- [ ] Login, Açık Oturum, Reset Password (deep link)
- [ ] AuthProvider + Zustand auth store + React Query setup
- [ ] Bottom tabs (Home / Tests / Profile) + role-gated admin stack
- [ ] Splash, fontlar, ikon set, status bar, onboarding (3 adım)

### Sprint 2 — Çekirdek Quiz Akışı (1.5 hafta)
- [ ] Tests listesi + arama/filtre (FlashList)
- [ ] Test detay → Başla
- [ ] Quiz oynatıcı + offline kuyruk + persist
- [ ] `submit-attempt` edge function entegrasyonu
- [ ] Sonuç ekranı + PDF (`expo-print`) + paylaş

### Sprint 3 — İçerik & Yönetim (1.5 hafta)
- [ ] Suggest Question (form + image upload → Supabase Storage)
- [ ] Suggested Questions listesi
- [ ] Admin: kullanıcı yönetimi, şirket yönetimi (mobile uyumlu liste + bottom sheet filtreler)
- [ ] Soru/test yönetimi (CRUD)

### Sprint 4 — Cilalama (1 hafta)
- [ ] Push notifications + `register-push-token`
- [ ] Realtime canlı skor / lider tablosu
- [ ] i18n TR/EN tamam
- [ ] Sentry + analytics
- [ ] Erişilebilirlik (a11y) geçişi
- [ ] Performans audit (FlashList tuning, image cache)

### Sprint 5 — Store Hazırlığı (1 hafta)
- [ ] App icon, splash, store görselleri
- [ ] iOS Privacy Manifest (PrivacyInfo.xcprivacy) + Google Data Safety
- [ ] TestFlight + Play Internal Testing
- [ ] EAS Submit pipeline + force-update gate

**Toplam tahmin:** ~6 hafta tek geliştirici + Claude Opus 4.7.

---

## 12. Risk & Karar Notları

| Risk | Etki | Önlem |
|---|---|---|
| New Architecture'da bazı 3rd-party paket sorunları | Orta | Sentry/Maps/Bottom Sheet'in NewArch desteğini sprint 0'da doğrula |
| Realtime + offline çakışması | Yüksek | Mutation kuyruğu + conflict resolution stratejisi (last-write-wins kabul edilebilir) |
| iOS APNs sertifikası | Orta | EAS Credentials Manager kullan |
| Anti-cheat | Yüksek | Skor hesabı sunucuda; client cevap ham gönderir |
| App Store reddi (anti-cheat / privacy) | Orta | Privacy manifest + açık veri toplama beyanı |
| Antigravity context limiti | Düşük | Her feature ayrı PR; `AGENTS.md` + `docs/` küçük tutulur |

---

## 13. Çevre Değişkenleri

`.env.development` / `.env.staging` / `.env.production`:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_PROJECT_ID=
SENTRY_DSN=
APP_ENV=development
```

EAS Secret'lar `eas secret:create` ile yönetilir (production env değerleri).

---

## 14. Definition of Done (MVP)

- [ ] iOS & Android dev build cihazda çalışıyor
- [ ] Auth (login + open session + reset) tam
- [ ] Tests listesi → Quiz → Sonuç (+PDF) end-to-end
- [ ] Offline cevap kuyruğu test edildi
- [ ] Push notification en az 1 senaryo
- [ ] Admin temel CRUD ekranları
- [ ] Sentry'de test crash görüldü
- [ ] TestFlight + Play Internal Testing yüklemesi yapıldı
- [ ] i18n TR/EN + dark/light + a11y temel geçer

---

## 15. Hemen Yapılacaklar Sırası

1. **Apple Developer + Google Play Console** hesaplarını hazırla (sertifikaları EAS yönetir).
2. **Expo + EAS hesabı** aç (`expo.dev`).
3. **Yeni boş GitHub repo** oluştur: `quizup-mobile`.
4. Bu dosyayı yeni repo'ya kopyala: `quizup-mobile/MOBILE_APP_PLAN.md`.
5. Yeni repo'ya `AGENTS.md` ekle (§10.2).
6. Sprint 0 başla → Claude Opus 4.7 ile adım adım.
7. Supabase'de mobil-spesifik tabloları (`push_tokens`, `app_releases`) ekle.
8. `mobile-bootstrap` ve `submit-attempt` edge function'larını yaz.

---

*Bu plan yaşayan bir dokümandır. Her sprint sonunda güncellenir.*
