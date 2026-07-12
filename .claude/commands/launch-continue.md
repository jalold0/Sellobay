---
description: Launch rejasidan keyingi vazifani avtomatik bajarib, branch'ga commit qilib davom etadi
---

Sen Sellobay launch ishini avtomatik olib boryapsan. Manba: `docs/LAUNCH_PLAN.md`.

## Har sessiyada tartib

1. **`docs/LAUNCH_PLAN.md`ni o'qi.** "⚙️ Guardrails" bo'limiga QAT'IY rioya qil.
2. Joriy branch `feat/seller-golive-payments` ekanini tasdiqla (`git branch --show-current`).
   Agar boshqa branch bo'lsa — to'xta va menga xabar ber (main'ga tegma).
3. **Keyingi bajarilmagan (`[ ]`) vazifani** ustuvorlik tartibida ol: avval P0, keyin P1, keyin P2.
   Bloklangan (🔒) bandlarni O'TKAZIB YUBOR.
4. Vazifani bajar. Har bir "Qabul" (acceptance) mezoniga rioya qil. Kod yozishdan oldin tegishli
   fayllarni o'qi; atrofdagi kod uslubiga mos yoz (CLAUDE.md).
5. **Tekshir:**
   - `pnpm typecheck` — yashil bo'lishi shart.
   - Web'da brauzerда kuzatiladigan o'zgarish bo'lsa — `preview_start` + `/launch` verify oqimi
     (console error yo'q, kutilgan natija ko'rinadi). Tugagach preview'ni to'xtat.
   - Test skript vazifasi bo'lsa — `npx tsx scripts/<nom>.ts` yashil o'tsin.
6. **Muvaffaqiyatli bo'lsa:** conventional commit (Co-Authored-By bilan) → `docs/LAUNCH_PLAN.md`da
   vazifani `[x]` qil + commit hash/sana yoz → "📓 Kunlik jurnal"ga bir qator qo'sh → shu plan
   o'zgarishini ham commitga kirit (yoki alohida `docs:` commit).
7. **Keyingi vazifaga o't.** To'xtash sharti yetguncha davom et:
   - Navbatda bajarilmagan vazifa qolmasa,
   - Vazifa tashqi resurs / mening qarorimni talab qilsa (uni 🔒 Bloklanganga ko'chir, sabab yoz),
   - Bir vazifa 2 marta tekshiruvdan o'tmasa (commit qilma, `[~]` qoldir, jurnalда sabab, to'xta).
8. Sessiya oxirida qisqa **hisobot** ber: nima bajarildi (commitlar), nima bloklandi, keyin nima
   kerak (mening harakatim kerak bo'lgan narsalar ro'yxati).

## Qоidalar (eslatma)

- `main`'ga HECH QACHON merge/push qilma. Faqat branch'ga commit.
- Vaqtinchalik workaround qoldirma. Hardcode matn yo'q — `t()`/`pickLocalized()`.
- Ishonch bo'lmasa yoki noaniq qaror kerak bo'lsa — bajarishga urinma, jurnalда belgilab to'xta.

Boshla: rejani o'qib, keyingi vazifani ol va ishla.
