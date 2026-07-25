'use client';

// Manzil bo'limi — checkout-flow.tsx'dan ajratilgan (JSX ko'chirildi, logika o'zgarmagan).
// State egasi CheckoutFlow; bu komponent faqat props orqali o'qiydi/yozadi.

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AddressForm } from './checkout-types';
import { TextField } from './checkout-ui';

interface Props {
  address: AddressForm;
  onChange: (next: AddressForm) => void;
  homeOutsideTashkent: boolean;
  onSwitchToPickup: () => void;
}

export function AddressSection({
  address,
  onChange,
  homeOutsideTashkent,
  onSwitchToPickup,
}: Props) {
  const t = useTranslations('checkout');

  return (
    <section className="border-border rounded-[18px] border bg-white p-6 md:p-7">
      <h2 className="text-brand-ink mb-5 font-serif text-xl font-semibold">{t('address.title')}</h2>

      {homeOutsideTashkent && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-xs leading-5 text-amber-800">{t('shipping.tashkentOnly')}</p>
            <button
              type="button"
              onClick={onSwitchToPickup}
              className="text-primary mt-1.5 text-xs font-semibold hover:underline"
            >
              {t('shipping.switchToPickup')}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <TextField
          label={t('address.firstName')}
          value={address.firstName}
          onChange={(v) => onChange({ ...address, firstName: v })}
        />
        <TextField
          label={t('address.lastName')}
          value={address.lastName}
          onChange={(v) => onChange({ ...address, lastName: v })}
        />
        <TextField
          label={t('address.phone')}
          value={address.phone}
          onChange={(v) => onChange({ ...address, phone: v })}
          placeholder={t('address.phonePlaceholder')}
        />
        <TextField
          label={t('address.region')}
          value={address.region}
          onChange={(v) => onChange({ ...address, region: v })}
          placeholder={t('address.regionPlaceholder')}
        />
        <TextField
          label={t('address.city')}
          value={address.city}
          onChange={(v) => onChange({ ...address, city: v })}
          placeholder={t('address.cityPlaceholder')}
        />
        <TextField
          label={t('address.street')}
          value={address.street}
          onChange={(v) => onChange({ ...address, street: v })}
          placeholder={t('address.streetPlaceholder')}
        />
        <TextField
          label={t('address.apartment')}
          value={address.apartment}
          onChange={(v) => onChange({ ...address, apartment: v })}
          placeholder={t('address.apartmentPlaceholder')}
          className="sm:col-span-2"
        />
        <TextField
          label={t('address.notes')}
          value={address.notes}
          onChange={(v) => onChange({ ...address, notes: v })}
          placeholder={t('address.notesPlaceholder')}
          className="sm:col-span-2"
        />
      </div>
    </section>
  );
}
