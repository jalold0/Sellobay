import { t } from '@ecom/i18n';

import { useLocale } from '../store/locale';

export function useT() {
  const locale = useLocale((s) => s.locale);
  return {
    locale,
    t: (key: string) => t(key, locale),
  };
}
