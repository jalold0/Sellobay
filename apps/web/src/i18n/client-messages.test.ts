import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import uz from '../../../../packages/i18n/src/locales/uz.json';

import { BASE_NAMESPACES, pickMessages, ROUTE_NAMESPACES } from './client-messages';

import type { AbstractIntlMessages } from 'next-intl';

const SRC = join(__dirname, '..');
const APP = join(SRC, 'app', '[locale]');

// ---- Import grafi ------------------------------------------------------------

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null; // paketlar (@ecom/ui ...) next-intl ishlatmaydi
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

type FileInfo = { imports: string[]; client: boolean; namespaces: Set<string> };
const infoCache = new Map<string, FileInfo>();

function fileInfo(file: string): FileInfo {
  const cached = infoCache.get(file);
  if (cached) return cached;
  const src = readFileSync(file, 'utf8');
  const imports: string[] = [];
  for (const m of src.matchAll(
    /(?:import|export)\s+(type\s+)?(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
  )) {
    if (m[1]) continue; // `import type` — runtime'da yo'q
    const r = resolveImport(file, m[2]!);
    if (r) imports.push(r);
  }
  for (const m of src.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const r = resolveImport(file, m[1]!);
    if (r) imports.push(r);
  }
  const client = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(src);
  const namespaces = new Set<string>();
  for (const m of src.matchAll(/useTranslations\(\s*['"]([\w.]+)['"]\s*\)/g)) {
    namespaces.add(m[1]!.split('.')[0]!);
  }
  // Nomsiz `useTranslations()` — kalitlar `t('ns.key')` ko'rinishida.
  if (/useTranslations\(\s*\)/.test(src)) {
    for (const m of src.matchAll(/\bt\(\s*['"](\w+)\.[\w.]+['"]/g)) namespaces.add(m[1]!);
  }
  const info = { imports, client, namespaces };
  infoCache.set(file, info);
  return info;
}

/** Route faylidan yetib boriladigan client komponentlar ishlatadigan bo'limlar. */
function clientNamespaces(entry: string): Map<string, string> {
  const used = new Map<string, string>(); // ns -> birinchi uchragan fayl
  const seen = new Set<string>();
  const stack: Array<[string, boolean]> = [[entry, false]];
  while (stack.length) {
    const [file, parentClient] = stack.pop()!;
    const key = `${file}|${parentClient}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const info = fileInfo(file);
    // Client chegarasidan keyingi hamma narsa brauzerda ishlaydi.
    const client = parentClient || info.client;
    if (client) {
      for (const ns of info.namespaces) if (!used.has(ns)) used.set(ns, relative(SRC, file));
    }
    for (const dep of info.imports) stack.push([dep, client]);
  }
  return used;
}

// ---- Route'lar va scope'lar ---------------------------------------------------

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routeFiles(p);
    return /^(page|layout|error|not-found|loading|template)\.tsx$/.test(name) ? [p] : [];
  });
}

/** Faylda `<IntlScope scope="...">` bo'lsa — o'sha scope. */
function declaredScope(file: string): string | null {
  return readFileSync(file, 'utf8').match(/<IntlScope\s+scope="(\w+)"/)?.[1] ?? null;
}

/**
 * Route fayli ko'radigan provider: o'zidagi scope, aks holda shu segment va undan
 * yuqoridagi layout'lardagi eng yaqin scope, bo'lmasa root (BASE).
 */
function effectiveNamespaces(file: string): { scope: string; namespaces: readonly string[] } {
  const own = declaredScope(file);
  if (own)
    return { scope: own, namespaces: ROUTE_NAMESPACES[own as keyof typeof ROUTE_NAMESPACES] };
  let dir = dirname(file);
  while (dir.startsWith(APP) && dir !== APP) {
    const layout = join(dir, 'layout.tsx');
    if (layout !== file && existsSync(layout)) {
      const s = declaredScope(layout);
      if (s) return { scope: s, namespaces: ROUTE_NAMESPACES[s as keyof typeof ROUTE_NAMESPACES] };
    }
    dir = dirname(dir);
  }
  return { scope: 'BASE', namespaces: BASE_NAMESPACES };
}

describe('client tarjima bo`limlari', () => {
  const routes = routeFiles(APP);

  it.each(routes.map((f) => [relative(APP, f).split(sep).join('/'), f]))(
    '%s — client komponentlarga kerakli bo`limlar provider`da bor',
    (_name, file) => {
      const { scope, namespaces } = effectiveNamespaces(file);
      const missing = [...clientNamespaces(file)]
        .filter(([ns]) => !namespaces.includes(ns))
        .map(([ns, where]) => `${ns} (${where}) → scope "${scope}"`);
      expect(missing).toEqual([]);
    },
  );

  it('har bir scope kamida bitta route`da ishlatiladi', () => {
    const declared = new Set(routes.map(declaredScope).filter(Boolean));
    for (const scope of Object.keys(ROUTE_NAMESPACES)) expect(declared).toContain(scope);
  });

  it('ro`yxatdagi bo`limlar lug`atda mavjud', () => {
    const all = [...BASE_NAMESPACES, ...Object.values(ROUTE_NAMESPACES).flat()];
    for (const ns of all) expect(Object.keys(uz)).toContain(ns);
  });

  it('root`ga lug`atning kichik bir qismigina ketadi', () => {
    const base = pickMessages(uz as unknown as AbstractIntlMessages, BASE_NAMESPACES);
    expect(Object.keys(base).sort()).toEqual([...BASE_NAMESPACES].sort());
    expect(base).not.toHaveProperty('courier');
    expect(JSON.stringify(base).length).toBeLessThan(JSON.stringify(uz).length * 0.15);
  });
});
