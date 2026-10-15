'use client';

// Posilka yorlig'i — 58×40 mm termo yorliq (ADR 0017).
//
// Termoprinter faqat QORA va OQ chiqaradi: kulrang, rang va soya yo'q, hamma o'lcham mm'da.
// Eng muhimi — QR (kuryer skanerlaydi) va posilka kodi (yorliq yirtilsa qo'lda teriladi).
// Naqd pul bo'lsa summa teskari (oq-qora) blokda: kuryer uni qo'l uzatganda ham ko'rsin.

import QRCode from 'qrcode';
import * as React from 'react';

import { formatMoney } from '../../lib/format';

export interface ParcelLabelData {
  deliveryId: string;
  parcelCode: string;
  qrPayload: string;
  orderNumber: string;
  recipient: string | null;
  phoneTail: string | null;
  area: string;
  pieces: number;
  codAmount: string | null;
}

/** QR SVG'larini oldindan yasaydi — chop etish oynasi rasm tayyor bo'lgandan keyin ochilsin. */
export async function buildQrSvgs(labels: ParcelLabelData[]): Promise<Map<string, string>> {
  const pairs = await Promise.all(
    labels.map(
      async (l) =>
        [
          l.deliveryId,
          await QRCode.toString(l.qrPayload, {
            type: 'svg',
            margin: 0,
            // Yorliq ishqalanadi, burchagi yirtiladi — Q darajasi ~25% shikastni ko'taradi.
            errorCorrectionLevel: 'Q',
            color: { dark: '#000000', light: '#ffffff' },
          }),
        ] as const,
    ),
  );
  return new Map(pairs);
}

export function ParcelLabel({ label, qrSvg }: { label: ParcelLabelData; qrSvg: string }) {
  const [head, tail] = label.parcelCode.replace(/^SB-/, '').split('-');
  return (
    <div className="parcel-label">
      <div className="parcel-label__top">
        <div
          className="parcel-label__qr"
          // eslint-disable-next-line react/no-danger -- SVG `qrcode` kutubxonasi yasagan, matn bizniki
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="parcel-label__id">
          <div className="parcel-label__brand">Sellobay</div>
          <div className="parcel-label__code">
            {head}
            <br />
            {tail}
          </div>
          <div className="parcel-label__order">{label.orderNumber}</div>
        </div>
      </div>
      <div className="parcel-label__to">
        <span className="parcel-label__name">
          {label.recipient ?? '—'}
          {label.phoneTail ? ` ···${label.phoneTail}` : ''}
        </span>
        <span>{label.pieces} dona</span>
      </div>
      <div className="parcel-label__area">{label.area}</div>
      {label.codAmount ? (
        <div className="parcel-label__cod">Naqd: {formatMoney(label.codAmount)}</div>
      ) : (
        <div className="parcel-label__paid">To‘langan</div>
      )}
    </div>
  );
}

/** Yorliq uslubi — mm'da, faqat qora/oq. Ekranda ham chop etishdagidek ko'rinadi. */
export const PARCEL_LABEL_CSS = `
.parcel-label {
  box-sizing: border-box;
  width: 58mm;
  height: 40mm;
  padding: 2mm 2.5mm;
  background: #fff;
  color: #000;
  font-family: Inter, system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 0.8mm;
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
}
.parcel-label__top { display: flex; gap: 2mm; align-items: flex-start; }
.parcel-label__qr { width: 21mm; height: 21mm; flex: none; }
.parcel-label__qr svg { width: 100%; height: 100%; display: block; }
.parcel-label__id { min-width: 0; display: flex; flex-direction: column; }
.parcel-label__brand { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 8pt; line-height: 1; }
.parcel-label__code { font-weight: 800; font-size: 15pt; line-height: 1.02; letter-spacing: 0.04em; margin-top: 0.8mm; font-variant-numeric: tabular-nums; }
.parcel-label__order { font-size: 6.5pt; margin-top: 0.6mm; }
.parcel-label__to { display: flex; justify-content: space-between; gap: 2mm; font-size: 7.5pt; font-weight: 700; }
.parcel-label__name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.parcel-label__area { font-size: 6.5pt; line-height: 1.15; max-height: 2.3em; overflow: hidden; }
.parcel-label__cod { margin-top: auto; background: #000; color: #fff; font-weight: 800; font-size: 8.5pt; padding: 0.6mm 1.5mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.parcel-label__paid { margin-top: auto; border: 0.3mm solid #000; font-weight: 700; font-size: 7pt; padding: 0.3mm 1.5mm; align-self: flex-start; }
`;
