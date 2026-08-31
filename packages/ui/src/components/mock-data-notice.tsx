import { FlaskConical } from 'lucide-react';

import { cn } from '../lib/cn';

/**
 * "Bu sahifadagi ma'lumot namuna" ogohlantirishi.
 *
 * NEGA kerak: admin va sotuvchi panelining bir qismi hali bazaga ulanmagan va
 * namuna ma'lumot ustida ishlaydi. Belgisiz bunday sahifa haqiqiy hisobotdan
 * farq qilmaydi — sahifani ko'rgan odam (asoschi, investor, yangi hodim)
 * raqamlarga ishonib qaror qabul qilishi mumkin. Ogohlantirish shu xatoni
 * oldini oladi.
 *
 * Sahifa haqiqiy ma'lumotga ulangach, bu komponent o'sha sahifadan olib
 * tashlanadi — ya'ni u qolgan ishning ro'yxati vazifasini ham bajaradi.
 */
export function MockDataNotice({
  description,
  className,
}: {
  /** Bu sahifa aynan nimaga ulanishi kerakligi (ixtiyoriy). */
  description?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900',
        'dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200',
        className,
      )}
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">Namuna ma&apos;lumot — haqiqiy emas</p>
        <p className="mt-0.5 opacity-90">
          {description ??
            "Bu sahifa hali bazaga ulanmagan. Ko'rsatilgan raqamlar interfeysni sinash uchun yozilgan va qaror qabul qilishga yaramaydi."}
        </p>
      </div>
    </div>
  );
}
