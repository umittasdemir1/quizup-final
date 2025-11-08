# 🎨 QuizUp+ Design System V2 - Professional Prototype

**Yeni Konsept:** Profesyonel, Kurumsal, Minimal ve Modern

**Font Sistemi:** Poppins (Headings) + Roboto (Body)
**Icon Sistemi:** Outline/Line Icons (Heroicons veya Lucide)
**Tasarım Dili:** Corporate, Clean, Sophisticated

---

## 📋 Değişiklik Özeti

| Element | Mevcut (V1) | Yeni (V2 Prototype) |
|---------|-------------|---------------------|
| **Heading Font** | Inter (800) | **Poppins** (600-700) |
| **Body Font** | Inter (400) | **Roboto** (400-500) |
| **İkonlar** | Emoji (?, ➕, 🗑️) | **Outline Icons** (SVG) |
| **Primary Color** | #FF6B4A (Parlak Turuncu) | **#FF5722** (Material Orange) |
| **Accent Color** | #3DA89C (Turkuaz) | **#00897B** (Teal 600) |
| **Secondary Color** | #4A90A4 (Açık Mavi) | **#1976D2** (Blue 700) |
| **Border Radius** | 12-16px | **8-12px** (Daha keskin) |
| **Shadows** | Soft shadows | **Crisp shadows** |
| **Overall Look** | Friendly, Playful | **Professional, Corporate** |

---

## 🔤 Tipografi Sistemi - Poppins & Roboto

### Font Kombinasyonu Mantığı

**Poppins:** Başlıklar, butonlar, navlar için - Modern, professional, geometric
**Roboto:** Body text, paragraflar için - Okunabilir, clean, versatile

### CDN Links

```html
<!-- Google Fonts - Poppins & Roboto -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
```

### Font Family Tanımları

```css
/* Primary Font Family - Headings */
.font-heading {
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Secondary Font Family - Body */
.font-body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Base HTML */
body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6, .btn, .nav-link {
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

---

### Tipografi Hierarchy (Updated)

| Element | Font Family | Font Size | Font Weight | Line Height | Letter Spacing |
|---------|-------------|-----------|-------------|-------------|----------------|
| **Hero Title** | Poppins | 3.5rem (56px) | 700 | 1.1 | -0.02em |
| **Page Title (h1)** | Poppins | 2.5rem (40px) | 700 | 1.2 | -0.01em |
| **Section Title (h2)** | Poppins | 2rem (32px) | 600 | 1.3 | normal |
| **Subsection (h3)** | Poppins | 1.5rem (24px) | 600 | 1.4 | normal |
| **Card Title (h4)** | Poppins | 1.25rem (20px) | 600 | 1.4 | normal |
| **Label/Badge** | Poppins | 0.875rem (14px) | 500 | 1.4 | 0.02em |
| **Button** | Poppins | 0.875rem (14px) | 600 | 1 | 0.03em |
| **Body Large** | Roboto | 1.125rem (18px) | 400 | 1.6 | normal |
| **Body** | Roboto | 1rem (16px) | 400 | 1.6 | normal |
| **Body Small** | Roboto | 0.875rem (14px) | 400 | 1.5 | normal |
| **Caption** | Roboto | 0.75rem (12px) | 500 | 1.4 | 0.01em |

**Örnek CSS:**

```css
/* Hero Title */
.hero-title {
  font-family: 'Poppins', sans-serif;
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #1A202C; /* Daha koyu, professional */
}

/* Body Text */
.body-text {
  font-family: 'Roboto', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  color: #4A5568; /* Soft dark gray */
}

/* Button */
.btn {
  font-family: 'Poppins', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase; /* Professional look */
}
```

---

## 🎨 Renk Paleti V2 - Corporate & Professional

### Değişiklik Mantığı
- Daha mat, sofistike tonlar
- Material Design ve corporate standartlara yakın
- Yüksek kontrast (accessibility)
- Profesyonel, güvenilir hissiyat

---

### Primary Color - Corporate Orange/Red

**Mevcut:** `#FF6B4A` (Çok parlak, playful)
**Yeni:** Material Deep Orange palette

| Ton | Hex Code | Kullanım |
|-----|----------|----------|
| primary-50 | `#FBE9E7` | Arka plan hover |
| primary-100 | `#FFCCBC` | Hafif arka plan |
| primary-200 | `#FFAB91` | Border hover |
| primary-300 | `#FF8A65` | Soft vurgu |
| primary-400 | `#FF7043` | - |
| **primary-500** | **`#FF5722`** | **Ana Marka Rengi** |
| primary-600 | `#F4511E` | Hover state |
| primary-700 | `#E64A19` | Active/pressed |
| primary-800 | `#D84315` | Koyu metin |
| primary-900 | `#BF360C` | En koyu |

