import {
  Apple,
  Bell,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  Layers,
  Monitor,
  Phone,
  ScanLine,
  Smartphone,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PlatformCard, FeatureItem } from '../../../components/download/platform-card';
import { PageHero } from '../../../components/static/page-hero';

export const metadata: Metadata = {
  title: 'Ilovani yuklab olish',
  description:
    "Sellobay ilovasini iPhone, Android yoki kompyuteringizga yuklab oling. PWA — alohida o'rnatish kerak emas, brauzer orqali.",
};

// EAS Build orqali yaratilgan APK fayli URL'i.
// EAS Build sozlanmagan paytda placeholder ishlatamiz.
const ANDROID_APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? '';
const TESTFLIGHT_URL = process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? '';
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? '';
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '';

const FEATURES = [
  { icon: Zap, title: 'Tezroq ishlash', desc: 'Brauzer panellaridan ozod, native ko`rinish' },
  { icon: Bell, title: 'Push xabarlar', desc: 'Buyurtma holati, yangi aksiyalar' },
  { icon: WifiOff, title: 'Offline rejim', desc: 'Internet uzilsa ham asosiy sahifalar' },
  { icon: Layers, title: 'Bosh ekranda', desc: 'Iconka yo`q — tezda ochish' },
  { icon: Cpu, title: 'Resurs tejaydi', desc: 'Brauzerdan kam joy egallaydi' },
  { icon: Wifi, title: 'Avtomatik yangilanish', desc: 'Yangi versiyalarni avtomatik oladi' },
];

