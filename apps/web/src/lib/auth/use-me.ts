'use client';

// Joriy foydalanuvchi — sahifada BITTA so'rov.
//
// Ilgari header'dagi AuthMenu va savat sinxroni (StoreSync) har biri o'zi `/api/auth/me` ni
// chaqirardi: har sahifa ochilishida ikki so'rov (dev strict mode'da to'rt), ikkisi ham
// serverga borib-qaytardi. Endi ikkalasi bitta react-query kalitini o'qiydi.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { me, type AuthUser } from './client';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

/** `data`: foydalanuvchi, `null` — kirilmagan; `isPending` — hali ma'lum emas. */
export function useMe() {
  return useQuery<AuthUser | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      const res = await me();
      return res.success ? res.data.user : null;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Chiqishdan keyin keshni darhol «kirilmagan»ga o'tkazadi. */
export function useForgetMe() {
  const client = useQueryClient();
  return React.useCallback(() => client.setQueryData(ME_QUERY_KEY, null), [client]);
}