**Gradient (Professional):**
```css
background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%);
```

**Kullanım:**
- Ana butonlar
- Active states
- Call-to-action elementleri
- Logo accent

---

### Secondary Color - Professional Blue

**Mevcut:** `#4A90A4` (Açık mavi)
**Yeni:** Material Blue palette (Daha kurumsal)

| Ton | Hex Code | Kullanım |
|-----|----------|----------|
| secondary-50 | `#E3F2FD` | Hafif arka plan |
| secondary-100 | `#BBDEFB` | Card background |
| secondary-200 | `#90CAF9` | - |
| secondary-300 | `#64B5F6` | - |
| secondary-400 | `#42A5F5` | - |
| **secondary-500** | **`#2196F3`** | **Ana İkincil Renk** |
| secondary-600 | `#1E88E5` | Hover |
| secondary-700 | `#1976D2` | Active |
| secondary-800 | `#1565C0` | Koyu |
| secondary-900 | `#0D47A1` | En koyu |

**Gradient:**
```css
background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
```

---

### Accent Color - Teal (Success/Positive)

**Mevcut:** `#3DA89C` (Soft turkuaz)
**Yeni:** Material Teal (Daha vibrant, professional)

| Ton | Hex Code | Kullanım |
|-----|----------|----------|
| accent-50 | `#E0F2F1` | Success bg |
| accent-100 | `#B2DFDB` | Light success |
| accent-200 | `#80CBC4` | - |
| accent-300 | `#4DB6AC` | - |
| accent-400 | `#26A69A` | - |
| **accent-500** | **`#009688`** | **Ana Vurgu** |
| accent-600 | `#00897B` | Hover |
| accent-700 | `#00796B` | Active |
| accent-800 | `#00695C` | Koyu |
| accent-900 | `#004D40` | En koyu |

---

### Neutral/Gray Colors - Professional

**Mevcut:** Custom dark palette
**Yeni:** Tailwind-inspired grays (Industry standard)

| Ton | Hex Code | Kullanım |
|-----|----------|----------|
| gray-50 | `#FAFAFA` | Background light |
| gray-100 | `#F5F5F5` | Card background |
| gray-200 | `#EEEEEE` | Border light |
| gray-300 | `#E0E0E0` | Border default |
| gray-400 | `#BDBDBD` | Border hover |
| gray-500 | `#9E9E9E` | Disabled text |
| gray-600 | `#757575` | Secondary text |
| gray-700 | `#616161` | Body text |
| gray-800 | `#424242` | Heading text |
| **gray-900** | **`#212121`** | **Primary text** |

---

### System Colors

| Renk | Hex Code | Kullanım |
|------|----------|----------|
| **Success** | `#4CAF50` | Başarı mesajları, doğru cevap |
| **Warning** | `#FF9800` | Uyarılar, dikkat |
| **Error** | `#F44336` | Hatalar, yanlış cevap |
| **Info** | `#2196F3` | Bilgi mesajları |

---

## 🎯 Icon Sistemi - Outline/Line Icons

### Önerilen Icon Kütüphaneleri

#### 1. **Heroicons** (Önerilen ⭐)
**Neden:** Tailwind ekibi tarafından tasarlandı, çok temiz, modern

```html
<!-- CDN (React için) -->
<script src="https://unpkg.com/@heroicons/react@2.0.18/24/outline"></script>

<!-- Ya da inline SVG olarak kullan -->
```

**Stil:** 24x24px outline, 2px stroke width
**Link:** https://heroicons.com/

---

#### 2. **Lucide Icons** (Alternatif)
**Neden:** Feather Icons'un geliştirilmiş versiyonu, çok geniş koleksiyon

```html
<!-- CDN -->
<script src="https://unpkg.com/lucide@latest"></script>
```

**Stil:** 24x24px outline, 2px stroke width
**Link:** https://lucide.dev/

---

#### 3. **Feather Icons** (Klasik)
**Neden:** En popular outline icon seti, minimal ve clean

```html
<!-- CDN -->
<script src="https://unpkg.com/feather-icons"></script>
```

**Stil:** 24x24px outline, 2px stroke width
**Link:** https://feathericons.com/

---

### Icon Mapping - Emoji → Outline Icon

