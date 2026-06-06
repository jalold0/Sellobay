# Hissa qo'shish qoidalari

## Git Flow

- `main` — production
- `develop` — integration branch
- `feature/<id>-<short-description>` — yangi funksiya
- `bugfix/<id>-<short-description>` — xatolik tuzatish
- `hotfix/<id>-<short-description>` — production hotfix
- `release/<version>` — relizga tayyorlash

## Commit xabar formati (Conventional Commits)

```
<type>(<scope>): <short summary>

<body (ixtiyoriy)>

<footer (ixtiyoriy)>
```

Type turlari: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`.

Misol:

```
feat(orders): add abandoned cart recovery job
fix(auth): correct refresh token expiry calculation
```

## Pull Request

1. Featurega tegishli barcha testlar yashil bo'lishi shart
2. `pnpm lint && pnpm typecheck && pnpm test` muvaffaqiyatli o'tsin
3. Kamida 1 reviewer tasdig'i talab qilinadi
4. PR sarlavhasi conventional-commit formatida bo'lsin
5. Yopilgan PR squash-merge orqali `develop`ga qo'shiladi

## Kod sifati standartlari

- **Clean Architecture** — qatlamlar buzilmasin (domain framework'ga bog'liq emas)
- **SOLID** — har bir sinf bitta vazifaga ega bo'lsin
- **DDD** — biznes logikasi domen ichida
- **TDD (yo'nalish)** — kritik modullarda avval test
- **Hech qachon workaround qoldirmang** — root cause tuzating
- **ADR yozing** — har bir muhim arxitektura qarori uchun (`docs/adr/`)

## Versiyalash

Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.

## Sekretlar

`.env` faylini hech qachon commit qilmang. Sekretlarni `.env.example`ga shablon sifatida qo'shing.
