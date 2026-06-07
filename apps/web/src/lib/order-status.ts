import { ORDER_STATUS_TONE as UI_TONE, type StatusTone } from '@ecom/ui';

export const ORDER_STATUS_LABELS = {
  PENDING: 'Kutilmoqda',
  CONFIRMED: 'Tasdiqlandi',
  PAID: "To`landi",
  PROCESSING: 'Tayyorlanmoqda',
  PACKED: "O`ralgan",
  SHIPPED: "Jo`natildi",
  OUT_FOR_DELIVERY: 'Yetkazib berishda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
  RETURNED: 'Qaytarildi',
  REFUNDED: 'Pul qaytarildi',
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_LABELS;

export const ORDER_STATUS_TONE = UI_TONE as Record<OrderStatus, StatusTone>;
