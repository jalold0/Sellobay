// Click webhook simulyatsiyasi (Prepare → Complete + xato holatlar).
// Talab: dev server CLICK_SECRET_KEY (test qiymat) bilan ishga tushirilgan bo'lsin,
//        shu qiymat bu skript env'ida ham bo'lsin.

import { BASE, clickSign, createTestOrder, done, log, postForm, trackStatus } from './_helpers.mjs';

const secret = process.env.CLICK_SECRET_KEY;
if (!secret) {
  console.error('CLICK_SECRET_KEY env kerak (dev server bilan bir xil test qiymat).');
  process.exit(1);
}
const serviceId = process.env.CLICK_SERVICE_ID || 'test_service';
const signTime = '2026-07-03 12:00:00';
const P = '/api/payments/click';

console.log(`BASE = ${BASE}\n`);

// --- To'liq oqim: Prepare → Complete ---
const o1 = await createTestOrder('CLICK');
console.log(`Order #1: ${o1.id} — ${o1.grandTotalSom} so‘m`);
const ct1 = 'CLICK-TEST-' + Date.now();
const amount1 = String(o1.grandTotalSom);

let prep = clickSign({
  clickTransId: ct1,
  serviceId,
  secret,
  merchantTransId: o1.id,
  amount: amount1,
  action: '0',
  signTime,
});
let res = await postForm(P, {
  click_trans_id: ct1,
  service_id: serviceId,
  merchant_trans_id: o1.id,
  amount: amount1,
  action: '0',
  sign_time: signTime,
  sign_string: prep,
});
log(res.error === 0, 'Prepare (action=0) → OK', res);
const prepareId = res.merchant_prepare_id;

let comp = clickSign({
  clickTransId: ct1,
  serviceId,
  secret,
  merchantTransId: o1.id,
  merchantPrepareId: prepareId,
  amount: amount1,
  action: '1',
  signTime,
});
res = await postForm(P, {
  click_trans_id: ct1,
  service_id: serviceId,
  merchant_trans_id: o1.id,
  merchant_prepare_id: prepareId,
  amount: amount1,
  action: '1',
  // Click Complete'da har doim to'lov natijasini yuboradi: 0 = muvaffaqiyatli
  error: '0',
  error_note: 'Success',
  sign_time: signTime,
  sign_string: comp,
});
log(res.error === 0, 'Complete (action=1) → OK (PAID)', res);

// Idempotent — takroriy Complete → already paid (-4)
res = await postForm(P, {
  click_trans_id: ct1,
  service_id: serviceId,
  merchant_trans_id: o1.id,
  merchant_prepare_id: prepareId,
  amount: amount1,
  action: '1',
  error: '0',
  error_note: 'Success',
  sign_time: signTime,
  sign_string: comp,
});
log(res.error === -4, 'Complete takror → already paid (-4)', res);

// --- Noto'g'ri imzo → -1 ---
res = await postForm(P, {
  click_trans_id: ct1,
  service_id: serviceId,
  merchant_trans_id: o1.id,
  amount: amount1,
  action: '0',
  sign_time: signTime,
  sign_string: 'BADSIGN',
});
log(res.error === -1, 'Noto‘g‘ri imzo → SIGN FAILED (-1)', res);

// --- Noto'g'ri summa → -2 (yangi order) ---
const o2 = await createTestOrder('CLICK');
const ct2 = 'CLICK-TEST-' + Date.now() + '-2';
const badAmount = String(o2.grandTotalSom + 1000);
const s2 = clickSign({
  clickTransId: ct2,
  serviceId,
  secret,
  merchantTransId: o2.id,
  amount: badAmount,
  action: '0',
  signTime,
});
res = await postForm(P, {
  click_trans_id: ct2,
  service_id: serviceId,
  merchant_trans_id: o2.id,
  amount: badAmount,
  action: '0',
  sign_time: signTime,
  sign_string: s2,
});
log(res.error === -2, 'Noto‘g‘ri summa → incorrect amount (-2)', res);

