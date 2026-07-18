// Checkout oqimi uchun umumiy tiplar — bo'limlar (address/shipping/payment/summary)
// va asosiy CheckoutFlow o'rtasida bo'linadi.

export interface AddressForm {
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  city: string;
  street: string;
  apartment: string;
  notes: string;
}

export type DeliveryType = 'TASHKENT_HOME' | 'REGION_PICKUP';
export type HomeSpeed = 'STANDARD' | 'EXPRESS';
export type PaymentProvider =
  | 'CLICK'
  | 'PAYME'
  | 'UZUM_BANK'
  | 'UZCARD'
  | 'HUMO'
  | 'CASH_ON_DELIVERY';

export interface PickupPointDTO {
  id: string;
  code: string;
  provider: string;
  name: Record<string, string> | string;
  region: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  workingHours: string | null;
}

export interface PaymentCardDTO {
  number: string;
  holder: string;
  bank?: string;
}
