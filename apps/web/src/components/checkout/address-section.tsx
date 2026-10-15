'use client';

// Manzil bo'limi: kim oladi (ism, telefon) va QAYERGA.
//
// Avval hudud tanlanadi (mobil ilova bilan bir xil ro'yxat, @ecom/core-domain
// UZ_REGIONS). Toshkent shahri — uygacha: saqlangan manzil yoki xaritadagi
// nuqta, so'ng ko'cha/uy. Boshqa hudud — manzil maydonlari kerak emas,
// filial pastdagi «Yetkazish usuli» bo'limida tanlanadi.
//
// State egasi CheckoutFlow; bu komponent faqat props orqali o'qiydi/yozadi.

import { UZ_REGIONS, regionAllowsHomeDelivery, type UzRegionSlug } from '@ecom/core-domain';
import { Check, MapPin, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { MapPickerDialog, type PickedPoint } from '../map/map-picker-dialog';

import { TextField } from './checkout-ui';

import type { AddressForm, SavedAddressDTO } from './checkout-types';
import type { MapPoint } from '../map/sellobay-map';

interface Props {
  address: AddressForm;
  onChange: (next: AddressForm) => void;
  regionSlug: UzRegionSlug;
  onRegion: (slug: UzRegionSlug) => void;
  point: MapPoint | null;
  onPoint: (p: PickedPoint | null) => void;
  saved: SavedAddressDTO[];
  onUseSaved: (a: SavedAddressDTO) => void;
  /** GLOBAL buyurtma — kargo istalgan manzilga olib boradi, hudud cheklovi yo'q. */
  isGlobalOrder?: boolean;
}

export function AddressSection({
  address,
  onChange,
  regionSlug,
  onRegion,
  point,
  onPoint,
  saved,
  onUseSaved,
  isGlobalOrder = false,
}: Props) {
  const t = useTranslations('checkout');
  const tr = useTranslations('regions');
  const [mapOpen, setMapOpen] = React.useState(false);
  const home = isGlobalOrder || regionAllowsHomeDelivery(regionSlug);

  // Saqlangan manzillardan faqat tanlangan hududdagilari.
  const savedHere = saved.filter((a) => a.regionSlug === regionSlug);

  return (
    <section className="border-border rounded-[18px] border bg-white p-6 md:p-7">
      <h2 className="text-brand-ink mb-5 text-xl font-bold">{t('destination.title')}</h2>

      <div className="mb-5">
        <label
          htmlFor="checkout-region"
          className="text-brand-ink mb-1.5 block text-xs font-semibold"
        >
          {t('destination.regionLabel')}
        </label>
        <select
          id="checkout-region"
          value={regionSlug}
          onChange={(e) => onRegion(e.target.value as UzRegionSlug)}
          className="border-border text-brand-ink focus:border-primary focus:ring-primary/15 h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none transition focus:ring-2"
        >
          {UZ_REGIONS.map((r) => (
            <option key={r.slug} value={r.slug}>
              {tr(r.slug)}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground mt-1.5 text-xs">
          {home ? t('destination.homeHint') : t('destination.pickupOnly')}
        </p>
      </div>

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
          className="sm:col-span-2"
        />
      </div>

      {home && (
        <div className="mt-5 space-y-3.5">
          {savedHere.length > 0 && (
            <div>
              <div className="text-brand-ink mb-2 text-xs font-semibold">
                {t('destination.savedTitle')}
              </div>
              <div className="flex flex-wrap gap-2">
                {savedHere.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onUseSaved(a)}
                    className="border-border hover:border-primary/40 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-left text-xs"
                  >
                    <MapPin className="text-primary h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{a.label || a.street}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Xaritadagi nuqta — kuryer aniq eshikka keladi, server hududni koordinata bo'yicha tekshiradi. */}
          {point ? (
            <div className="bg-primary/5 border-primary/20 flex items-center gap-3 rounded-xl border p-3">
              <Check className="text-primary h-4 w-4 shrink-0" />
              <span className="text-brand-ink min-w-0 flex-1 text-sm">
                {t('destination.pointChosen')}
                <span className="text-muted-foreground block truncate text-xs">
                  {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('destination.mapChange')}
              </button>
            </div>
          ) : (
            !isGlobalOrder && (
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="border-primary/40 text-primary hover:bg-primary/5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-semibold transition"
              >
                <MapPin className="h-4 w-4" />
                {t('destination.mapPick')}
              </button>
            )
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
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
        </div>
      )}

      <MapPickerDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        initial={point}
        onConfirm={(p) => {
          onPoint(p);
          // Bo'sh maydonlarni xaritadagi manzil bilan to'ldiramiz — mijoz
          // yozganini ustidan yozmaymiz.
          onChange({
            ...address,
            city: address.city.trim() || p.district,
            street:
              address.street.trim() || [p.street, p.house].filter(Boolean).join(', ') || p.label,
          });
        }}
      />
    </section>
  );
}
