/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          bright: 'hsl(var(--primary-bright))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // ====== SELLOBAY BRAND TOKENS ======
        brand: {
          bordeaux: 'hsl(var(--brand-bordeaux))',
          'bordeaux-deep': 'hsl(var(--brand-bordeaux-deep))',
          'bordeaux-bright': 'hsl(var(--brand-bordeaux-bright))',
          wine: 'hsl(var(--brand-wine))',
          black: 'hsl(var(--brand-black))',
          charcoal: 'hsl(var(--brand-charcoal))',
          graphite: 'hsl(var(--brand-graphite))',
          smoke: 'hsl(var(--brand-smoke))',
          gold: 'hsl(var(--brand-gold))',
          'gold-bright': 'hsl(var(--brand-gold-bright))',
          'gold-text': 'hsl(var(--brand-gold-text))',
          // Redesign nomlari (dizayn-handoff bilan bir xil o'qilishi uchun)
          crimson: 'hsl(var(--brand-bordeaux))',
          'crimson-deep': 'hsl(var(--brand-bordeaux-deep))',
          ink: 'hsl(var(--brand-black))',
          'ink-soft': 'hsl(var(--brand-charcoal))',
          'gold-light': 'hsl(var(--brand-gold-bright))',
          // Legacy aliases — vaqtinchalik mavjud kod buzilmasligi uchun
          red: 'hsl(var(--brand-bordeaux))',
          'red-bright': 'hsl(var(--brand-bordeaux-bright))',
          'red-dark': 'hsl(var(--brand-bordeaux-deep))',
          dark: 'hsl(var(--brand-black))',
          orange: 'hsl(var(--brand-gold))',
          flame: 'hsl(var(--brand-bordeaux-bright))',
        },
        footer: 'hsl(var(--footer-bg))',
        // Redesign neutral / chip tokenlari
        paper: 'hsl(var(--paper))',
        soft: 'hsl(var(--muted))',
        chip: 'hsl(var(--chip))',
        promo: 'hsl(var(--promo))',
        'crimson-chip': 'hsl(var(--crimson-chip))',
        'success-chip': 'hsl(var(--success-chip))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        // Sellobay logotipi va bo'lim sarlavhalari uchun.
        //
        // Uchinchi "display" oilasi OLIB TASHLANDI: u var(--font-display)'ga
        // tayanardi, lekin bu o'zgaruvchi hech qayerda e'lon qilinmagan edi.
        // Aniqlanmagan var() butun font-family e'lonini bekor qiladi
        // (invalid at computed-value time) — ya'ni "font-display" yozgan
        // birinchi odam hech qanday xato ko'rmay, jimgina body shriftini
        // olardi. Kerak bo'lsa avval --font-display e'lon qilinsin.
        serif: ['var(--font-serif)', 'Playfair Display', 'Didot', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Faqat ishlatilayotgani. Qolgan beshtasi (bordeaux, frame,
        // editorial, editorial-hover, gold) hech qayerda chaqirilmagan edi.
        'card-hover': '0 20px 48px -20px rgba(10, 10, 12, 0.22)',
      },
      // Faqat Radix akkordeoni uchun. Oltita maxsus animatsiya
      // (slide-up, slide-down, fade-in, bounce-slow, shimmer, pulse-soft)
      // olib tashlandi — repo bo'ylab biror marta ham chaqirilmagan.
      // Ochilish/yopilish effektlari tailwindcss-animate plaginining
      // "animate-in" tizimidan keladi, bu yerdan emas.
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
