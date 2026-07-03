// To'lov webhook simulyatsiyasi uchun umumiy yordamchilar.
// Merchant kassa/kalitsiz — o'zimiz belgilagan TEST secret bilan lokal
// /api/payments/* endpointlariga Click/Payme so'rovlarini yuboradi.
//
// Ishlatish: README.md ga qarang.

import { createHash } from 'node:crypto';

export const BASE = process.env.BASE_URL || 'http://localhost:3000';

let failures = 0;
export function log(ok, msg, extra) {
  const tag = ok ? '✅' : '❌';
  const tail = extra !== undefined ? ' → ' + JSON.stringify(extra) : '';
  console.log(`${tag} ${msg}${tail}`);
  if (!ok) failures++;
}
export function done() {
  console.log(failures === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${failures} ta TEST YIQILDI ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

/** Guest buyurtma yaratadi (loyalty'ga tegmaydi). {id, grandTotalSom, number} qaytaradi. */
export async function createTestOrder(provider = 'CLICK') {
  const pr = await fetch(`${BASE}/api/products?limit=1`);
  const pj = await pr.json();
  const product = pj.items?.[0];
  if (!product) throw new Error('Mahsulot topilmadi — avval DB seed qiling');

  const body = {
    items: [{ productId: product.id, quantity: 1 }],
    recipientName: 'Test Xaridor',
    phone: '+998901234567',
    region: 'Toshkent',
    city: 'Toshkent',
    street: 'Test ko‘chasi 1',
    deliveryMethod: 'HOME_DELIVERY', // lat/lng bermaymiz → zona tekshiruvi o'tkazib yuboriladi
    paymentProvider: provider,
  };
  const or = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const oj = await or.json();
  if (!oj.success) throw new Error('Order create yiqildi: ' + JSON.stringify(oj));
  const order = oj.data.order;
  return { id: order.id, grandTotalSom: Number(order.grandTotal), number: order.number };
}

export function clickSign({
  clickTransId,
  serviceId,
  secret,
  merchantTransId,
  merchantPrepareId = '',
  amount,
  action,
  signTime,
}) {
  const base =
    clickTransId +
    serviceId +
    secret +
    merchantTransId +
    (action === '1' ? merchantPrepareId : '') +
    amount +
    action +
    signTime;
  return createHash('md5').update(base).digest('hex');
}

export async function postForm(path, params) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  return r.json();
}

/** Payme JSON-RPC so'rovi. key noto'g'ri berilsa auth xatosini test qilish mumkin. */
export async function rpc(path, key, method, params, id = 1) {
  const auth = 'Basic ' + Buffer.from(`Paycom:${key}`).toString('base64');
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  return r.json();
}
