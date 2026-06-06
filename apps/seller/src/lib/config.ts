// Sotuvchi panel konfiguratsiyasi
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  apiVersion: 'v1',
  appName: 'Sotuvchi paneli',
  defaultLocale: 'uz' as const,
  defaultCurrency: 'UZS' as const,
  pageSize: 20,
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK !== 'false',
  tokenStorageKey: 'ecom_seller_token',
  refreshTokenStorageKey: 'ecom_seller_refresh',
  themeStorageKey: 'ecom_seller_theme',
} as const;