// --- Mavjud bo'lmagan order → -5 ---
const ctX = 'CLICK-TEST-' + Date.now() + '-x';
const fakeId = '00000000-0000-0000-0000-000000000000';
const sX = clickSign({
  clickTransId: ctX,
  serviceId,
  secret,
  merchantTransId: fakeId,
  amount: '10000',
  action: '0',
  signTime,
});
res = await postForm(P, {
  click_trans_id: ctX,
  service_id: serviceId,
  merchant_trans_id: fakeId,
  amount: '10000',
  action: '0',
  sign_time: signTime,
  sign_string: sX,
});
log(res.error === -5, 'Mavjud bo‘lmagan order → not found (-5)', res);

// --- Click to'lovni bekor qilgan Complete (error < 0) → -9, buyurtma PENDING qoladi ---
// Click Complete'ni to'lov yiqilganda ham yuboradi (masalan -5017: mablag' yetarli emas).
// Imzo `error`ni qamramaydi, shuning uchun uni alohida o'qish SHART.
async function prepareOrder(order, transId) {
  const amount = String(order.grandTotalSom);
  const sign = clickSign({
    clickTransId: transId,
    serviceId,
    secret,
    merchantTransId: order.id,
    amount,
    action: '0',
    signTime,
  });
  const r = await postForm(P, {
    click_trans_id: transId,
    service_id: serviceId,
    merchant_trans_id: order.id,
    amount,
    action: '0',
    error: '0',
    error_note: 'Success',
    sign_time: signTime,
    sign_string: sign,
  });
  return r.merchant_prepare_id;
}
async function completeOrder(order, transId, prepareId, extra) {
  const amount = String(order.grandTotalSom);
  const sign = clickSign({
    clickTransId: transId,
    serviceId,
    secret,
    merchantTransId: order.id,
    merchantPrepareId: prepareId,
    amount,
    action: '1',
    signTime,
  });
  return postForm(P, {
    click_trans_id: transId,
    service_id: serviceId,
    merchant_trans_id: order.id,
    merchant_prepare_id: prepareId,
    amount,
    action: '1',
    sign_time: signTime,
    sign_string: sign,
    ...extra,
  });
}

const o3 = await createTestOrder('CLICK');
const ct3 = 'CLICK-TEST-' + Date.now() + '-fail';
const prep3 = await prepareOrder(o3, ct3);
res = await completeOrder(o3, ct3, prep3, { error: '-5017', error_note: 'Insufficient funds' });
log(res.error === -9, 'Complete error=-5017 → transaction cancelled (-9)', res);
let st = await trackStatus(o3.number);
log(st === 'PENDING', 'Yiqilgan Click to‘lovidan keyin buyurtma PENDING qoladi', st);

// Click `error`siz Complete yubormaydi — bunday so'rov PAID qilmasligi kerak
const ct3b = 'CLICK-TEST-' + Date.now() + '-noerr';
const prep3b = await prepareOrder(o3, ct3b);
res = await completeOrder(o3, ct3b, prep3b, {});
log(res.error === -8, 'Complete `error` maydonisiz → request error (-8)', res);
st = await trackStatus(o3.number);
log(st === 'PENDING', '`error`siz Complete buyurtmani PAID qilmaydi', st);

// Mijoz qayta to'laydi (yangi click_trans_id) — endi muvaffaqiyatli
const ct3c = 'CLICK-TEST-' + Date.now() + '-retry';
const prep3c = await prepareOrder(o3, ct3c);
res = await completeOrder(o3, ct3c, prep3c, { error: '0', error_note: 'Success' });
log(res.error === 0, 'Qayta urinish (error=0) → OK', res);
st = await trackStatus(o3.number);
log(st === 'PAID', 'Qayta urinishdan keyin buyurtma PAID', st);

done();
