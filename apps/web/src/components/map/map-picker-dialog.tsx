'use client';

// Xaritadan yetkazish nuqtasini tanlash (Toshkent shahri — uygacha).
//
// Pin bosilgan/surilgan joyga qo'yiladi, manzil matni serverdan
// (`/api/geo/reverse`) biroz kutib so'raladi. Toshkent shahridan tashqari
// nuqtada ogohlantirish chiqadi va tasdiqlash tugmasi o'chadi — server ham
// koordinata bo'yicha aynan shu qoidani tekshiradi (DELIVERY_OUT_OF_ZONE).

import { isInTashkentCity } from '@ecom/core-domain';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ecom/ui';
import { AlertTriangle, LocateFixed, MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { SellobayMap, TASHKENT_CENTER, type MapPoint } from './sellobay-map';

export interface PickedPoint extends MapPoint {
  street: string;
  house: string;
  district: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: MapPoint | null;
  onConfirm: (p: PickedPoint) => void;
}

interface GeoResult {
  street: string;
  house: string;
  district: string;
  label: string;
}

export function MapPickerDialog({ open, onOpenChange, initial, onConfirm }: Props) {
  const t = useTranslations('checkout.destination');
  const locale = useLocale();
  const [pin, setPin] = React.useState<MapPoint | null>(initial ?? null);
  const [center, setCenter] = React.useState<MapPoint>(initial ?? TASHKENT_CENTER);
  const [geo, setGeo] = React.useState<GeoResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [mapFailed, setMapFailed] = React.useState(false);
  const [locError, setLocError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setPin(initial ?? null);
      setCenter(initial ?? TASHKENT_CENTER);
      setLocError(null);
    }
  }, [open, initial]);

  // Pin to'xtagach 500 ms kutib so'raymiz — har surishda server urilmasin.
  React.useEffect(() => {
    if (!pin) {
      setGeo(null);
      return;
    }
    let active = true;
    setBusy(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/geo/reverse?lat=${pin.lat}&lng=${pin.lng}&lang=${locale}`)
        .then((r) => r.json() as Promise<{ success: boolean; data?: GeoResult }>)
        .then((json) => {
          if (active) setGeo(json.success && json.data ? json.data : null);
        })
        .catch(() => active && setGeo(null))
        .finally(() => active && setBusy(false));
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [pin, locale]);

  const locate = () => {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError(t('locationDenied'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPin(p);
        setCenter(p);
      },
      () => setLocError(t('locationDenied')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const outside = pin !== null && !isInTashkentCity(pin.lat, pin.lng);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('mapTitle')}</DialogTitle>
          <DialogDescription>{t('mapHint')}</DialogDescription>
        </DialogHeader>

        {mapFailed ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            {t('mapUnavailable')}
          </p>
        ) : (
          <div className="relative">
            <SellobayMap
              center={center}
              zoom={initial ? 16 : 12}
              pin={pin}
              onPick={setPin}
              onError={() => setMapFailed(true)}
              ariaLabel={t('mapTitle')}
              className="h-[min(60vh,420px)] w-full overflow-hidden rounded-xl"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={locate}
              className="absolute bottom-3 left-3 shadow-md"
            >
              <LocateFixed className="mr-1.5 h-4 w-4" />
              {t('useLocation')}
            </Button>
          </div>
        )}

        <div className="min-h-[3rem] text-sm" aria-live="polite">
          {locError && <p className="text-destructive text-xs">{locError}</p>}
          {pin &&
            (busy ? (
              <p className="text-muted-foreground">{t('locating')}</p>
            ) : (
              <p className="flex items-start gap-2">
                <MapPin className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <span>{geo?.label || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}</span>
              </p>
            ))}
          {outside && (
            <p className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              {t('outsideCity')}
            </p>
          )}
        </div>

        <Button
          type="button"
          className="w-full rounded-full"
          disabled={!pin || outside || busy}
          onClick={() => {
            if (!pin) return;
            onConfirm({
              ...pin,
              street: geo?.street ?? '',
              house: geo?.house ?? '',
              district: geo?.district ?? '',
              label: geo?.label ?? '',
            });
            onOpenChange(false);
          }}
        >
          {t('confirmPoint')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