export default function DownloadPage() {
  return (
    <div className="space-y-10">
      <PageHero
        icon={Download}
        title="Ilovani yuklab olish"
        description="Sellobay'ni qurilmangizga o'rnating — alohida ro'yxatdan o'tish shart emas, brauzer orqali bir bosishda."
        accent="primary"
      />

      {/* Why PWA */}
      <section>
        <h2 className="mb-4 text-2xl font-bold">Nima uchun ilova o&apos;rnatish kerak?</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureItem key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </section>

      {/* Platform cards */}
      <section>
        <h2 className="mb-4 text-2xl font-bold">Qurilmangizni tanlang</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Android */}
          <PlatformCard
            icon={Smartphone}
            title="Android"
            badge="Chrome 7+"
            accent="emerald"
            recommended
            steps={[
              "Quyidagi 'PWA o'rnatish' tugmasini bosing",
              "'O'rnatish' tugmasini tasdiqlang",
              'Bosh ekrandagi yangi ikona orqali oching',
            ]}
            pwaButton
            secondary={
              PLAY_STORE_URL
                ? { label: 'Play Store', href: PLAY_STORE_URL, icon: ExternalLink }
                : ANDROID_APK_URL
                  ? { label: 'APK yuklash', href: ANDROID_APK_URL, icon: Download }
                  : undefined
            }
          />

          {/* iOS */}
          <PlatformCard
            icon={Apple}
            title="iPhone / iPad"
            badge="Safari"
            accent="primary"
            steps={[
              "Safari'da saytni oching (boshqa brauzerda ishlamaydi)",
              "Pastdagi 'Share' (ulashish) tugmasini bosing",
              "'Add to Home Screen' (Bosh ekranga qo'shish)ni tanlang",
              "'Add'ni tasdiqlang — ikona paydo bo'ladi",
            ]}
            secondary={
              TESTFLIGHT_URL
                ? { label: 'TestFlight', href: TESTFLIGHT_URL, icon: ExternalLink }
                : APP_STORE_URL
                  ? { label: 'App Store', href: APP_STORE_URL, icon: ExternalLink }
                  : undefined
            }
          />

          {/* Desktop */}
          <PlatformCard
            icon={Monitor}
            title="Kompyuter (Windows / macOS / Linux)"
            badge="Chrome, Edge"
            accent="sky"
            steps={[
              "Manzil qatorining o'ng tomonidagi 'Install' ikonkasini bosing",
              "Yoki menyu (⋮) → 'Install Sellobay' / 'Cast, save and share' → 'Install page as app'",
              "Ish stoli va Start menyusiga ikon qo'shiladi",
            ]}
            pwaButton
          />

          {/* Browser */}
          <PlatformCard
            icon={Globe}
            title="Brauzerda ishlatish"
            badge="Hech narsa o`rnatish kerak emas"
            accent="violet"
            steps={[
              "O'rnatish istamasangiz — to'g'ridan-to'g'ri brauzerda ishlating",
              "Hamma funksiyalar mavjud, faqat push xabarlar yo'q",
              "Istalgan vaqtda PWA o'rnatishingiz mumkin",
            ]}
            primary={{ label: 'Saytni ochish', href: '/', icon: ExternalLink }}
          />
        </div>
      </section>

      {/* iOS specific instruction visual */}
      <section className="bg-card rounded-2xl border p-6">
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div>
            <div className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
              <Apple className="h-3 w-3" /> iOS uchun maxsus
            </div>
            <h3 className="mt-2 text-xl font-bold">Safari'da bosh ekranga qo&apos;shish</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Apple iOS'da PWA o&apos;rnatish faqat Safari brauzeri orqali ishlaydi. Chrome yoki
              boshqa brauzerlarda ishlamaydi — buni Apple cheklaydi.
            </p>
            <ol className="mt-4 space-y-2 text-sm">
              {[
                "Bu sahifani Safari'da oching",
                'Ekranning pastida (yoki yuqorisida) "Share" (📤) tugmasini toping',
                'Ro\'yxatdan "Add to Home Screen" (Bosh ekranga qo\'shish) tanlang',
                'O\'ng yuqorida "Add" tugmasini bosing',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex items-center justify-center">
            <div className="border-foreground/10 bg-muted relative aspect-[9/16] w-40 overflow-hidden rounded-3xl border-4 shadow-xl md:w-48">
              <div className="bg-foreground/5 absolute inset-x-0 top-0 h-6" />
              <div className="bg-card absolute inset-x-3 top-8 rounded-lg p-3 text-[10px]">
                <div className="font-semibold">Sellobay</div>
                <div className="text-muted-foreground">Bosh ekranga qo&apos;shish</div>
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="bg-bordeaux-gradient grid h-12 w-12 place-items-center rounded-xl text-white shadow-lg">
                  <div className="text-sm font-black tracking-tighter">SB</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For developers */}
      <section className="bg-card rounded-2xl border border-dashed p-6">
        <h3 className="text-base font-bold">Dasturchilar uchun</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Native iOS/Android ilova — React Native (Expo) orqali quriladi. Test uchun{' '}
          <strong>Expo Go</strong> dan foydalanishingiz mumkin:
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <ScanLine className="text-muted-foreground h-4 w-4" />
            <span>
              Telefoningizga{' '}
              <a
                href="https://expo.dev/go"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Expo Go
              </a>{' '}
              ilovasini o&apos;rnating
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Phone className="text-muted-foreground h-4 w-4" />
            <span>
              Repository'ni klonlang va{' '}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                pnpm --filter @ecom/mobile dev
              </code>{' '}
              ishga tushiring
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Smartphone className="text-muted-foreground h-4 w-4" />
            <span>QR kodni Expo Go orqali skan qiling — ilova darhol ochiladi</span>
          </li>
        </ul>
        <div className="mt-3 flex gap-2">
          <Link
            href="https://github.com/jalold0/E-Commerce"
            target="_blank"
            className="bg-background hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium"
          >
            <ExternalLink className="h-3 w-3" /> GitHub
          </Link>
          <Link
            href="https://expo.dev/go"
            target="_blank"
            className="bg-background hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium"
          >
            <ExternalLink className="h-3 w-3" /> Expo Go
          </Link>
        </div>
      </section>
    </div>
  );
}
