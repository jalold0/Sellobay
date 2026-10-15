'use client';

// Client komponentlar uchun qo'llab-quvvatlash kanallari (`/api/config` dan, bir marta).
// Server komponentlar `supportContacts()` ni to'g'ridan-to'g'ri chaqiradi.

import * as React from 'react';

import type { SupportContacts } from './support';

const EMPTY: SupportContacts = { phone: null, email: null, telegram: null };

let pending: Promise<SupportContacts> | null = null;

function loadSupport(): Promise<SupportContacts> {
  pending ??= fetch('/api/config')
    .then((r) => r.json() as Promise<{ data?: { support?: SupportContacts } }>)
    .then((j) => j.data?.support ?? EMPTY)
    // Yuklanmasa — kanal ko'rsatilmaydi (soxta raqam emas). Keyingi safar qayta urinadi.
    .catch(() => {
      pending = null;
      return EMPTY;
    });
  return pending;
}

/** Sozlanmagan kanallar `null` — ularni ko'rsatmang. */
export function useSupportContacts(): SupportContacts {
  const [support, setSupport] = React.useState<SupportContacts>(EMPTY);
  React.useEffect(() => {
    let alive = true;
    void loadSupport().then((s) => {
      if (alive) setSupport(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return support;
}
