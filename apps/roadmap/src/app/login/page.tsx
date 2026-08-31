export const dynamic = 'force-dynamic';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <form
        action="/api/login"
        method="post"
        className="border-line bg-surface w-full max-w-[380px] rounded-2xl border p-7"
      >
        <div className="flex items-center gap-2.5">
          <span className="bg-accent grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold text-white">
            S
          </span>
          <div>
            <div className="text-[15px] font-bold tracking-tight">Sellobay</div>
            <div className="text-faint text-[12px]">Ish jarayoni</div>
          </div>
        </div>

        <label htmlFor="password" className="text-muted mt-7 block text-[13px] font-semibold">
          Parol
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border-line bg-ground focus:border-accent mt-2 w-full rounded-lg border px-3.5 py-2.5 text-[14px] outline-none"
        />
        <input type="hidden" name="next" value={searchParams.next ?? '/'} />

        {searchParams.error && (
          <p className="text-gap mt-3 text-[12.5px]">
            Parol noto&apos;g&apos;ri. Qayta urinib ko&apos;ring.
          </p>
        )}

        <button
          type="submit"
          className="bg-accent mt-5 w-full rounded-lg py-2.5 text-[14px] font-bold text-white transition hover:brightness-110"
        >
          Kirish
        </button>

        <p className="text-faint mt-5 text-[12px] leading-relaxed">
          Bu sahifa ichki foydalanish uchun. Parolni asoschidan oling.
        </p>
      </form>
    </main>
  );
}