| Mevcut Emoji | Anlamı | Yeni Icon (Heroicons) | SVG Class |
|--------------|--------|------------------------|-----------|
| **?** | Quiz/Soru | `QuestionMarkCircleIcon` | `.h-6.w-6` |
| **➕** | Ekle | `PlusIcon` | `.h-5.w-5` |
| **✏️** | Düzenle | `PencilSquareIcon` | `.h-5.w-5` |
| **🗑️** | Sil | `TrashIcon` | `.h-5.w-5` |
| **✓** | Başarı | `CheckIcon` / `CheckCircleIcon` | `.h-6.w-6` |
| **✕** | Hata/Kapat | `XMarkIcon` | `.h-6.w-6` |
| **⚠** | Uyarı | `ExclamationTriangleIcon` | `.h-6.w-6` |
| **ℹ** | Bilgi | `InformationCircleIcon` | `.h-6.w-6` |
| **👑** | Admin | `CrownIcon` / `ShieldCheckIcon` | `.h-5.w-5` |
| **👔** | Manager | `BriefcaseIcon` | `.h-5.w-5` |
| **🔒** | Şifre/Lock | `LockClosedIcon` | `.h-5.w-5` |
| **🔓** | Unlock | `LockOpenIcon` | `.h-5.w-5` |
| **←** | Geri | `ArrowLeftIcon` | `.h-5.w-5` |
| **→** | İleri | `ArrowRightIcon` | `.h-5.w-5` |
| **▾** | Dropdown | `ChevronDownIcon` | `.h-4.w-4` |
| **📊** | İstatistik | `ChartBarIcon` | `.h-6.w-6` |
| **📝** | Form | `DocumentTextIcon` | `.h-6.w-6` |
| **🎯** | Hedef | `FlagIcon` / `TargetIcon` | `.h-6.w-6` |
| **📍** | Konum | `MapPinIcon` | `.h-5.w-5` |
| **👥** | Kullanıcılar | `UsersIcon` | `.h-6.w-6` |
| **⚙️** | Ayarlar | `Cog6ToothIcon` | `.h-5.w-5` |
| **🏠** | Ana Sayfa | `HomeIcon` | `.h-6.w-6` |
| **📂** | Klasör | `FolderIcon` | `.h-5.w-5` |

---

### Icon Boyutları (Heroicons)

| Kullanım | Tailwind Class | Size | Stroke Width |
|----------|----------------|------|--------------|
| **Large (Hero)** | `.h-12.w-12` | 48px | 2px |
| **Medium (Card)** | `.h-8.w-8` | 32px | 2px |
| **Default** | `.h-6.w-6` | 24px | 2px |
| **Small (Button)** | `.h-5.w-5` | 20px | 2px |
| **Tiny (Badge)** | `.h-4.w-4` | 16px | 2px |

---

### Icon Kullanım Örnekleri

#### React Component ile:
```jsx
import { PlusIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

// Button
<button className="btn btn-primary">
  <PlusIcon className="h-5 w-5 mr-2" />
  Yeni Ekle
</button>

// Icon Only
<button className="icon-btn">
  <TrashIcon className="h-5 w-5" />
</button>
```

#### CDN ile (Inline SVG):
```html
<!-- Plus Icon -->
<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
</svg>

<!-- Trash Icon -->
<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
</svg>
```

---

## 🔘 Butonlar V2 - Corporate Style

### 1. Primary Button (Updated)

```css
.btn-primary {
  font-family: 'Poppins', sans-serif;
  font-size: 0.875rem; /* 14px */
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;

  padding: 0.75rem 1.75rem; /* 12px 28px */
  border-radius: 8px; /* Daha keskin */

  background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%);
  color: #FFFFFF;

  box-shadow: 0 2px 4px rgba(255, 87, 34, 0.25),
              0 4px 12px rgba(255, 87, 34, 0.15);

  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #E64A19 0%, #D84315 100%);
  box-shadow: 0 4px 8px rgba(255, 87, 34, 0.3),
              0 6px 20px rgba(255, 87, 34, 0.2);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(255, 87, 34, 0.3);
}
```

**Değişiklikler:**
- ✅ Border radius: 12px → 8px (daha keskin)
- ✅ Text-transform: uppercase (profesyonel)
- ✅ Daha crisp shadow
- ✅ Letter spacing artırıldı

---

### 2. Secondary Button (Updated)

```css
.btn-secondary {
  font-family: 'Poppins', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;

  padding: 0.75rem 1.75rem;
  border-radius: 8px;

  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  color: #FFFFFF;

  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.25),
              0 4px 12px rgba(33, 150, 243, 0.15);
}
```

