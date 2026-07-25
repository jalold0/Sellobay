// GET /api/payment-cards — checkout uchun platforma to'lov kartalari (qo'lda karta to'lovi).

import { apiOk } from '@/lib/auth/errors';
import { getPaymentCards } from '@/lib/manual-payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return apiOk({ cards: getPaymentCards() });
}
