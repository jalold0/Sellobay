// Checkout umumiy tiplari va konstantalar — ekran (app/checkout) va
// seksiya komponentlari (shu papka) o'rtasida bo'linadi.
import { Check, CreditCard, Package, type MapPin } from 'lucide-react-native';

export type Step = 'delivery' | 'payment' | 'review';
export type DeliveryType = 'TASHKENT_HOME' | 'REGION_PICKUP';
export type HomeSpeed = 'STANDARD' | 'EXPRESS';

export const STEPS: Array<{ id: Step; label: string; icon: typeof MapPin }> = [
  { id: 'delivery', label: 'Yetkazish', icon: Package },
  { id: 'payment', label: "To'lov", icon: CreditCard },
  { id: 'review', label: 'Tasdiq', icon: Check },
];

export const PAYMENT_OPTIONS = [
  { id: 'CLICK', label: 'Click', sub: 'Tezkor mobil to`lov', emoji: '💳' },
  { id: 'PAYME', label: 'Payme', sub: 'Onlayn to`lov', emoji: '💰' },
  { id: 'UZUM_BANK', label: 'Uzum Bank', sub: 'Bank ilovasi', emoji: '🏦' },
  { id: 'UZCARD', label: 'Karta o`tkazma', sub: 'Kartaga o`tkazib, chek yuklaysiz', emoji: '💳' },
  { id: 'HUMO', label: 'Humo', sub: 'Plastik karta', emoji: '💳' },
  { id: 'CASH_ON_DELIVERY', label: 'Naqd', sub: 'Kuryerga', emoji: '💵' },
] as const;

export type PaymentId = (typeof PAYMENT_OPTIONS)[number]['id'];

// Qabul qiluvchi/manzil formasi — ekran state'ining shakli
export type AddressForm = {
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  city: string;
  street: string;
  apartment: string;
  latitude: number | null;
  longitude: number | null;
};

export function makeIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
