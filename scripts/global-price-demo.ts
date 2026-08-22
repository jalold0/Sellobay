// Global narx dvigatelini "jonli" tekshirish: npx tsx scripts/global-price-demo.ts
// Tipik tovarlar uchun AUTO/AVIA narxini, og'irlik zaxirasi ta'sirini va narx
// chetlanishi bo'yicha qarorni chiqaradi — tarif yoki marja sozlanayotganda sanity-check.

import {
  DEFAULT_GLOBAL_CONFIG,
  DEFAULT_VARIANCE_THRESHOLDS,
  estimateWeightKg,
  evaluateVariance,
  priceGlobalItem,
  priceGlobalItemAllModes,
  weightGuaranteeCeilingKg,
  type WeightCategory,
} from '../packages/core-domain/src/index.ts';

const uzs = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + " so'm";

interface Sample {
  name: string;
  category: WeightCategory;
  priceCny: number;
  qty: number;
  dimsCm?: { l: number; w: number; h: number };
}

const samples: Sample[] = [
  { name: 'Quloqchin (TWS)', category: 'SMALL_ELECTRONICS', priceCny: 45, qty: 1 },
  { name: 'Futbolka', category: 'TSHIRT', priceCny: 35, qty: 1 },
  { name: 'Krossovka', category: 'SHOES', priceCny: 130, qty: 1 },
  { name: 'Smart soat', category: 'SMALL_ELECTRONICS', priceCny: 180, qty: 1 },
  {
    name: 'Chang yutgich (yengil-katta)',
    category: 'HOME',
    priceCny: 320,
    qty: 1,
    dimsCm: { l: 60, w: 30, h: 25 },
  },
  { name: 'Futbolka — seriya 20 dona', category: 'TSHIRT', priceCny: 30, qty: 20 },
];

const c = DEFAULT_GLOBAL_CONFIG;
console.log(
  `Konfig: 1$=${c.uzsPerUsd} so'm, 1$=${c.cnyPerUsd}¥, kurs zaxira ${c.fxBufferPct * 100}%, ` +
    `agent ${c.agentFeePct * 100}%, marja ${c.marginPct * 100}%, ekvayring ${c.paymentFeePct * 100}%, ` +
    `og'irlik zaxira ${c.weightRiskPct * 100}%\n`,
);

for (const s of samples) {
  // Og'irlik kategoriya jadvalidan — importda operator hech narsa kiritmagan holat
  const w = estimateWeightKg({ category: s.category, qty: s.qty });
  const perUnitKg = w.kg / s.qty;

  const r = priceGlobalItemAllModes({
    priceCny: s.priceCny,
    qty: s.qty,
    weightKg: perUnitKg,
    dimsCm: s.dimsCm,
    weightIsEstimated: w.isEstimated,
  });
  const a = r.AUTO;
  const costUsd =
    a.costs.goodsUsd + a.costs.chinaDomesticUsd + a.costs.freightUsd + a.costs.agentFeeUsd;

  console.log(`${s.name}  (${s.priceCny}¥ × ${s.qty}, ${s.category})`);
  console.log(
    `  og'irlik: ${w.kg.toFixed(2)} kg (${w.source}) → hisobga ${a.chargeableKg} kg  ` +
      `· kafolat shipi ${weightGuaranteeCeilingKg(a.chargeableKg, a.weightIsEstimated, 0.2)} kg`,
  );
  console.log(
    `  AUTO  ${uzs(a.totalUzs)}  [${a.chargeableKg} kg × $${a.appliedUsdPerKg}]  ` +
      `${a.leadTimeDays[0]}-${a.leadTimeDays[1]} kun  ·  marja ${uzs(a.costs.marginUzs)}`,
  );
  console.log(
    `  AVIA  ${uzs(r.AVIA.totalUzs)}  [${r.AVIA.chargeableKg} kg × $${r.AVIA.appliedUsdPerKg}]  ` +
      `${r.AVIA.leadTimeDays[0]}-${r.AVIA.leadTimeDays[1]} kun`,
  );
  console.log(
    `  tannarx: tovar ${((a.costs.goodsUsd / costUsd) * 100).toFixed(0)}% · ` +
      `yuk ${((a.costs.freightUsd / costUsd) * 100).toFixed(0)}%\n`,
  );
}

// --- Narx chetlanishi bo'yicha qaror ---
console.log(
  `Chetlanish chegaralari: <=${DEFAULT_VARIANCE_THRESHOLDS.absorbPct * 100}% o'zimiz yutamiz, ` +
    `>${DEFAULT_VARIANCE_THRESHOLDS.cancelPct * 100}% bekor tavsiya etiladi\n`,
);

const paid = priceGlobalItem({
  priceCny: 130,
  qty: 1,
  weightKg: 1.3,
  mode: 'AUTO',
}).totalUzs;

for (const [label, newCny] of [
  ['narx tushdi', 120],
  ['+3% oshdi', 134],
  ['+12% oshdi', 146],
  ['+45% oshdi', 189],
] as const) {
  const actual = priceGlobalItem({
    priceCny: newCny,
    qty: 1,
    weightKg: 1.3,
    mode: 'AUTO',
  }).totalUzs;
  const v = evaluateVariance(paid, actual);
  const extra =
    v.extraChargeUzs > 0
      ? `mijozdan ${uzs(v.extraChargeUzs)}`
      : v.absorbedUzs > 0
        ? `biz yutamiz ${uzs(v.absorbedUzs)}`
        : '—';
  console.log(
    `  Xitoyda ${label} (${newCny}¥): ${uzs(paid)} → ${uzs(actual)}  ` +
      `[${(v.diffPct * 100).toFixed(1)}%]  ${v.decision}  ·  ${extra}`,
  );
}
