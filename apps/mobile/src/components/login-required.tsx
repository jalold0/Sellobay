// Login talab qilinadigan ekranlar uchun umumiy "kirish kerak" holati.
// (orders / addresses / payment / edit — bir xil blokni takrorlamaslik uchun)
import { useRouter } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import * as React from 'react';

import { useT } from '../lib/useT';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';

export function LoginRequired() {
  const router = useRouter();
  const { t } = useT();
  return (
    <EmptyState
      icon={<LogIn size={26} color="#94a3b8" />}
      title={t('nav.login')}
      description={t('auth.noAccount')}
      action={
        <Button onPress={() => router.push('/auth/login')} fullWidth>
          {t('nav.login')}
        </Button>
      }
    />
  );
}
