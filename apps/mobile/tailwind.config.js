/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Sellobay palette — web bilan bir xil (bordo + qora + oltin)
        primary: {
          DEFAULT: '#8B0020', // bordo — CTA, hero, active tab, badge
          foreground: '#ffffff',
        },
        bordeaux: {
          DEFAULT: '#8B0020',
          deep: '#5C0015',
          bright: '#B30029',
        },
        dark: {
          DEFAULT: '#0A0A0C', // brand black
          soft: '#16161A',
        },
        gold: {
          DEFAULT: '#C9A961', // premium aksent (oq matn UCHUN EMAS)
          bright: '#E5C77A',
        },
        accent: {
          DEFAULT: '#B30029', // bordo-bright — cart badge, hot (oq matn bilan ishlaydi)
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#FAF6F4', // iliq neytral fon (web editorial bilan mos)
          foreground: '#6B6B73',
        },
        card: '#ffffff',
        border: '#EAEAEC',
        background: '#ffffff',
        foreground: '#0A0A0C',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
