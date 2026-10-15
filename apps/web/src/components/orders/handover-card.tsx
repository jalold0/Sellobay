'use client';

import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import * as React from 'react';

export interface HandoverInfo {
  pin: string;
  qrPayload: string;
  parcelCode: string;
}

/**
 * Mijozga topshirish kodi (ADR 0017) — kuryer yo'lda bo'lganda.
 *
 * Kuryer QR'ni skanerlaydi yoki 4 raqamni so'raydi. Raqamlar yirik serif bilan —
 * telefonni kuryerga uzatmasdan, ovoz chiqarib o'qish oson bo'lsin.
 */
export function HandoverCard({ handover }: { handover: HandoverInfo }) {
  const t = useTranslations('handover');
  const [svg, setSvg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    // Kutubxona faqat bizning matnimizdan SVG yasaydi — tashqi kiritma yo'q.
    void QRCode.toString(handover.qrPayload, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((out) => {
      if (alive) setSvg(out);
    });
    return () => {
      alive = false;
    };
  }, [handover.qrPayload]);

  return (
    <section
      aria-labelledby="handover-title"
      className="border-brand-bordeaux/30 flex flex-col gap-5 rounded-[18px] border-2 border-dashed bg-white p-6 sm:flex-row sm:items-center md:p-7"
    >
      <div
        role="img"
        aria-label={t('qrAlt')}
        className="mx-auto h-40 w-40 shrink-0 sm:mx-0 [&>svg]:h-full [&>svg]:w-full"
        // eslint-disable-next-line react/no-danger -- SVG `qrcode` kutubxonasi yasagan, matn bizniki
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h2 id="handover-title" className="text-brand-ink text-lg font-bold">
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{t('hint')}</p>
        <div className="mt-4">
          <div className="text-muted-foreground text-[12px] font-semibold">{t('codeLabel')}</div>
          <div
            className="text-brand-bordeaux font-serif text-5xl font-bold tabular-nums tracking-[0.3em]"
            aria-label={handover.pin.split('').join(' ')}
          >
            {handover.pin}
          </div>
        </div>
        <div className="text-muted-foreground mt-2 text-xs">
          {t('parcel', { code: handover.parcelCode })}
        </div>
      </div>
    </section>
  );
}
