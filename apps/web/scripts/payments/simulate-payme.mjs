// Payme Merchant API simulyatsiyasi — to'liq sikl + xato holatlar.
// Talab: dev server PAYME_KEY (test qiymat) bilan ishga tushirilgan bo'lsin,
//        shu qiymat bu skript env'ida ham bo'lsin.

import { BASE, createTestOrder, done, log, rpc } from './_helpers.mjs';

const key = process.env.PAYME_KEY;
if (!key) {
  console.error('PAYME_KEY env kerak (dev server bilan bir xil test qiymat).');
  process.exit(1);
}
const P = '/api/payments/payme';
const acc = (id) => ({ order_id: id });
const now = () => Date.now();

console.log(`BASE = ${BASE}\n`);

// --- 1) Perform sikli ---
const o1 = await createTestOrder('PAYME');
console.log(`Order #1: ${o1.id} — ${o1.grandTotalSom} so‘m`);
const amount1 = Math.round(o1.grandTotalSom * 100);
const tx1 = 'PAYME-TEST-' + now();

let r = await rpc(P, key, 'CheckPerformTransaction', { amount: amount1, account: acc(o1.id) });
log(r.result?.allow === true, 'CheckPerformTransaction → allow', r.result ?? r.error);

r = await rpc(P, key, 'CreateTransaction', { id: tx1, time: now(), amount: amount1, account: acc(o1.id) });
log(r.result?.state === 1, 'CreateTransaction → state 1', r.result ?? r.error);

r = await rpc(P, key, 'CreateTransaction', { id: tx1, time: now(), amount: amount1, account: acc(o1.id) });
log(r.result?.state === 1, 'CreateTransaction takror → idempotent', r.result ?? r.error);

r = await rpc(P, key, 'PerformTransaction', { id: tx1 });
log(r.result?.state === 2, 'PerformTransaction → state 2 (PAID)', r.result ?? r.error);

r = await rpc(P, key, 'PerformTransaction', { id: tx1 });
log(r.result?.state === 2, 'PerformTransaction takror → idempotent', r.result ?? r.error);

r = await rpc(P, key, 'CheckTransaction', { id: tx1 });
log(r.result?.state === 2, 'CheckTransaction → state 2', r.result ?? r.error);

// --- 2) Xato holatlar ---
r = await rpc(P, key, 'CheckPerformTransaction', { amount: amount1 + 100, account: acc(o1.id) });
log(r.error?.code === -31001, 'Noto‘g‘ri summa → -31001', r.error ?? r.result);

r = await rpc(P, key, 'CheckPerformTransaction', { amount: 10000, account: acc('00000000-0000-0000-0000-000000000000') });
log(r.error?.code === -31050, 'Mavjud bo‘lmagan order → -31050', r.error ?? r.result);

r = await rpc(P, 'WRONG_KEY', 'CheckTransaction', { id: tx1 });
log(r.error?.code === -32504, 'Noto‘g‘ri auth → -32504', r.error ?? r.result);

r = await rpc(P, key, 'UnknownMethod', {});
log(r.error?.code === -32601, 'Noma‘lum metod → -32601', r.error ?? r.result);

// order allaqachon PAID — yangi tranzaksiya yaratib bo'lmaydi
r = await rpc(P, key, 'CreateTransaction', { id: 'OTHER-' + now(), time: now(), amount: amount1, account: acc(o1.id) });
log(r.error?.code === -31052, 'To‘langan orderga yangi tx → -31052', r.error ?? r.result);

// --- 3) Cancel (perform'gacha) → state -1 ---
const o2 = await createTestOrder('PAYME');
const amount2 = Math.round(o2.grandTotalSom * 100);
const tx2 = 'PAYME-TEST-' + now() + '-2';
await rpc(P, key, 'CreateTransaction', { id: tx2, time: now(), amount: amount2, account: acc(o2.id) });
r = await rpc(P, key, 'CancelTransaction', { id: tx2, reason: 3 });
log(r.result?.state === -1, 'CancelTransaction (create) → state -1', r.result ?? r.error);
r = await rpc(P, key, 'CheckTransaction', { id: tx2 });
log(r.result?.state === -1 && r.result?.reason === 3, 'CheckTransaction → state -1, reason 3', r.result ?? r.error);

// --- 4) Cancel (perform'dan keyin) → state -2 (refund) ---
const o3 = await createTestOrder('PAYME');
const amount3 = Math.round(o3.grandTotalSom * 100);
const tx3 = 'PAYME-TEST-' + now() + '-3';
await rpc(P, key, 'CreateTransaction', { id: tx3, time: now(), amount: amount3, account: acc(o3.id) });
await rpc(P, key, 'PerformTransaction', { id: tx3 });
r = await rpc(P, key, 'CancelTransaction', { id: tx3, reason: 5 });
log(r.result?.state === -2, 'CancelTransaction (perform) → state -2 (refund)', r.result ?? r.error);

// --- 5) GetStatement ---
r = await rpc(P, key, 'GetStatement', { from: now() - 3_600_000, to: now() + 3_600_000 });
log(
  Array.isArray(r.result?.transactions) && r.result.transactions.length >= 3,
  'GetStatement → tranzaksiyalar ro‘yxati',
  { count: r.result?.transactions?.length },
);

done();
