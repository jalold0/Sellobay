'use client';

// Topshirish jurnali (ADR 0017): posilka kimning qo'lida, qachon va QANDAY o'tgani.
//
// Bahsda («kuryer olib kelmadi», «posilka bo'sh edi») admin shu yerga qaraydi: yorliq
// skanerlanganmi, mijozga kod bilan berilganmi yoki kodsiz (surat bilan) qoldirilganmi.

import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@ecom/ui';
import { MapPin, Printer } from 'lucide-react';
import * as React from 'react';

import { formatDateTime } from '../../lib/format';

import type { AdminOrderDetail, CustodyMethodValue } from '@/lib/auth/client';

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Kuryerga biriktirildi',
  PICKED_UP: 'Ombordan olindi',
  IN_TRANSIT: 'Yo‘lga chiqdi',
  ARRIVED: 'Manzilga yetdi',
  DELIVERED: 'Mijozga topshirildi',
  FAILED: 'Bajarilmadi',
  RETURNED: 'Qaytarildi',
};

const METHOD_LABEL: Record<CustodyMethodValue, string> = {
  MANUAL: 'tugma bilan',
  SCAN: 'yorliq skanerlandi',
  QR: 'mijoz QR kodi',
  CODE: 'mijoz aytgan kod',
  PHOTO: 'kodsiz, surat bilan',
};

export function CustodyCard({ custody }: { custody: NonNullable<AdminOrderDetail['custody']> }) {
  const photoHandover = custody.handoverMethod === 'PHOTO';
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">
          Topshirish jurnali
          {custody.parcelCode ? (
            <span className="text-muted-foreground ml-2 font-normal">{custody.parcelCode}</span>
          ) : null}
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <a
            href={`/labels/print?format=thermal&ids=${custody.deliveryId}`}
            target="_blank"
            rel="noreferrer"
          >
            <Printer size={14} className="mr-1" />
            Yorliq
          </a>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {photoHandover ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
            Mijozga kodsiz topshirilgan — sabab va suratni tekshiring.
          </p>
        ) : null}
        {custody.handoverAttempts > 0 && custody.handoverMethod !== 'CODE' ? (
          <p className="text-muted-foreground text-xs">
            Noto‘g‘ri kod urinishlari: {custody.handoverAttempts}
          </p>
        ) : null}
        {custody.events.length === 0 ? (
          <p className="text-muted-foreground">Hali hech kim olmagan.</p>
        ) : (
          <ol className="relative space-y-3 border-l pl-4">
            {custody.events.map((e, i) => (
              <li key={`${e.status}-${e.at}-${i}`} className="relative">
                <span
                  className={cn(
                    'bg-background absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2',
                    e.method === 'PHOTO' ? 'border-amber-500' : 'border-brand-bordeaux',
                  )}
                />
                <div className="font-medium">
                  {STATUS_LABEL[e.status] ?? e.status}
                  {e.method ? (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      — {METHOD_LABEL[e.method]}
                    </span>
                  ) : null}
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                  <span>{formatDateTime(e.at)}</span>
                  {e.actor ? <span>{e.actor}</span> : null}
                  {e.location ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${e.location.lat}&mlon=${e.location.lng}#map=17/${e.location.lat}/${e.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 hover:underline"
                    >
                      <MapPin size={11} />
                      joylashuv
                    </a>
                  ) : null}
                </div>
                {e.note ? <div className="mt-0.5 text-xs">{e.note}</div> : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