---

### 3. Outline Button (Yeni!)

```css
.btn-outline {
  font-family: 'Poppins', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;

  padding: 0.75rem 1.75rem;
  border-radius: 8px;

  background: transparent;
  color: #FF5722;
  border: 2px solid #FF5722;

  transition: all 0.2s ease;
}

.btn-outline:hover {
  background: #FF5722;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(255, 87, 34, 0.25);
}
```

---

### 4. Ghost Button (Updated)

```css
.btn-ghost {
  font-family: 'Poppins', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;

  padding: 0.75rem 1.75rem;
  border-radius: 8px;

  background: #F5F5F5; /* gray-100 */
  color: #424242; /* gray-800 */

  transition: all 0.2s ease;
}

.btn-ghost:hover {
  background: #EEEEEE; /* gray-200 */
  color: #212121; /* gray-900 */
}
```

---

### 5. Icon Button (Yeni!)

```css
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 40px;
  height: 40px;
  padding: 0;

  border-radius: 8px;
  background: transparent;
  color: #616161; /* gray-700 */

  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: #F5F5F5;
  color: #FF5722;
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}
```

---

## 🃏 Kartlar V2 - Professional

### Standard Card (Updated)

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E0E0E0; /* gray-300 */
  border-radius: 12px; /* Biraz yumuşak tutuyoruz */

  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06),
              0 1px 2px rgba(0, 0, 0, 0.04);

  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  border-color: #BDBDBD; /* gray-400 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
              0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}
```

**Değişiklikler:**
- ✅ Daha subtle shadow
- ✅ Border ekledik
- ✅ Hover'da hafif lift efekti

---

## 🏷️ Badge/Chip V2 - Corporate

```css
.badge {
  font-family: 'Poppins', sans-serif;
  font-size: 0.75rem; /* 12px */
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;

  display: inline-flex;
  align-items: center;
  gap: 0.375rem;

  padding: 0.375rem 0.75rem; /* 6px 12px */
  border-radius: 6px; /* Daha keskin */
}

/* Primary Badge */
.badge-primary {
  background: #FBE9E7; /* primary-50 */
  color: #BF360C; /* primary-900 */
  border: 1px solid #FFCCBC; /* primary-100 */
}

/* Success Badge */
.badge-success {
  background: #E8F5E9;
  color: #2E7D32;
  border: 1px solid #C8E6C9;
}

/* Role Badges */
.badge-admin {
  background: #FFEBEE;
  color: #C62828;
  border: 1px solid #FFCDD2;
}

.badge-manager {
  background: #E3F2FD;
  color: #1565C0;
  border: 1px solid #BBDEFB;
}
```

---

## 📐 Spacing & Border Radius V2

### Border Radius (Updated)

| Değer | Kullanım | Mevcut | Yeni |
|-------|----------|--------|------|
| **4px** | Tiny elements | - | ✅ Yeni |
| **6px** | Badges, chips | - | ✅ Yeni |
| **8px** | Buttons, inputs | 12px | ✅ Güncellendi |
| **12px** | Cards, modals | 16px | ✅ Güncellendi |
| **16px** | Large cards | 20px | ✅ Güncellendi |
| **999px** | Pills | 999px | ✅ Aynı |

**Mantık:** Daha keskin, corporate görünüm için değerleri düşürdük.

---

## 🌑 Shadows V2 - Crisp & Professional

### Shadow Scale

```css
/* XS - Subtle */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);

/* SM - Default */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06),
             0 1px 2px rgba(0, 0, 0, 0.04);

/* MD - Cards */
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07),
             0 2px 4px rgba(0, 0, 0, 0.05);

/* LG - Hover */
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.08),
             0 4px 6px rgba(0, 0, 0, 0.05);

/* XL - Modals */
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1),
             0 10px 10px rgba(0, 0, 0, 0.04);

/* 2XL - Popups */
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.15);
```

**Değişiklikler:**
- ✅ Daha subtle, crisp shadows
- ✅ Layered shadows (çift shadow)
- ✅ Daha düşük opacity değerleri

---

## 📊 Component Karşılaştırma

### Logo Icon

| Özellik | Mevcut | Yeni |
|---------|--------|------|
| **Icon** | ? emoji | `<QuestionMarkCircleIcon />` |
| **Size** | 36x36px | 40x40px |
| **Background** | Primary gradient | Solid primary |
| **Border Radius** | 8px | 12px |
| **Font Size** | 20px | - (SVG) |

**Yeni Kod:**
```jsx
<div className="logo-icon">
  <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
