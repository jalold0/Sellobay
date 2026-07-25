import { ORDER_STATUS_TONE as UI_TONE, type StatusTone } from '@ecom/ui';

// Status matnlari i18n'da: `order.status.*` (useTranslations('order.status'))
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_TONE = UI_TONE as Record<OrderStatus, StatusTone>;
