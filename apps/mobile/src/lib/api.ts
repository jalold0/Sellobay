// Sellobay mobil — jonli API client (barrel).
// Web bilan BIR XIL backend: sellobay-web.vercel.app/api (Neon PostgreSQL).
// Internet/DB muammosi bo'lsa — mock fallback (ilova hech qachon yiqilmaydi).
//
// 2026-07-18 split: 961 qatorlik god-file domen modullariga bo'lindi.
// Bu fayl barrel — barcha mavjud importlar ('../lib/api') o'zgarishsiz ishlaydi.
// Infra (API_BASE, authedFetch, token refresh): ./api/core.ts

export * from './api/catalog';
export * from './api/pickup';
export * from './api/auth';
export * from './api/orders';
export * from './api/loyalty';
export * from './api/account';
export * from './api/promo';
export { API_BASE } from './api/core';
