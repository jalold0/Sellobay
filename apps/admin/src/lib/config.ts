// Markaziy konfiguratsiya — barcha o'zgaruvchilar shu yerdan.
// Yangi env qo'shilsa shu fayl yangilanadi.

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  apiVersion: 'v1',
  appName: 'Admin Panel',
  defaultLocale: 'uz' as const,
  supportedLocales: ['uz', 'ru', 'en'] as const,
  defaultCurrency: 'UZS' as const,
  pageSize: 20,
  // Mock data orqali ishlash uchun (backend tayyor bo'lmaganda)
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK !== 'false',
  tokenStorageKey: 'ecom_admin_token',
  refreshTokenStorageKey: 'ecom_admin_refresh',
  themeStorageKey: 'ecom_admin_theme',
} as const;

export type AppConfig = typeof config;
