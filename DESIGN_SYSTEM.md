# 🎨 QuizUp+ Design System

QuizUp+ projesinde kullanılan tüm UI/UX tasarım elementlerinin detaylı referans kılavuzu.

---

## 📋 İçindekiler

1. [Renk Paleti](#-renk-paleti)
2. [Tipografi](#-tipografi)
3. [Spacing & Sizing](#-spacing--sizing)
4. [Border Radius](#-border-radius)
5. [Shadows (Gölgeler)](#-shadows-gölgeler)
6. [Animasyonlar](#-animasyonlar)
7. [Butonlar](#-butonlar)
8. [Form Elementleri](#-form-elementleri)
9. [Kartlar](#-kartlar)
10. [Chip/Badge Componentleri](#-chipbadge-componentleri)
11. [İkonlar ve Emojiler](#-ikonlar-ve-emojiler)
12. [Toast Notifications](#-toast-notifications)
13. [Modal/Overlay](#-modaloverlay)
14. [Sidebar Navigation](#-sidebar-navigation)
15. [Special Components](#-special-components)

---

## 🎨 Renk Paleti

### Primary Colors (Ana Renk - Turuncu/Kırmızı)
**Kullanım:** Ana butonlar, logolar, vurgular, aktif linkler

| Ton | Hex Code | Kullanım Alanı |
|-----|----------|----------------|
| primary-50 | `#FFF5F2` | Arka plan hover |
| primary-100 | `#FFE8E0` | Hafif arka plan |
| primary-200 | `#FFD1C1` | Border hover |
| primary-300 | `#FFB5A0` | Seçili border |
| primary-400 | `#FF8D75` | Gradient başlangıç |
| **primary-500** | **`#FF6B4A`** | **Ana Marka Rengi** |
| primary-600 | `#E84A28` | Gradient bitiş |
| primary-700 | `#C23818` | Koyu hover |
| primary-800 | `#9D2A0F` | Çok koyu metin |
| primary-900 | `#7A1F08` | En koyu ton |

**Gradient:**
```css
background: linear-gradient(135deg, #FF6B4A 0%, #E84A28 100%);
```

**Kullanıldığı Yerler:**
- ✅ Ana butonlar (btn-primary)
- ✅ Logo arka planı
- ✅ Active sidebar link
- ✅ Focus border (form field)
- ✅ Loading spinner
- ✅ Theme color (meta tag)

---

### Secondary Colors (İkincil Renk - Mavi/Deniz Mavisi)
**Kullanım:** İkincil butonlar, alternatif vurgular, bilgi kartları

| Ton | Hex Code | Kullanım Alanı |
|-----|----------|----------------|
| secondary-50 | `#F0F7F9` | Hafif arka plan |
| secondary-100 | `#D9EDF2` | Chip arka plan |
| secondary-200 | `#B3DBE5` | - |
| secondary-300 | `#8DC9D8` | - |
| secondary-400 | `#67B5CB` | - |
| **secondary-500** | **`#4A90A4`** | **Ana İkincil Renk** |
| secondary-600 | `#3A7383` | Gradient bitiş |
| secondary-700 | `#2B5662` | Koyu metin |
| secondary-800 | `#1D3A42` | - |
| secondary-900 | `#0F1F24` | - |

**Gradient:**
```css
background: linear-gradient(135deg, #4A90A4 0%, #3A7383 100%);
```

**Kullanıldığı Yerler:**
- ✅ İkincil butonlar (btn-secondary)
- ✅ Info chip'leri
- ✅ Landing page gradient arka plan
- ✅ Timer ring rengi

---

### Accent Colors (Vurgu Rengi - Turkuaz/Yeşil)
**Kullanım:** Başarı mesajları, doğru cevaplar, pozitif aksiyonlar

| Ton | Hex Code | Kullanım Alanı |
|-----|----------|----------------|
| accent-50 | `#F0FDFB` | Başarı arka plan |
| accent-100 | `#CCFBF1` | Chip arka plan |
| accent-200 | `#99F6E4` | - |
| accent-300 | `#5EDFD1` | Next button gradient |
| accent-400 | `#5EC5B6` | Submit button |
| **accent-500** | **`#3DA89C`** | **Ana Vurgu Rengi** |
| accent-600 | `#2D8A7F` | Koyu gradient |
| accent-700 | `#1F6B63` | Çok koyu metin |
| accent-800 | `#134E49` | - |
| accent-900 | `#0A3330` | - |

**Gradient:**
```css
/* Next Button */
background: linear-gradient(135deg, #5EDFD1 0%, #5EC5B6 100%);

/* Submit Button */
background: linear-gradient(135deg, #5EC5B6 0%, #3DA89C 100%);

/* Toggle Switch Active */
background: linear-gradient(135deg, #5EC5B6 0%, #3DA89C 100%);
```

**Kullanıldığı Yerler:**
- ✅ Success toast
- ✅ Doğru cevap border/background
- ✅ Toggle switch (aktif)
- ✅ "Next" ve "Submit" butonları
- ✅ Success chip

---

### Dark/Neutral Colors (Nötr Renkler)
**Kullanım:** Metinler, border'lar, arka planlar

| Ton | Hex Code | Kullanım Alanı |
|-----|----------|----------------|
| dark-50 | `#E8EAED` | Hafif border |
| dark-100 | `#D1D5DA` | Border default |
| dark-200 | `#A3ABB5` | Pasif border |
| dark-300 | `#758190` | İkincil metin |
| dark-400 | `#47576B` | Normal metin |
| **dark-500** | **`#1A2332`** | **Ana Metin Rengi** |
| dark-600 | `#151C28` | - |
| dark-700 | `#10151E` | - |
| dark-800 | `#0B0E14` | - |
| dark-900 | `#06070A` | En koyu siyah |

**Kullanıldığı Yerler:**
- ✅ Body text (dark-500)
- ✅ Sidebar arka plan (dark-500)
- ✅ Border default (dark-100: `#d1d5db`)
- ✅ Placeholder text (dark-400)

---

### System Colors (Sistem Renkleri)
| Renk | Hex Code | Kullanım |
|------|----------|----------|
| **Error/Danger** | `#dc2626` | Hata mesajları, sil butonları |
| **Success** | `#5EC5B6` | Başarı mesajları |
| **Warning** | `#FF6B4A` | Uyarı mesajları (primary ile aynı) |
| **Info** | `#4A90A4` | Bilgi mesajları (secondary ile aynı) |
| **Background** | `#F9FAFB` | Ana arka plan |
| **White** | `#FFFFFF` | Kartlar, modaller |
| **Gray-50** | `#f3f4f6` | Ghost button arka plan |
| **Gray-100** | `#e5e7eb` | Border, hover states |

---

## 📝 Tipografi

### Font Family
```css
font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

**CDN:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
```

**Font Weights:**
- **400** - Normal (body text)
- **500** - Medium (cards, labels)
- **600** - Semibold (headings, buttons)
- **700** - Bold (titles, KPI numbers)
- **800** - Extrabold (logo)
- **900** - Black (nadiren kullanılır)

---

### Tipografi Hierarchy

| Element | Font Size | Font Weight | Line Height | Letter Spacing | Kullanım |
|---------|-----------|-------------|-------------|----------------|----------|
| **Hero Title** | `3rem` (48px) | 800 | 1.1 | -0.02em | Landing page başlık |
| **Dashboard Title** | `2.25rem` (36px) | 700 | 1.2 | -0.02em | Dashboard başlıklar |
| **Page Title (h1)** | `1.875rem` (30px) | 700 | 1.3 | -0.01em | Sayfa başlıkları |
| **Section Title (h2)** | `1.5rem` (24px) | 700 | 1.4 | -0.01em | Section başlıkları |
| **Subsection Title (h3)** | `1.25rem` (20px) | 600 | 1.4 | normal | Alt başlıklar |
| **KPI Number** | `2rem` (32px) | 700 | 1 | -0.01em | Dashboard KPI'ları |
| **Body Large** | `1.125rem` (18px) | 400 | 1.6 | normal | Büyük metin |
| **Body** | `1rem` (16px) | 400 | 1.6 | normal | Normal metin |
| **Body Small** | `0.95rem` (15.2px) | 400 | 1.5 | normal | Form field text |
| **Caption** | `0.875rem` (14px) | 500 | 1.5 | normal | Küçük açıklamalar |
| **Label** | `0.875rem` (14px) | 600 | 1.4 | normal | Form labels |
| **Small** | `0.8rem` (12.8px) | 600 | 1.4 | normal | Chip text |
| **Extra Small** | `0.75rem` (12px) | 600 | 1.3 | 0.04em | Uppercase labels |

**CSS Class Örnekleri:**
```css
/* Hero Title */
.hero-title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

/* Dashboard Title */
.dashboard-title {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Page Component Title */
.text-3xl {
  font-size: 1.875rem; /* 30px */
  font-weight: 700;
}
```

---

## 📏 Spacing & Sizing

### Padding Scale (Tailwind)
| Class | Value | Kullanım |
|-------|-------|----------|
| `p-1` | 4px | Minimal padding |
| `p-2` | 8px | Çok küçük padding |
| `p-3` | 12px | Küçük padding |
| `p-4` | 16px | **Standard padding** |
| `p-6` | 24px | Orta padding |
| `p-8` | 32px | Büyük padding (cards) |

### Margin/Gap Scale
| Class | Value | Kullanım |
|-------|-------|----------|
| `gap-2` | 8px | Çok küçük gap |
| `gap-3` | 12px | Küçük gap |
| `gap-4` | 16px | **Standard gap** |
| `gap-6` | 24px | Orta gap |
| `gap-8` | 32px | Büyük gap |

### Component Specific Sizing

| Component | Padding | Kullanım |
|-----------|---------|----------|
| **Button** | `12px 24px` (0.75rem 1.5rem) | Standard buton |
| **Form Field** | `14px 16px` (0.875rem 1rem) | Input/select |
| **Card** | `32px` | Kart içi boşluk |
| **Modal** | `32px 26px 24px` | Modal padding |
| **Chip** | `6px 14px` (0.375rem 0.875rem) | Chip padding |
| **Toast** | `14px 18px` | Toast notification |

---

## 🔲 Border Radius

| Değer | CSS | Tailwind Class | Kullanım |
|-------|-----|----------------|----------|
| **8px** | `border-radius: 8px` | `rounded-lg` | Logo icon inner |
| **12px** | `border-radius: 12px` | `rounded-xl` | **Standard** - Butonlar, form field, option card |
| **14px** | `border-radius: 14px` | - | Question bank options |
| **16px** | `border-radius: 16px` | `rounded-xl2` | **Kartlar, modaller** |
| **18px** | `border-radius: 18px` | - | Skip confirm modal |
| **20px** | `border-radius: 20px` | `rounded-xl3` | Büyük kartlar |
| **24px** | `border-radius: 24px` | `rounded-3xl` | Glassmorphism card, toggle slider |
| **999px** | `border-radius: 999px` | `rounded-full` | **Pill** - Chip, circular buttons |

**Örnek Kullanımlar:**
```css
/* Buton */
.btn { border-radius: 12px; }

/* Kart */
.card { border-radius: 16px; }

/* Chip/Badge */
.chip { border-radius: 999px; }

/* Form Field */
.field { border-radius: 12px; }
```

---

## 🌑 Shadows (Gölgeler)

### Tailwind Custom Shadows

| Shadow Name | CSS Value | Kullanım |
|-------------|-----------|----------|
| **card** | `0 4px 16px rgba(0,0,0,0.08)` | Kart hover gölgesi |
| **pill** | `0 8px 24px rgba(255,107,74,0.25)` | Primary button gölgesi |
| **glow** | `0 0 20px rgba(255,107,74,0.3)` | Glow efekti |

### Component Shadows

| Component | Default Shadow | Hover Shadow |
|-----------|----------------|--------------|
| **Card** | `0 4px 16px rgba(0,0,0,0.08)` | `0 4px 12px rgba(0,0,0,.08)` |
| **Primary Button** | `0 2px 8px rgba(255,107,74,0.25)` | `0 4px 12px rgba(255,107,74,0.35)` |
| **Secondary Button** | `0 2px 8px rgba(74,144,164,0.25)` | `0 4px 12px rgba(74,144,164,0.35)` |
| **Toast** | `0 8px 24px rgba(0,0,0,0.15)` | - |
| **Modal** | `0 20px 60px rgba(0,0,0,0.3)` | - |
| **Sidebar** | `4px 0 24px rgba(0,0,0,0.15)` | - |
| **User Initials** | `0 10px 25px rgba(255, 107, 74, 0.25)` | - |
| **Nav Pill** | `0 4px 12px rgba(0,0,0,0.1)` | `0 6px 20px rgba(...)` |

**Örnek:**
```css
/* Primary Button */
.btn-primary {
  box-shadow: 0 2px 8px rgba(255,107,74,0.25);
}

.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(255,107,74,0.35);
}
```

---

## ✨ Animasyonlar

### Tailwind Custom Animations

| Animation Name | Duration | Easing | Kullanım |
|----------------|----------|--------|----------|
| **fade-in** | 0.3s | ease-in | Sayfa/modal açılış |
| **slide-up** | 0.4s | ease-out | Hero elementleri |
| **bounce-soft** | 0.6s | ease-in-out | Floating elementler |

### Keyframes

#### 1. Fade In
```css
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

#### 2. Slide Up
```css
@keyframes slideUp {
  0% {
    transform: translateY(20px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
```

#### 3. Bounce Soft
```css
@keyframes bounceSoft {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

#### 4. Shake (Timer Warning)
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}
```

#### 5. Red Flash (Timer Warning)
```css
@keyframes redFlash {
  0%, 100% { background-color: white; }
  50% { background-color: rgba(220, 38, 38, 0.15); }
}
```

#### 6. Pulse
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

#### 7. Timer Ending
```css
@keyframes timer-ending {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(0.92);
  }
}
```

#### 8. Toast Slide In
```css
@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

#### 9. Progress Bar
```css
@keyframes progress {
  from { width: 100%; }
  to { width: 0%; }
}
```

### Animation Classes

| Class | Animation | Kullanım |
|-------|-----------|----------|
| `.animate-fade-in` | fadeIn 0.3s | Genel fade in |
| `.animate-slide-up` | slideUp 0.4s | Hero elements |
| `.animate-bounce-soft` | bounceSoft 0.6s infinite | Floating circles |
| `.shake` | shake 0.5s | Timer warning |
| `.red-flash` | redFlash 0.3s | Timer danger |
| `.pulse-warning` | pulse 1s infinite | Timer < 10s |
| `.pulse-danger` | pulse 0.5s infinite | Timer < 5s |

---

## 🔘 Butonlar

### 1. Primary Button
**Kullanım:** Ana aksiyonlar (Giriş yap, Kaydet, Oluştur)

```css
.btn-primary {
  background: linear-gradient(135deg, #FF6B4A 0%, #E84A28 100%);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255,107,74,0.25);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #E84A28 0%, #C23818 100%);
  box-shadow: 0 4px 12px rgba(255,107,74,0.35);
}
```

**Renk:** Primary gradient (turuncu-kırmızı)
**Font Size:** 16px
**Font Weight:** 600
**Padding:** 12px 24px

---

### 2. Secondary Button
**Kullanım:** İkincil aksiyonlar

```css
.btn-secondary {
  background: linear-gradient(135deg, #4A90A4 0%, #3A7383 100%);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(74,144,164,0.25);
}
```

**Renk:** Secondary gradient (mavi)
**Diğer özellikler:** Primary ile aynı

---

### 3. Ghost Button
**Kullanım:** İptal, geri dön gibi pasif aksiyonlar

```css
.btn-ghost {
  background: #f3f4f6;
  color: #1A2332;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
}

.btn-ghost:hover {
  background: #e5e7eb;
}
```

**Renk:** Gray-50 → Gray-100 (hover)
**Text Color:** dark-500

---

### 4. Danger Button
**Kullanım:** Silme, iptal gibi tehlikeli aksiyonlar

```css
.btn-danger {
  background: #dc2626;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
}

.btn-danger:hover {
  background: #b91c1c;
}
```

**Renk:** Red-600 → Red-700 (hover)

---

### 5. Nav Pill Buttons (Quiz Navigation)

#### Previous Button
```css
.nav-pill-prev {
  background: linear-gradient(135deg, #FF8D75 0%, #FF6B4A 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 999px; /* Pill shape */
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.nav-pill-prev:hover {
  background: linear-gradient(135deg, #FF6B4A 0%, #E84A28 100%);
  box-shadow: 0 6px 20px rgba(255, 107, 74, 0.4);
  transform: translateY(-2px);
}
```

#### Next Button
```css
.nav-pill-next {
  background: linear-gradient(135deg, #5EDFD1 0%, #5EC5B6 100%);
  color: white;
  /* Diğer stil prev ile aynı */
}
```

#### Submit Button
```css
.nav-pill-submit {
  background: linear-gradient(135deg, #5EC5B6 0%, #3DA89C 100%);
  color: white;
  /* Diğer stil prev ile aynı */
}
```

---

### Button States

| State | CSS |
|-------|-----|
| **Disabled** | `opacity: 0.5; cursor: not-allowed;` |
| **Hover** | Transform, shadow change |
| **Active (Click)** | `transform: scale(0.95);` |

---

## 📝 Form Elementleri

### 1. Input/Select Field
```css
.field {
  width: 100%;
  padding: 0.875rem 1rem; /* 14px 16px */
  border: 2px solid #d1d5db; /* dark-100 */
  border-radius: 12px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field:focus {
  border-color: #FF6B4A; /* primary-500 */
  box-shadow: 0 0 0 2px rgba(255,107,74,.15);
}

.field.error {
  border-color: #dc2626; /* red */
}
```

**Default Border:** `#d1d5db` (2px)
**Focus Border:** `#FF6B4A` + shadow
**Error Border:** `#dc2626`
**Padding:** 14px 16px
**Font Size:** 15.2px (0.95rem)

---

### 2. Error Text
```css
.error-text {
  color: #dc2626;
  font-size: 0.875rem; /* 14px */
  margin-top: 0.25rem;
}
```

---

### 3. Toggle Switch
```css
.toggle-switch {
  width: 48px;
  height: 24px;
}

.toggle-slider {
  background-color: #d1d5db; /* Inactive */
  border-radius: 24px;
}

.toggle-slider:before {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background: linear-gradient(135deg, #5EC5B6 0%, #3DA89C 100%);
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}
```

**Inactive:** Gray `#d1d5db`
**Active:** Accent gradient
**Switch Circle:** 18x18px white

---

### 4. Radio/Checkbox
```css
input[type="radio"],
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #FF6B4A; /* Primary */
  cursor: pointer;
}
```

**Accent Color:** Primary `#FF6B4A`
**Size:** 16x16px

---

## 🃏 Kartlar

### 1. Standard Card
```css
.card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s ease;
}

.card.interactive:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
}
```

**Background:** White
**Border:** 1px solid `#e5e7eb`
**Border Radius:** 16px
**Shadow (Hover):** card shadow

---

### 2. Option Card (Quiz)
```css
.option-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px 16px;
  background: #f9fafb;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.option-card:hover {
  border-color: #FFB5A0; /* primary-300 */
  background: #FFF5F2; /* primary-50 */
}

.option-card.selected {
  border-color: #FF6B4A; /* primary-500 */
  background: #FFE8E0; /* primary-100 */
  box-shadow: 0 0 0 2px rgba(255,107,74,0.1);
}
```

**Default:** Gray border, light gray bg
**Hover:** Primary-300 border, primary-50 bg
**Selected:** Primary-500 border, primary-100 bg + shadow

---

### 3. Image Option Card
```css
.image-option-card {
  border: 3px solid #e5e7eb;
  border-radius: 16px;
  padding: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.image-option-card:hover {
  border-color: #FFB5A0;
  transform: scale(1.02);
}

.image-option-card.selected {
  border-color: #FF6B4A;
  box-shadow: 0 0 0 3px rgba(255,107,74,0.2);
}

.image-option-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 8px;
}
```

**Border:** 3px (kalın)
**Hover:** Scale(1.02)
**Image:** 1:1 aspect ratio, cover

---

### 4. Glassmorphism Card
```css
.glass-brand-logo-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 32px;
}
```

**Kullanım:** Branding logo gösterimi
**Backdrop Blur:** 20px
**Border Radius:** 24px

---

## 🏷️ Chip/Badge Componentleri

### 1. Standard Chip
```css
.chip {
  padding: 0.375rem 0.875rem; /* 6px 14px */
  border-radius: 999px;
  font-size: 0.8rem; /* 12.8px */
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}
```

**Padding:** 6px 14px
**Font Size:** 12.8px
**Font Weight:** 600
**Border Radius:** Full (999px)

---

### 2. Colored Chips

| Chip Type | Background | Text Color | Kullanım |
|-----------|------------|------------|----------|
| **Blue** | `#D9EDF2` (secondary-100) | `#2B5662` (secondary-700) | Info, Manager role |
| **Orange** | `#FFE8E0` (primary-100) | `#9D2A0F` (primary-800) | Warning, Category |
| **Green** | `#CCFBF1` (accent-100) | `#134E49` (accent-800) | Success, Tester role |
| **Red** | `#fee2e2` | `#b91c1c` | Error, Admin role |

**Örnekler:**
```css
.chip-blue {
  background: #D9EDF2;
  color: #2B5662;
}

.chip-orange {
  background: #FFE8E0;
  color: #9D2A0F;
}

.chip-green {
  background: #CCFBF1;
  color: #134E49;
}
```

---

### 3. Role Badges
| Role | Emoji | Background | Text Color |
|------|-------|------------|------------|
| **Admin** | 👑 | Red-100 | Red-700 |
| **Manager** | 👔 | Blue-100 | Blue-700 |
| **Tester** | ✏️ | Green-100 | Green-700 |

---

## 🎭 İkonlar ve Emojiler

### Emoji Kullanımı

| Emoji | Anlamı | Kullanıldığı Yerler |
|-------|--------|---------------------|
| **?** | Quiz/Soru | Logo icon (36x36px) |
| **✅** | Başarı/Onay | Doğru cevap işareti |
| **❌** | Hata/Yanlış | Yanlış cevap, kapat |
| **✓** | Onay | Toast success icon |
| **✕** | Kapat | Toast error icon |
| **⚠** | Uyarı | Toast warning icon |
| **ℹ** | Bilgi | Toast info icon |
| **👑** | Admin | Admin role badge |
| **👔** | Manager | Manager role badge |
| **✏️** | Düzenle/Tester | Edit button, Tester role |
| **🗑️** | Sil | Delete button |
| **➕** | Ekle | Add new button |
| **🔒** | Şifre/Güvenlik | Password show/hide |
| **🔓** | Açık/Görünür | Password revealed |
| **←** | Geri | Back navigation |
| **→** | İleri | Next navigation |
| **▾** | Açılır menü | Dropdown chevron |
| **×** | Kapat | Modal close button (20px) |
| **🎯** | Hedef | - |
| **📊** | İstatistik | Dashboard |
| **✨** | Yıldız/Özel | - |
| **⚡** | Hızlı/Güç | - |
| **💡** | Fikir | Help/Info |
| **🚀** | Başlat | - |
| **📝** | Not/Form | - |
| **🎨** | Tasarım | Branding |
| **📍** | Konum | Location map |

### Icon Sizes

| Kullanım | Font Size | Örnek |
|----------|-----------|-------|
| **Logo icon** | 20px | `?` |
| **Toast icon** | 18px | `✓ ✕ ⚠ ℹ` |
| **Modal close** | 20px - 24px | `×` |
| **Button icon** | 14px - 16px | `➕ ✏️ 🗑️` |
| **Large icon** | 32px - 48px | Empty states |

---

## 🔔 Toast Notifications

```css
.toast {
  padding: 14px 18px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  background: #fff;
  border-left: 4px solid;
  max-width: 400px;
  animation: slideIn 0.3s ease-out;
}
```

### Toast Types

| Type | Border Color | Icon | Kullanım |
|------|--------------|------|----------|
| **info** | `#4A90A4` (secondary-500) | ℹ | Bilgi mesajları |
| **success** | `#5EC5B6` (accent-400) | ✓ | Başarı mesajları |
| **error** | `#dc2626` (red) | ✕ | Hata mesajları |
| **warning** | `#FF6B4A` (primary-500) | ⚠ | Uyarı mesajları |

**Position:** `top: 20px; right: 20px;`
**Duration:** 3000ms (default)
**Progress Bar:** 3s linear animation

---

## 🪟 Modal/Overlay

### 1. Overlay
```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(26,35,50,.4);
  backdrop-filter: blur(4px);
  z-index: 30;
  transition: opacity 0.3s ease;
}
```

**Background:** Dark-500 at 40% opacity
**Backdrop Blur:** 4px
**Z-Index:** 30

---

### 2. Modal (Large)
```css
.modal-lg {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999;
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}
```

**Max Width:** 600px
**Padding:** 32px
**Border Radius:** 16px
**Shadow:** Heavy shadow

---

### 3. Skip Confirm Modal (Quiz)
```css
.skip-confirm-modal {
  max-width: 340px;
  background: #ffffff;
  border-radius: 18px;
  padding: 28px 26px 24px;
  box-shadow: 0 28px 64px rgba(15, 23, 42, 0.25);
  text-align: center;
}

.skip-confirm-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  font-size: 26px;
}

/* Cancel (Red) */
.skip-confirm-cancel {
  background: #fee2e2;
  color: #b91c1c;
}

/* Approve (Green) */
.skip-confirm-approve {
  background: #dcfce7;
  color: #047857;
}
```

**Button Size:** 56x56px (circular)
**Icon Size:** 26px (emoji)

---

## 🧭 Sidebar Navigation

```css
.sidebar {
  width: 280px;
  background: #1A2332; /* dark-500 */
  color: #e5e7eb;
  box-shadow: 4px 0 24px rgba(0,0,0,0.15);
}

.sidebar a {
  padding: 0.875rem 1rem;
  border-radius: 0.75rem; /* 12px */
  margin: 0.25rem 0.75rem;
  transition: background 0.15s;
}

.sidebar a:hover {
  background: #374151;
}

.sidebar a.active {
  background: linear-gradient(135deg, #FF6B4A 0%, #E84A28 100%);
  color: #fff;
}
```

**Width:** 280px
**Background:** dark-500 `#1A2332`
**Active Link:** Primary gradient
**Hover:** Gray-700 `#374151`

### User Card
```css
.sidebar-user-initials {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #FF6B4A 0%, #E84A28 100%);
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 10px 25px rgba(255, 107, 74, 0.25);
}

.sidebar-user-name {
  font-size: 1rem;
  font-weight: 600;
  color: #f9fafb;
}

.sidebar-user-company {
  font-size: 0.75rem; /* 12px */
  color: rgba(226, 232, 240, 0.75);
}
```

**Avatar Size:** 44x44px
**Avatar Gradient:** Primary
**Name:** 16px, weight 600

---

## 🎯 Special Components

### 1. Logo Icon
```css
.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #FF6B4A 0%, #E84A28 100%);
  border-radius: 8px;
  font-size: 20px;
  font-weight: 800;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Size:** 36x36px
**Character:** `?`
**Gradient:** Primary
**Font:** 20px, weight 800

---

### 2. Circular Timer
```css
.circular-timer {
  width: 40px;
  height: 40px;
  position: relative;
}

.circular-timer-value {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 400;
  color: #244D5A;
}

.circular-timer-value.ending {
  animation: timer-ending 0.8s ease-in-out infinite alternate;
}
```

**Size:** 40x40px
**Font Size:** 15px
**Ring Colors:**
- Green (>75%): `#3DA89C`
- Yellow (50-75%): `#FFD700`
- Orange (25-50%): `#FF8C00`
- Red (<25%): `#DC2626`

---

### 3. Hamburger Menu
```css
.hamburger {
  width: 28px;
  height: 22px;
}

.hamburger span {
  height: 3px;
  background: #1A2332;
  border-radius: 999px;
}
```

**Size:** 28x22px
**Bar Height:** 3px
**Color:** dark-500
**Animation:** 0.25s transform

---

### 4. Upload Area (Drag & Drop)
```css
.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 32px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: #FF6B4A;
  background: #FFF5F2;
}

.upload-area.dragover {
  border-color: #FF6B4A;
  background: #FFE8E0;
}
```

**Border:** 2px dashed
**Hover:** Primary border, light background
**Dragover:** Primary border, darker background

---

### 5. Loading Spinner
```css
.spinner {
  border: 3px solid #f3f4f6;
  border-top: 3px solid #FF6B4A;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

**Size:** 40x40px (default)
**Border:** 3px
**Top Border Color:** Primary-500
**Speed:** 0.8s

---

### 6. Progress Bar (Quiz)
**Not:** Quiz component'inde inline stil kullanılıyor.

```javascript
const progress = (currentIndex + 1) / totalQuestions * 100;
style={{ width: `${progress}%` }}
```

**Height:** Genelde 4-8px
**Color:** Primary veya accent gradient
**Animation:** 0.3s ease

---

## 📐 Breakpoints (Responsive)

```css
/* Mobile First */
@media (max-width: 640px) {
  /* Small devices */
}

@media (min-width: 768px) {
  /* Tablets and up */
}

@media (max-width: 768px) {
  /* Mobile and tablets */
}
```

**Mobile Adjustments:**
- Nav pills: Grid layout (3 columns)
- Padding reduction: 32px → 24px
- Font size reduction: Titles smaller
- Glassmorphism card: 240px min-width

---

## 🎨 Background Gradients

### 1. Landing Page Background
```css
.bg-landing {
  background: linear-gradient(135deg, #F0F7F9 0%, #FFF5F2 100%);
}

.bg-landing::before {
  background: radial-gradient(circle, rgba(255,107,74,0.15) 0%, transparent 70%);
  width: 800px;
  height: 800px;
  top: -50%;
  right: -20%;
}

.bg-landing::after {
  background: radial-gradient(circle, rgba(74,144,164,0.15) 0%, transparent 70%);
  width: 600px;
  height: 600px;
  bottom: -30%;
  left: -10%;
}
```

**Main Gradient:** Secondary-50 → Primary-50
**Decorative Circles:** Radial gradients with opacity

---

### 2. Button Gradients

| Button | Gradient |
|--------|----------|
| **Primary** | `linear-gradient(135deg, #FF6B4A 0%, #E84A28 100%)` |
| **Primary Hover** | `linear-gradient(135deg, #E84A28 0%, #C23818 100%)` |
| **Secondary** | `linear-gradient(135deg, #4A90A4 0%, #3A7383 100%)` |
| **Next Pill** | `linear-gradient(135deg, #5EDFD1 0%, #5EC5B6 100%)` |
| **Submit Pill** | `linear-gradient(135deg, #5EC5B6 0%, #3DA89C 100%)` |
| **Prev Pill** | `linear-gradient(135deg, #FF8D75 0%, #FF6B4A 100%)` |

**Gradient Angle:** 135deg (diagonal)

---

## 📊 Component Dimension Summary

| Component | Width | Height | Padding | Border Radius |
|-----------|-------|--------|---------|---------------|
| **Button** | auto | auto | 12px 24px | 12px |
| **Form Field** | 100% | auto | 14px 16px | 12px |
| **Card** | auto | auto | 32px | 16px |
| **Modal** | 600px max | 90vh max | 32px | 16px |
| **Sidebar** | 280px | 100vh | - | - |
| **Logo Icon** | 36px | 36px | - | 8px |
| **User Avatar** | 44px | 44px | - | 999px |
| **Chip** | auto | auto | 6px 14px | 999px |
| **Toggle** | 48px | 24px | - | 24px |
| **Toast** | 400px max | auto | 14px 18px | 12px |
| **Spinner** | 40px | 40px | - | 50% |
| **Timer** | 40px | 40px | - | 50% |
| **Hamburger** | 28px | 22px | - | - |
| **Nav Pill** | 140px min | auto | 12px 24px | 999px |

---

## 🎯 Kullanım Örnekleri

### Tam Bir Button Örneği
```html
<button class="btn btn-primary">
  ➕ Yeni Ekle
</button>
```

### Tam Bir Card Örneği
```html
<div class="card p-8">
  <h2 class="text-2xl font-bold text-dark-900 mb-4">Başlık</h2>
  <p class="text-dark-600">İçerik metni</p>
</div>
```

### Tam Bir Form Field Örneği
```html
<div>
  <label class="block text-sm font-semibold text-dark-700 mb-2">Email</label>
  <input
    type="email"
    class="field"
    placeholder="ornek@email.com"
  />
  <p class="error-text">Bu alan zorunludur</p>
</div>
```

### Tam Bir Toast Örneği
```javascript
toast('İşlem başarılı!', 'success', 3000);
```

---

## 📝 Notlar

1. **Consistent Spacing:** 4px artışlı spacing kullanılıyor (4, 8, 12, 16, 24, 32...)
2. **Border Radius:** Genelde 12px veya 16px, pill buttonlar 999px
3. **Shadows:** Hover'da artıyor, aktif state'te azalıyor
4. **Animations:** Genelde 0.2s - 0.4s arası, smooth transitions
5. **Font Weights:** 400 (normal), 600 (semibold), 700 (bold), 800 (extrabold)
6. **Primary Color:** Her yerde tutarlı `#FF6B4A`
7. **Gradient Angle:** Hep 135deg
8. **Z-Index Hierarchy:** Overlay (30) < Sidebar (40) < Toast (1000)

---

**Son Güncelleme:** 2025-01-08
**Versiyon:** 1.0.0
**Proje:** QuizUp+ – Boost Your Knowledge
