// Zod sxemalaridan `openapi.json` yasaydi.
//
// Fayl repoga COMMIT QILINADI: u shartnomaning qayd etilgan holati.
// Shunda sxema o'zgarganda diff'da aniq ko'rinadi — maydon qo'shildimi
// yoki olib tashlandimi, bu klientlarni sindiradimi yoki yo'q.
//
// Ishga tushirish (repo root'dan):
//   pnpm api:openapi

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';

import { registry } from '../src/registry.ts';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'openapi.json');

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Sellobay API',
    version: '1.0.0',
    description: [
      'Sellobay backend. Alohida mobil backend YO`Q — web sayti, admin,',
      'seller paneli va Flutter ilovalari AYNI shu API ga ulanadi.',
      '',
      'Barcha javoblar bitta konvertda: `{ success: true, data }` yoki',
      '`{ success: false, error: { code, message } }`.',
      '',
      'ISTISNO: to`lov webhook`lari (`/api/payments/click`, `/api/payments/payme`)',
      'to`lov tizimlarining O`Z protokolida javob beradi va bu konvertga',
      'o`tkazilmaydi — formatni ular belgilaydi.',
    ].join('\n'),
  },
  servers: [
    { url: 'https://sellobay-web.vercel.app', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Lokal' },
  ],
  tags: [
    { name: 'Katalog', description: 'Mahsulot, kategoriya, brend' },
    { name: 'Kuryer', description: 'Yetkazish topshiriqlari' },
  ],
});

writeFileSync(OUT, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

const paths = Object.keys(document.paths ?? {}).length;
const schemas = Object.keys(document.components?.schemas ?? {}).length;
console.log(`openapi.json — ${paths} ta yo'l, ${schemas} ta sxema`);
