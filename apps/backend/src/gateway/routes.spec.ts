import { ROUTE_RULES, type ServiceName, parseEnabledServices, resolveUpstream } from './routes';

const on = (...s: ServiceName[]) => new Set<ServiceName>(s);

describe('parseEnabledServices', () => {
  it('bo`sh yoki yo`q — hech narsa yoqilmagan (xavfsiz boshlang`ich holat)', () => {
    expect(parseEnabledServices(undefined).size).toBe(0);
    expect(parseEnabledServices('').size).toBe(0);
    expect(parseEnabledServices(' , ').size).toBe(0);
  });

  it('vergul bilan ajratilgan ro`yxatni o`qiydi (bo`shliqlarni e`tiborsiz)', () => {
    expect([...parseEnabledServices('auth, catalog')]).toEqual(['auth', 'catalog']);
  });

  it('noma`lum servis nomi — xato (imlo xatosi jim yutilmasin)', () => {
    expect(() => parseEnabledServices('auth,ordres')).toThrow(/ordres/);
  });
});

describe('resolveUpstream', () => {
  it("hech narsa yoqilmagan — HAMMASI eski API'ga", () => {
    for (const rule of ROUTE_RULES)
      expect(resolveUpstream(`${rule.prefix}/x`, on())).toBe('legacy');
  });

  it("yoqilgan servis o`z prefiksini oladi, qolgani eski API'da qoladi", () => {
    const enabled = on('catalog');
    expect(resolveUpstream('/api/products', enabled)).toBe('catalog');
    expect(resolveUpstream('/api/products/nike-air-max/reviews', enabled)).toBe('catalog');
    expect(resolveUpstream('/api/orders', enabled)).toBe('legacy');
    expect(resolveUpstream('/api/auth/login', enabled)).toBe('legacy');
  });

  it('prefiks FAQAT butun segment bo`yicha mos keladi (`/api/orders-x` ≠ `/api/orders`)', () => {
    const enabled = on('orders');
    expect(resolveUpstream('/api/orders-export', enabled)).toBe('legacy');
    expect(resolveUpstream('/api/orders/track', enabled)).toBe('orders');
    expect(resolveUpstream('/api/ordersx', enabled)).toBe('legacy');
  });

  it("ro`yxatda yo`q yo`llar (config, courier, loyalty...) doim eski API'da", () => {
    const all = on('auth', 'catalog', 'orders');
    expect(resolveUpstream('/api/config', all)).toBe('legacy');
    expect(resolveUpstream('/api/courier/deliveries', all)).toBe('legacy');
    expect(resolveUpstream('/health', all)).toBe('legacy');
  });

  it('har prefiks faqat bitta servisga tegishli (bitta route — bitta egasi)', () => {
    const prefixes = ROUTE_RULES.map((r) => r.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});
