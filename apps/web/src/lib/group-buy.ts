// Group Buy (guruh xaridi) — Pinduoboo uslubidagi mexanizm.
// MVP: mock data layer (loyiha mock-first pattern'iga mos). Keyinchalik real
// backend (Prisma GroupBuy + GroupBuyMember + API) bilan almashtiriladi.

import { type LocalizedText, type MockProduct, products } from './mock-data';

export interface GroupDeal {
  id: string;
  productSlug: string;
  name: LocalizedText;
  imageSeed: string;
  /** Oddiy (yakka) narx */
  soloPrice: number;
  /** Guruh narxi (chegirmali) */
  groupPrice: number;
  /** Guruh to'lishi uchun kerakli odamlar soni */
  targetSize: number;
  /** Hozir qo'shilganlar soni */
  currentSize: number;
  /** Tugashiga qolgan soat (client'da real vaqtga aylantiriladi) */
  hoursLeft: number;
}

// Featured group deals — mavjud mahsulotlardan tuziladi
const DEAL_CONFIG: Array<{ target: number; current: number; discount: number; hoursLeft: number }> = [
  { target: 5, current: 3, discount: 0.35, hoursLeft: 21 },
  { target: 10, current: 7, discount: 0.42, hoursLeft: 8 },
  { target: 3, current: 1, discount: 0.25, hoursLeft: 46 },
  { target: 20, current: 14, discount: 0.5, hoursLeft: 32 },
  { target: 5, current: 4, discount: 0.3, hoursLeft: 5 },
  { target: 8, current: 2, discount: 0.38, hoursLeft: 60 },
];

function dealFromProduct(p: MockProduct, cfg: (typeof DEAL_CONFIG)[number]): GroupDeal {
  const solo = p.oldPrice ?? p.price;
  const groupPrice = Math.round((solo * (1 - cfg.discount)) / 1000) * 1000;
  return {
    id: `gb-${p.id}`,
    productSlug: p.slug,
    name: p.name,
    imageSeed: p.imageSeed,
    soloPrice: solo,
    groupPrice,
    targetSize: cfg.target,
    currentSize: cfg.current,
    hoursLeft: cfg.hoursLeft,
  };
}

export function getGroupDeals(): GroupDeal[] {
  return products.slice(0, DEAL_CONFIG.length).map((p, i) => dealFromProduct(p, DEAL_CONFIG[i]!));
}

export function dealImageUrl(seed: string, size = 600): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

export function discountPercent(deal: GroupDeal): number {
  if (!deal.soloPrice) return 0;
  return Math.round((1 - deal.groupPrice / deal.soloPrice) * 100);
}
