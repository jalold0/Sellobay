import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import uz from '../../../../packages/i18n/src/locales/uz.json';

import { CLIENT_NAMESPACES, pickClientMessages } from './client-messages';

import type { AbstractIntlMessages } from 'next-intl';

/** `src` ichidagi barcha .ts/.tsx fayllar. */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('client tarjima bo`limlari', () => {
  const srcDir = join(__dirname, '..');
  const clientFiles = walk(srcDir).filter((f) =>
    /^\s*['"]use client['"]/.test(readFileSync(f, 'utf8')),
  );

  it('client komponentlar ishlatadigan har bir bo`lim ro`yxatda bor', () => {
    const used = new Set<string>();
    for (const f of clientFiles) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/useTranslations\(\s*['"]([\w.]+)['"]\s*\)/g)) {
        used.add(m[1]!.split('.')[0]!);
      }
      // Nomsiz `useTranslations()` — kalitlar `t('ns.key')` ko'rinishida.
      if (/useTranslations\(\s*\)/.test(src)) {
        for (const m of src.matchAll(/\bt\(\s*['"]([\w]+)\.[\w.]+['"]/g)) used.add(m[1]!);
      }
    }
    const missing = [...used].filter(
      (ns) => !(CLIENT_NAMESPACES as readonly string[]).includes(ns),
    );
    expect(missing).toEqual([]);
  });

  it('ro`yxatdagi bo`limlar lug`atda mavjud', () => {
    for (const ns of CLIENT_NAMESPACES) expect(Object.keys(uz)).toContain(ns);
  });

  it('client`ga lug`atning bir qismigina ketadi', () => {
    const picked = pickClientMessages(uz as unknown as AbstractIntlMessages);
    expect(Object.keys(picked).sort()).toEqual([...CLIENT_NAMESPACES].sort());
    expect(picked).not.toHaveProperty('courier');
    expect(JSON.stringify(picked).length).toBeLessThan(JSON.stringify(uz).length * 0.8);
  });
});
