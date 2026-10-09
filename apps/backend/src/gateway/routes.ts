/**
 * Marshrut jadvali (strangler pattern, ADR 0012).
 *
 * Gateway har so'rovni qaysi upstream'ga yo'llashni shu yerdan biladi:
 *  - servis YOQILGAN bo'lsa (`NEST_ROUTES=auth,catalog`) va yo'l uning prefiksiga
 *    mos kelsa — NestJS servisiga;
 *  - qolgan HAMMA narsa — eski Next.js API'ga (`legacy`). Ilovalar hech qachon
 *    ishlamay qolmaydi: yangi servis tayyor bo'lmaguncha u yoqilmaydi.
 *
 * Bitta route'ning bitta egasi bor: servis yoqilganda o'sha prefiks bo'yicha
 * eski route'ni Next.js'dan O'CHIRISH shart (split-brain, ADR 0012 §4).
 */
export type ServiceName = 'auth' | 'catalog' | 'orders';
export type UpstreamName = ServiceName | 'legacy';

export interface RouteRule {
  /** Yo'l prefiksi: `/api/orders` `/api/orders` va `/api/orders/...` ga mos, `/api/orders-x` ga EMAS. */
  prefix: string;
  service: ServiceName;
}

export const ROUTE_RULES: readonly RouteRule[] = [
  // auth: hisob, sessiya, OTP, manzillar
  { prefix: '/api/auth', service: 'auth' },
  { prefix: '/api/addresses', service: 'auth' },

  // catalog
  { prefix: '/api/products', service: 'catalog' },
  { prefix: '/api/categories', service: 'catalog' },
  { prefix: '/api/brands', service: 'catalog' },

  // orders: savat, buyurtma, to'lov
  { prefix: '/api/orders', service: 'orders' },
  { prefix: '/api/cart', service: 'orders' },
  { prefix: '/api/payments', service: 'orders' },
];

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Yoqilgan servislar ro'yxatini (`auth,catalog`) tekshirib o'qiydi; noma'lum nom — xato. */
export function parseEnabledServices(raw: string | undefined): Set<ServiceName> {
  const known = new Set<string>(ROUTE_RULES.map((r) => r.service));
  const enabled = new Set<ServiceName>();
  for (const name of (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (!known.has(name))
      throw new Error(`NEST_ROUTES: noma'lum servis "${name}" (bor: ${[...known].join(', ')})`);
    enabled.add(name as ServiceName);
  }
  return enabled;
}

/** Yo'lni upstream'ga aylantiradi: eng uzun mos prefiks yutadi. */
export function resolveUpstream(path: string, enabled: ReadonlySet<ServiceName>): UpstreamName {
  let best: RouteRule | undefined;
  for (const rule of ROUTE_RULES) {
    if (!enabled.has(rule.service) || !matches(path, rule.prefix)) continue;
    if (!best || rule.prefix.length > best.prefix.length) best = rule;
  }
  return best?.service ?? 'legacy';
}
