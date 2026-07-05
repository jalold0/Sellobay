/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Sellobay palette — web (@ecom/ui) bilan bir xil: crimson + qora + oltin
        primary: {
          DEFAULT: '#531625', // crimson — CTA, hero, active tab, badge, narx
          foreground: '#ffffff',
        },
        bordeaux: {
          DEFAULT: '#531625',
          deep: '#3A0E19', // crimson-deep — gradient sherigi, gold badge matni
          bright: '#762237',
        },
        ink: {
          DEFAULT: '#0A0A0C', // brand black — matn, dark surface
          soft: '#16161A', // gradient sherigi
        },
        // Eski `dark` alias (mavjud ekranlar buzilmasin uchun)
        dark: {
          DEFAULT: '#0A0A0C',
          soft: '#16161A',
        },
        gold: {
          DEFAULT: '#C9A961', // premium aksent (yulduz, Premium, olmos)
          bright: '#E5C77A', // och oltin — qorong'i fonda
          text: '#8a6d2f', // och fonda oltin matn
        },
        accent: {
          DEFAULT: '#762237', // crimson-bright — cart badge, hot
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#FAF6F4', // iliq neytral fon (mahsulot rasm foni / soft panel)
          foreground: '#6B6B73',
        },
        card: '#ffffff',
        border: '#EAEAEC',
        background: '#ffffff',
        foreground: '#0A0A0C',
        paper: '#FAF9F7', // iliq sahifa foni
        chip: '#F1F1F3', // muted chip
        promo: '#FDFBF6', // promo-kod foni
        'crimson-chip': '#FDF3F5', // crimson chip foni (YO'LDA)
        'success-chip': '#EDF7F1', // yashil chip foni (YETKAZILDI)
        success: '#1F8A5B', // bepul yetkazish, yetkazildi, to'landi
        warning: '#F59E0B',
        danger: '#DC2626',
        // Matn kulrang shkalasi (handoff)
        neutral: {
          900: '#26262b',
          700: '#3a3a40',
          600: '#4a4a52',
          500: '#55555c',
          400: '#6B6B73',
          300: '#9a9aa2',
        },
      },
      fontFamily: {
        // Playfair Display — sarlavhalar, narx (premium)
        serif: ['PlayfairDisplay_600SemiBold'],
        'serif-bold': ['PlayfairDisplay_700Bold'],
        sans: ['Inter_400Regular', 'System'],
        'sans-medium': ['Inter_500Medium'],
        'sans-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