</div>
```

```css
.logo-icon {
  width: 40px;
  height: 40px;
  background: #FF5722; /* Solid, professional */
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(255, 87, 34, 0.25);
}
```

---

### Navigation Pills (Quiz)

| Özellik | Mevcut | Yeni |
|---------|--------|------|
| **Font** | Inter 700 | Poppins 600 |
| **Size** | 14px | 14px |
| **Text Transform** | Normal | UPPERCASE |
| **Border Radius** | 999px | 999px (aynı) |
| **Padding** | 12px 24px | 12px 28px |
| **Icon** | Emoji | Outline icon |

---

## 🎯 Sidebar V2

```css
.sidebar {
  width: 280px;
  background: #FFFFFF; /* Beyaz sidebar, modern! */
  border-right: 1px solid #E0E0E0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
}

.sidebar-link {
  font-family: 'Poppins', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;

  display: flex;
  align-items: center;
  gap: 0.75rem;

  padding: 0.75rem 1rem;
  margin: 0.25rem 0.75rem;
  border-radius: 8px;

  color: #616161; /* gray-700 */
  transition: all 0.2s ease;
}

.sidebar-link:hover {
  background: #F5F5F5;
  color: #FF5722;
}

.sidebar-link.active {
  background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%);
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(255, 87, 34, 0.25);
}

.sidebar-link svg {
  width: 20px;
  height: 20px;
}
```

**Değişiklikler:**
- ✅ Dark sidebar → Light sidebar (daha modern)
- ✅ Border-right ile ayırma
- ✅ Outline icon'lar
- ✅ Poppins font

---

## 🔔 Toast V2 - Professional

```css
.toast {
  font-family: 'Roboto', sans-serif;

  display: flex;
  align-items: flex-start;
  gap: 0.75rem;

  padding: 1rem 1.25rem;
  border-radius: 8px;

  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
              0 2px 4px rgba(0, 0, 0, 0.06);
}

.toast-success {
  border-left: 4px solid #4CAF50;
}

.toast-error {
  border-left: 4px solid #F44336;
}

.toast-warning {
  border-left: 4px solid #FF9800;
}

.toast-info {
  border-left: 4px solid #2196F3;
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-family: 'Poppins', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #212121;
  margin-bottom: 0.25rem;
}

.toast-message {
  font-size: 0.875rem;
  color: #616161;
  line-height: 1.5;
}
```

---

## 📋 Implementation Checklist

### Aşama 1: Font Kurulumu
- [ ] Google Fonts CDN ekle (Poppins & Roboto)
- [ ] Base CSS'e font-family tanımları
- [ ] Heading'lere Poppins ata
- [ ] Body'ye Roboto ata

### Aşama 2: Icon Kütüphanesi
- [ ] Heroicons CDN veya package yükle
- [ ] Emoji mapping tablosunu kullan
- [ ] Tüm emoji'leri icon'larla değiştir
- [ ] Icon size'ları ayarla

### Aşama 3: Renk Paleti
- [ ] Tailwind config'de renkleri güncelle
- [ ] CSS variables oluştur
- [ ] Component'lerde renkleri değiştir

### Aşama 4: Component Updates
- [ ] Butonları güncelle
- [ ] Kartları güncelle
- [ ] Badge'leri güncelle
- [ ] Sidebar'ı güncelle
- [ ] Toast'ları güncelle

### Aşama 5: Detaylar
- [ ] Border radius'ları güncelle
- [ ] Shadow'ları güncelle
- [ ] Spacing'leri kontrol et
- [ ] Responsive testler

---

## 🎨 Before/After Karşılaştırma

### Button Örneği

**Before:**
```html
<button class="btn btn-primary">
  ➕ Yeni Ekle
</button>
```

**After:**
```html
<button class="btn btn-primary">
  <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
  YENİ EKLE
</button>
```

---

## 🚀 Sonraki Adımlar

1. **Prototip Onayı** - Bu tasarımı onaylarsanız...
2. **CDN Entegrasyonu** - Font ve icon kütüphanelerini ekleyelim
3. **Component Conversion** - Bileşenleri tek tek güncelleyelim
4. **Testing** - Tüm sayfaları test edelim
5. **Final Polish** - Detay ayarları

---

**Hazırlayan:** Claude
**Tarih:** 2025-01-08
**Versiyon:** V2 Prototype
**Durum:** Onay Bekliyor ✋
