import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Vitest konfiguratsiyasi.
 *
 * NEGA KERAK: ilgari fayl umuman yo'q edi va vitest standart sozlama
 * bilan ishlardi — ya'ni `tsconfig.json` dagi `@/*` taqsimi haqida
 * bilmasdi. Shu sababli `@/lib/db` ni import qiladigan modulni
 * (masalan `*-server.ts` qatlamini) testdan chaqirib bo'lmasdi:
 * «Cannot find package '@/lib/db'». Mavjud testlar faqat nisbiy
 * import ishlatgani uchun muammo sezilmay kelgan.
 *
 * Taqsim `tsconfig.json` bilan BIR XIL bo'lishi shart — ikkisi
 * ajralib ketsa, test o'tib build yiqiladi (yoki aksincha).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
