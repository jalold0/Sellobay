import { t as translate } from '@ecom/i18n';
import * as React from 'react';

import { useLocale } from '../store/locale';

export function useT() {
  const locale = useLocale((s) => s.locale);
  // useCallback → `t` locale o'zgarmaguncha barqaror bo'ladi. Bu memoizatsiyani
  // (React.memo bilan o'ralgan bolalar) `t` prop o'zgargani sabab buzilishidan saqlaydi.
  const t = React.useCallback((key: string) => translate(key, locale), [locale]);
  return { locale, t };
}
