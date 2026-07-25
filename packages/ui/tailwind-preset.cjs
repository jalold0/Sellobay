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
        editorial: {
          bg: 'hsl(var(--editorial-bg))',
          pink: 'hsl(var(--editorial-pink))',
          amber: 'hsl(var(--editorial-amber))',
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
        display: ['var(--font-display)', 'Manrope', 'Inter', 'system-ui', 'sans-serif'],
        // Sellobay SB monogram, premium sarlavhalar uchun
        serif: ['var(--font-serif)', 'Playfair Display', 'Didot', 'Georgia', 'serif'],
      },
      boxShadow: {
        bordeaux: '0 12px 32px rgba(83, 22, 37, 0.25)',
        'card-hover': '0 20px 48px -20px rgba(10, 10, 12, 0.22)',
        frame: '0 24px 80px -32px rgba(10, 10, 12, 0.35)',
        editorial:
          '0 30px 60px -25px rgba(10, 10, 12, 0.15), 0 8px 24px -8px rgba(10, 10, 12, 0.08)',
        'editorial-hover':
          '0 40px 80px -25px rgba(10, 10, 12, 0.22), 0 12px 32px -8px rgba(83, 22, 37, 0.1)',
        gold: '0 8px 24px rgba(201, 169, 97, 0.25)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.03)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'bounce-slow': 'bounce-slow 1.8s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
