# graveyard/ — quarantined code (NOT part of the workspace)

Bu papka **pnpm workspace'ga kirmaydi** (`pnpm-workspace.yaml` faqat `apps/*` va
`packages/*` ni oladi). Bu yerdagi paketlar build/deploy qilinmaydi va hech qayerdan
import qilinmaydi. Ular **o'chirilmagan** — kelajakda kerak bo'lsa `git mv` bilan
qaytarish mumkin (git tarixi saqlangan).

## Nima uchun bu yerda

### `api/` (eski `apps/api`, NestJS)

Loyihaning **haqiqiy backend'i `apps/web`ning API route'lari** (Vercel'da deploy qilingan,
mobil ilova ham shunga ulanadi). `apps/api` esa NestJS skeleti bo'lib, **hech qayerdan
import qilinmagan, deploy qilinmagan** va domenning **eskirgan, farqlanuvchi nusxasi** edi
(masalan `OrdersService.create` stock kamaytirmas, loyalty/oversell himoyasini
qo'llamas edi). "Split-brain backend" xavfini yo'qotish uchun karantinlandi
(qaror: 2026-07-17, "web = backend").

### `wms/` (eski `apps/wms`)

Ombor logikasi aslida `apps/web/src/lib/inventory-server.ts` da (atomik deduct/restock,
oversell himoyasi — e2e test o'tgan). `apps/wms` shu logikaning ishlatilmaydigan
dublikat skeleti (255 qator) edi.

## Qaytarish

```bash
git mv graveyard/api apps/api   # yoki graveyard/wms apps/wms
pnpm install                    # lockfile'ni tiklaydi
```
