tailwind.config = {
  theme: {
    extend: {
      fontFamily: { 
        inter: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'] 
      },
      colors: {
        primary: {
          50: '#FFF5F2',
          100: '#FFE8E0',
          200: '#FFD1C1',
          300: '#FFB5A0',
          400: '#FF8D75',
          500: '#FF6B4A',
          600: '#E84A28',
          700: '#C23818',
          800: '#9D2A0F',
          900: '#7A1F08'
        },
        secondary: {
          50: '#F0F7F9',
          100: '#D9EDF2',
          200: '#B3DBE5',
          300: '#8DC9D8',
          400: '#67B5CB',
          500: '#4A90A4',
          600: '#3A7383',
          700: '#2B5662',
          800: '#1D3A42',
          900: '#0F1F24'
        },
        accent: {
          50: '#F0FDFB',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EDFD1',
          400: '#5EC5B6',
          500: '#3DA89C',
          600: '#2D8A7F',
          700: '#1F6B63',
          800: '#134E49',
          900: '#0A3330'
        },
        dark: {
          50: '#E8EAED',
          100: '#D1D5DA',
          200: '#A3ABB5',
          300: '#758190',
          400: '#47576B',
          500: '#1A2332',
          600: '#151C28',
          700: '#10151E',
          800: '#0B0E14',
          900: '#06070A'
        }
      },
      boxShadow: { 
        card: '0 4px 16px rgba(0,0,0,0.08)', 
        pill: '0 8px 24px rgba(255,107,74,0.25)',
        glow: '0 0 20px rgba(255,107,74,0.3)'
      },
      borderRadius: { 
        xl2: '16px', 
        xl3: '20px' 
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-in-out'
      },
      keyframes: {
        fadeIn: { 
          '0%': { opacity: '0' }, 
          '100%': { opacity: '1' } 
        },
        slideUp: { 
          '0%': { transform: 'translateY(20px)', opacity: '0' }, 
          '100%': { transform: 'translateY(0)', opacity: '1' } 
        },
        bounceSoft: { 
          '0%, 100%': { transform: 'translateY(0)' }, 
          '50%': { transform: 'translateY(-10px)' } 
        }
      }
    }
  }
};
