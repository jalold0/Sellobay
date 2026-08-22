// Global katalog import — admin UI uchun umumiy tiplar.
// Backend javobi (`/api/global/catalog`) bilan bir xil shakl.

export type WeightCategory =
  | 'TSHIRT'
  | 'OUTERWEAR'
  | 'SHOES'
  | 'BAG'
  | 'ACCESSORY'
  | 'SMALL_ELECTRONICS'
  | 'COSMETICS'
  | 'TOY'
  | 'HOME'
  | 'OTHER';

export type FreightMode = 'AUTO' | 'AVIA';

/** Kategoriya nomlari — operator ko'radi (og'irlik jadvali core-domain'da). */
export const WEIGHT_CATEGORY_LABEL: Record<WeightCategory, string> = {
  TSHIRT: 'Futbolka, ich kiyim',
  OUTERWEAR: 'Kurtka, sviter',
  SHOES: 'Poyabzal',
  BAG: 'Sumka',
  ACCESSORY: 'Aksessuar',
  SMALL_ELECTRONICS: 'Kichik elektronika',
  COSMETICS: 'Kosmetika',
  TOY: "O'yinchoq",
  HOME: 'Uy jihozi',
  OTHER: 'Boshqa (eng ehtiyotkor baho)',
};

export interface PricePreview {
  totalUzs: number;
  chargeableKg: number;
  weightKg: number;
  weightSource: 'MEASURED' | 'MANUAL' | 'CATEGORY';
  guaranteeCeilingKg: number;
  leadTimeDays: [number, number];
  costs: {
    goodsUsd: number;
    chinaDomesticUsd: number;
    freightUsd: number;
    agentFeeUsd: number;
    customsUsd: number;
    landedUzs: number;
    marginUzs: number;
    paymentFeeUzs: number;
  };
}

export interface ImportResult {
  productId: string;
  globalSourceId: string;
  slug: string;
  sku: string;
  status: string;
  priceUzs: number;
  chargeableKg: number;
  weightSource: string;
  guaranteeCeilingKg: number;
}

export interface GlobalCatalogRow {
  id: string;
  productId: string;
  slug: string;
  sku: string;
  name: Record<string, string> | null;
  productStatus: string;
  priceUzs: number;
  platform: string;
  normalizedUrl: string;
  externalItemId: string | null;
  priceCny: number;
  weightCategory: WeightCategory;
  estimatedWeightKg: number;
  actualWeightKg: number | null;
  weightSamples: number;
  freightMode: FreightMode;
  isAvailable: boolean;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}
