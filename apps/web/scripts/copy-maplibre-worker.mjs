// maplibre-gl (v6) xaritani alohida Web Worker'da chizadi. Worker fayli
// sayt bilan BIR domendan yuklanishi shart (brauzer begona domendan
// worker ochmaydi), Next.js bundler esa uning manzilini to'g'ri qo'ya
// olmaydi. Shuning uchun dev/build oldidan ikki fayl `public/` ga
// nusxalanadi va komponent `setWorkerUrl()` bilan shu manzilni beradi.
//
// Papka versiya bilan nomlanadi: kutubxona yangilansa brauzer keshidagi
// eski worker yangi asosiy kod bilan aralashmaydi.
//
// Nusxa git'ga kirmaydi (public/vendor/ — .gitignore).

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('maplibre-gl/package.json'));
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

const dest = join(here, '..', 'public', 'vendor', 'maplibre', version);
mkdirSync(dest, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(pkgDir, 'dist', file), join(dest, file));
}
console.info(`[maplibre] worker → public/vendor/maplibre/${version}/`);
