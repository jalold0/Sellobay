'use client';

// Yetkazish usuli bo'limi — checkout-flow.tsx'dan ajratilgan (JSX ko'chirildi,
// logika o'zgarmagan). State egasi CheckoutFlow.

import { SHIPPING_FEE, EXPRESS_FEE, FREE_SHIPPING_THRESHOLD } from '@ecom/core-domain';
import { MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatMoney } from '../../lib/format';
import type { DeliveryType, HomeSpeed, PickupPointDTO } from './checkout-types';
import { DeliveryRow } from './checkout-ui';

interface Props {
  deliveryType: DeliveryType;
  homeSpeed: HomeSpeed;
  subtotal: number;
  pickupPoints: PickupPointDTO[];
  selectedPickupId: string | null;
  selectedPickup: PickupPointDTO | null;
  onSelectHome: (speed: HomeSpeed) => void;
  onSelectPickup: () => void;
  onPickPoint: (id: string) => void;
}

export function ShippingSection({
  deliveryType,
  homeSpeed,
  subtotal,
  pickupPoints,
  selectedPickupId,
  selectedPickup,
  onSelectHome,
  onSelectPickup,
  onPickPoint,
}: Props) {
  const t = useTranslations('checkout');
  const locale = useLocale();

  const pickName = (n: PickupPointDTO['name']) =>
    typeof n === 'string' ? n : (n[locale] ?? n.uz ?? Object.values(n)[0] ?? '');

  return (
    <section className="border-border rounded-[18px] border bg-white p-6 md:p-7">
      <h2 className="text-brand-ink mb-[18px] font-serif text-xl font-semibold">
        {t('shipping.methodTitle')}
      </h2>
      <div className="flex flex-col gap-3">
        <DeliveryRow
          selected={deliveryType === 'TASHKENT_HOME' && homeSpeed === 'STANDARD'}
          onSelect={() => onSelectHome('STANDARD')}
          title={t('shipping.courierRow')}
          sub={t('shipping.courierWindow')}
          price={
            subtotal >= FREE_SHIPPING_THRESHOLD ? t('shipping.free') : formatMoney(SHIPPING_FEE)
          }
        />
        <DeliveryRow
          selected={deliveryType === 'REGION_PICKUP'}
          onSelect={onSelectPickup}
          title={t('shipping.pickupRow')}
          sub={
            selectedPickup
              ? [selectedPickup.city, selectedPickup.street].filter(Boolean).join(', ')
              : t('shipping.regionPickupSub')
          }
          price={t('shipping.freeBepul')}
          priceTone="success"
        />
        <DeliveryRow
          selected={deliveryType === 'TASHKENT_HOME' && homeSpeed === 'EXPRESS'}
          onSelect={() => onSelectHome('EXPRESS')}
          title={t('shipping.expressRow')}
          sub={t('shipping.expressTashkent')}
          price={formatMoney(EXPRESS_FEE)}
          chip={t('shipping.expressChip')}
        />
      </div>

      {/* REGION_PICKUP tanlanganda — punkt ro'yxati */}
      {deliveryType === 'REGION_PICKUP' && (
        <div className="mt-4 space-y-2">
          <div className="text-muted-foreground text-xs font-medium">
            {t('shipping.selectPickup')}
          </div>
          {pickupPoints.length === 0 ? (
            <div className="bg-muted text-muted-foreground rounded-xl p-3 text-xs">
              {t('shipping.pickupSoon')}
            </div>
          ) : (
            pickupPoints.map((p) => {
              const sel = selectedPickupId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPickPoint(p.id)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition ${
                    sel ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin
                      className={`mt-0.5 h-4 w-4 shrink-0 ${sel ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-ink flex-1 truncate text-sm font-semibold">
                          {pickName(p.name)}
                        </span>
                        <span className="bg-muted rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {p.provider}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {[p.region, p.city, p.street].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
