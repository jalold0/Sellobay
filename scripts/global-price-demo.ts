// Global narx dvigatelini "jonli" tekshirish: npx tsx scripts/global-price-demo.ts
// Tipik tovarlar uchun AUTO/AVIA narxini va marjani chiqaradi — tarif o'zgarganda
// yoki marja sozlanayotganda sanity-check uchun.

import {
  DEFAULT_GLOBAL_CONFIG,
  priceGlobalItemAllModes,
} from '../packages/core-domain/src/global-pricing.ts';

const uzs = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + " so'm";

const samples = [
  { name: 'Quloqchin (TWS)', priceCny: 45, qty: 1, weightKg: 0.15, dimsCm: { l: 12, w: 10, h: 6 } },
  { name: 'Futbolka', priceCny: 35, qty: 1, weightKg: 0.25, dimsCm: { l: 30, w: 22, h: 4 } },
  { name: 'Krossovka', priceCny: 130, qty: 1, weightKg: 0.9, dimsCm: { l: 33, w: 22, h: 13 } },
  { name: 'Smart soat', priceCny: 180, qty: 1, weightKg: 0.3, dimsCm: { l: 12, w: 12, h: 8 } },
  {
    name: 'Chang yutgich (yengil-katta)',
    priceCny: 320,
    qty: 1,
    weightKg: 3.2,
    dimsCm: { l: 60, w: 30, h: 25 },
  },
  {
    name: 'Futbolka — seriya 20 dona',
    priceCny: 30,
    qty: 20,
    weightKg: 0.25,
    dimsCm: { l: 30, w: 22, h: 4 },
  },
];

const c = DEFAULT_GLOBAL_CONFIG;
console.log(
  `Konfig: 1$=${c.uzsPerUsd} so'm, 1$=${c.cnyPerUsd}¥, kurs zaxira ${c.fxBufferPct * 100}%, ` +
    `agent ${c.agentFeePct * 100}%, marja ${c.marginPct * 100}%, ekvayring ${c.paymentFeePct * 100}%\n`,
);

for (const { name, ...item } of samples) {
  const r = priceGlobalItemAllModes(item);
  const a = r.AUTO;
  const costUsd =
    a.costs.goodsUsd + a.costs.chinaDomesticUsd + a.costs.freightUsd + a.costs.agentFeeUsd;
  const goodsShare = (a.costs.goodsUsd / costUsd) * 100;
  const freightShare = (a.costs.freightUsd / costUsd) * 100;

  console.log(`${name}  (${item.priceCny}¥ × ${item.qty})`);
  console.log(
    `  AUTO  ${uzs(a.totalUzs)}  [${a.chargeableKg.toFixed(2)} kg × $${a.appliedUsdPerKg}]  ` +
      `${a.leadTimeDays[0]}-${a.leadTimeDays[1]} kun  ·  marja ${uzs(a.costs.marginUzs)}`,
  );
  console.log(
    `  AVIA  ${uzs(r.AVIA.totalUzs)}  [${r.AVIA.chargeableKg.toFixed(2)} kg × $${r.AVIA.appliedUsdPerKg}]  ` +
      `${r.AVIA.leadTimeDays[0]}-${r.AVIA.leadTimeDays[1]} kun`,
  );
  console.log(
    `  tannarx tarkibi: tovar ${goodsShare.toFixed(0)}% · yuk ${freightShare.toFixed(0)}%\n`,
  );
}
