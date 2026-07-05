// Redizayn bosh sahifasi uchun UI-statik ma'lumot (mahsulotlar EMAS —
// ular mock-data/useProducts'dan keladi). Bu yerda faqat vizual bezaklar:
// stories, hero slaydlar, kategoriya tintlari, perks, brendlar.

import type { ShopMode } from '../store/mode';

// ─── Brend "stories" lentasi (bosh sahifa yuqorisi) ──────────────
export interface Story {
  name: string;
  label: string; // bosh harf yoki belgi
  bg: string;
  fg: string;
  ring: readonly [string, string]; // gradient halqa
}

export const stories: Story[] = [
  { name: 'Yangi', label: '✦', bg: '#531625', fg: '#E5C77A', ring: ['#C9A961', '#762237'] },
  { name: 'Chanel', label: 'C', bg: '#0A0A0C', fg: '#ffffff', ring: ['#C9A961', '#E5C77A'] },
  { name: 'Nike', label: 'N', bg: '#ffffff', fg: '#0A0A0C', ring: ['#762237', '#531625'] },
  { name: 'Dior', label: 'D', bg: '#0A0A0C', fg: '#ffffff', ring: ['#C9A961', '#E5C77A'] },
  { name: 'Gucci', label: 'G', bg: '#1F5E3A', fg: '#ffffff', ring: ['#C9A961', '#E5C77A'] },
  { name: 'Sale', label: '%', bg: '#762237', fg: '#ffffff', ring: ['#E5C77A', '#C9A961'] },
];

// ─── Hero karusel slaydlari ──────────────────────────────────────
export interface HeroSlide {
  colors: readonly [string, string];
  fg: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaBg: string;
  ctaFg: string;
  href: string;
}

export const heroSlides: HeroSlide[] = [
  {
    colors: ['#531625', '#762237'],
    fg: '#ffffff',
    eyebrow: 'YANGI KOLLEKSIYA · 2026',
    title: "Premium brendlar qo'lingizda",
    subtitle: 'Nike, Chanel, Dior — 30% gacha chegirma',
    cta: 'Xarid qilish',
    ctaBg: '#ffffff',
    ctaFg: '#531625',
    href: '/catalog',
  },
  {
    colors: ['#0A0A0C', '#16161A'],
    fg: '#ffffff',
    eyebrow: 'SELLO COINS',
    title: 'Har xariddan 1% cashback',
    subtitle: "Tanga yig'ing, keyingi xaridda ishlating",
    cta: 'Batafsil',
    ctaBg: '#C9A961',
    ctaFg: '#3A0E19',
    href: '/profile/loyalty',
  },
  {
    colors: ['#3A0E19', '#531625'],
    fg: '#ffffff',
    eyebrow: 'GLOBAL BOZOR',
    title: 'Xitoy · Turkiya · Koreya',
    subtitle: '10 kundan yetkazib beramiz',
    cta: "Ko'rish",
    ctaBg: '#ffffff',
    ctaFg: '#531625',
    href: '/catalog',
  },
];

// ─── Kategoriya tint ranglari (slug bo'yicha) ────────────────────
export const categoryTint: Record<string, string> = {
  clothing: '#FBF2F4',
  shoes: '#FAEEDA',
  perfume: '#FBEAF0',
  cosmetics: '#E6F1FB',
  beauty: '#E1F5EE',
  accessories: '#EEEDFE',
  global: '#F1EFE8',
  all: '#FAECE7',
};

// ─── Global rejim kategoriyalari (ikon emoji bilan) ──────────────
export interface GlobalCat {
  slug: string;
  label: string;
  emoji: string;
  tint: string;
}

export const globalCats: GlobalCat[] = [
  { slug: 'accessories', label: 'Elektronika', emoji: '🎧', tint: '#E6F1FB' },
  { slug: 'clothing', label: 'Kiyim', emoji: '🧥', tint: '#FBF2F4' },
  { slug: 'beauty', label: "Go'zallik", emoji: '🧴', tint: '#E1F5EE' },
  { slug: 'shoes', label: 'Poyabzal', emoji: '👟', tint: '#FAEEDA' },
  { slug: 'cosmetics', label: 'Kosmetika', emoji: '💄', tint: '#FBEAF0' },
  { slug: 'perfume', label: 'Atirlar', emoji: '🌸', tint: '#EEEDFE' },
  { slug: 'accessories', label: 'Gadjetlar', emoji: '📱', tint: '#F1EFE8' },
  { slug: 'all', label: 'Barchasi', emoji: '🛍️', tint: '#FAECE7' },
];

// ─── Mashhur brendlar ────────────────────────────────────────────
export const popularBrands = ['Nike', 'Adidas', 'Chanel', 'Dior', 'Gucci', 'Prada', 'Puma', 'Zara'];

// ─── Davlat metama'lumoti (Global rejim rail sarlavhalari) ───────
export const countryMeta: Record<'CN' | 'TR' | 'KR', { flag: string; label: string }> = {
  CN: { flag: '🇨🇳', label: 'Xitoydan mashhur' },
  TR: { flag: '🇹🇷', label: 'Turkiyadan' },
  KR: { flag: '🇰🇷', label: 'Koreyadan mashhur' },
};

// ─── Rejim metama'lumoti (mode switch sheet + header) ────────────
export const modeMeta: Record<ShopMode, { title: string; subtitle: string }> = {
  local: { title: 'Sellobay Lokal', subtitle: "O'zbekiston sotuvchilari · uygacha yetkazish" },
  global: { title: 'Sellobay Global', subtitle: 'Xitoy · Turkiya · Koreya · so‘mda narx' },
};
