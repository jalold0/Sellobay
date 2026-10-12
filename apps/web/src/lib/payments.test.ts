import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildClickUrl, buildPaymeUrl, orderReturnUrl } from './payments';

const ORDER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';

describe('to`lovdan qaytish manzili', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://sellobay.uz/');
    vi.stubEnv('CLICK_SERVICE_ID', '1');
    vi.stubEnv('CLICK_MERCHANT_ID', '2');
    vi.stubEnv('PAYME_MERCHANT_ID', 'merchant');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('orderReturnUrl — buyurtma identifikatori `order` parametrida (oxiridagi `/` olib tashlanadi)', () => {
    expect(orderReturnUrl(ORDER_ID)).toBe(`https://sellobay.uz/orders/success?order=${ORDER_ID}`);
  });

  it('orderReturnUrl — identifikator URL uchun kodlanadi', () => {
    expect(orderReturnUrl('a b&c')).toBe('https://sellobay.uz/orders/success?order=a%20b%26c');
  });

  it('Click return_url ichida buyurtma bor', () => {
    const url = new URL(buildClickUrl({ orderId: ORDER_ID, amountSom: 1000 }));

    expect(url.searchParams.get('return_url')).toBe(orderReturnUrl(ORDER_ID));
    // Webhook uchun transaction_param o'zgarmadi.
    expect(url.searchParams.get('transaction_param')).toBe(ORDER_ID);
  });

  it('Payme `c=` parametrida buyurtma bor', () => {
    const url = buildPaymeUrl({ orderId: ORDER_ID, amountSom: 1000 });
    const encoded = url.split('/').pop() ?? '';
    const raw = Buffer.from(encoded, 'base64').toString('utf8');

    expect(raw).toContain(`c=${orderReturnUrl(ORDER_ID)}`);
    expect(raw).toContain(`ac.order_id=${ORDER_ID}`);
  });
});
