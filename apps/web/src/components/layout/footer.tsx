import { Facebook, Instagram, Mail, MapPin, Phone, Send, Youtube } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { socialLinks, supportContacts, telHref } from '@/lib/support';

import { SellobayMark } from '../brand/sellobay-mark';

import { NewsletterForm } from './newsletter';

type FooterLinkKey =
  | 'about'
  | 'careers'
  | 'press'
  | 'contacts'
  | 'help'
  | 'delivery'
  | 'returns'
  | 'faq'
  | 'groupBuy'
  | 'becomeSeller'
  | 'sellerGuide'
  | 'commissions'
  | 'sellerRules'
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'offer';

const COLUMNS: {
  titleKey: 'company' | 'customers' | 'sellers' | 'legal';
  links: { href: string; key: FooterLinkKey }[];
}[] = [
  {
    titleKey: 'company',
    links: [
      { href: '/about', key: 'about' },
      { href: '/careers', key: 'careers' },
      { href: '/press', key: 'press' },
      { href: '/contacts', key: 'contacts' },
    ],
  },
  {
    titleKey: 'customers',
    links: [
      { href: '/help', key: 'help' },
      { href: '/group-buy', key: 'groupBuy' },
      { href: '/delivery', key: 'delivery' },
      { href: '/returns', key: 'returns' },
      { href: '/faq', key: 'faq' },
    ],
  },
  {
    titleKey: 'sellers',
    links: [
      { href: '/sell', key: 'becomeSeller' },
      { href: '/seller-guide', key: 'sellerGuide' },
      { href: '/commissions', key: 'commissions' },
      { href: '/seller-rules', key: 'sellerRules' },
    ],
  },
  {
    titleKey: 'legal',
    links: [
      { href: '/terms', key: 'terms' },
      { href: '/privacy', key: 'privacy' },
      { href: '/cookies', key: 'cookies' },
      { href: '/offer', key: 'offer' },
    ],
  },
];

const PAY_METHODS: { name: string; color: string }[] = [
  { name: 'Click', color: 'text-sky-500' },
  { name: 'Payme', color: 'text-cyan-400' },
  { name: 'Uzcard', color: 'text-blue-500' },
  { name: 'Humo', color: 'text-green-500' },
  { name: 'Visa', color: 'text-blue-700' },
  { name: 'Master', color: 'text-orange-500' },
];

// Ijtimoiy tarmoqlar `socialLinks()` dan (rasmiy profil yoki SOCIAL_* ENV). Ilgari bu yerda saytlarning bosh sahifalari
// (`https://instagram.com`) turardi — Sellobay profili emas (audit TRU-01).
// Profili hali yo'q tarmoq ham ko'rsatiladi, lekin havola emas — «tez orada» belgisi:
// soxta yoki bosh sahifaga olib boradigan havola qaytmasin.
function socials() {
  const links = socialLinks();
  return [
    {
      Icon: Instagram,
      href: links.instagram,
      hoverColor: 'hover:text-pink-500',
      label: 'Instagram',
    },
    { Icon: Facebook, href: links.facebook, hoverColor: 'hover:text-blue-600', label: 'Facebook' },
    { Icon: Send, href: links.telegram, hoverColor: 'hover:text-sky-500', label: 'Telegram' },
    { Icon: Youtube, href: links.youtube, hoverColor: 'hover:text-red-600', label: 'YouTube' },
  ];
}

const SOCIAL_ICON_CLASS =
  'grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/70';

export function Footer() {
  const t = useTranslations('footer');
  const common = useTranslations('common');
  const nav = useTranslations('nav');
  // Aloqa `supportContacts()` dan; kanali yo'gi ko'rsatilmaydi (audit TRU-01).
  const support = supportContacts();
  const socialItems = socials();

  return (
    // render-lazy: footer har sahifada birinchi ekrandan pastda (globals.css'dagi izoh).
    <footer className="render-lazy mt-16">
      <section className="from-primary via-brand-red-bright to-brand-red-dark bg-gradient-to-br">
        <div className="container py-10 md:py-12">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="text-white">
              <h2 className="text-2xl font-black leading-tight md:text-3xl">
                {t('newsletterTitle')}
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/85">{t('newsletterSubtitle')}</p>
            </div>
            <div className="rounded-2xl bg-white/95 p-2 shadow-2xl backdrop-blur md:p-3">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </section>

      <div className="bg-footer text-white/85">
        <div className="container grid gap-10 py-14 md:grid-cols-12">
          <div className="space-y-4 md:col-span-4">
            <div className="flex items-center gap-2.5">
              <SellobayMark size={38} className="shadow" />
              <span className="font-serif text-xl font-bold text-white">{common('appName')}</span>
            </div>
            <p className="max-w-[280px] text-[13px] leading-[1.65] text-white/60">{t('tagline')}</p>
            <div className="space-y-1.5 text-sm">
              {support.phone ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Phone size={14} />{' '}
                  <a href={telHref(support.phone)} className="hover:text-white">
                    {support.phone}
                  </a>
                </div>
              ) : null}
              {support.email ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Mail size={14} />{' '}
                  <a href={`mailto:${support.email}`} className="hover:text-white">
                    {support.email}
                  </a>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-white/70">
                <MapPin size={14} />
                <span>{t('address')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3">
              {socialItems.map(({ Icon, href, hoverColor, label }) =>
                href ? (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className={`${SOCIAL_ICON_CLASS} transition-all hover:-translate-y-0.5 hover:border-white/30 ${hoverColor}`}
                  >
                    <Icon size={16} />
                  </a>
                ) : (
                  <span
                    key={label}
                    role="img"
                    aria-label={t('socialSoon', { name: label })}
                    title={t('socialSoon', { name: label })}
                    className={`${SOCIAL_ICON_CLASS} cursor-default opacity-50`}
                  >
                    <Icon size={16} aria-hidden />
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="grid gap-8 md:col-span-8 md:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.titleKey}>
                <div className="text-brand-gold mb-3 text-[11.5px] font-bold uppercase tracking-[0.16em]">
                  {t(`columns.${col.titleKey}`)}
                </div>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        prefetch={false}
                        href={l.href}
                        className="group inline-flex items-center text-sm text-white/70 transition hover:translate-x-0.5 hover:text-white"
                      >
                        {t(`links.${l.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.08]">
          <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-white/50">
                {t('paymentMethods')}
              </span>
              {PAY_METHODS.map((m) => (
                <span
                  key={m.name}
                  className={
                    'rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold uppercase text-white/70 transition hover:border-white/30 hover:bg-white/10 ' +
                    'hover:' +
                    m.color
                  }
                >
                  {m.name}
                </span>
              ))}
            </div>
            <Link
              prefetch={false}
              href="/download"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              📱 {nav('downloadApp')}
            </Link>
          </div>
        </div>

        <div className="border-t border-white/[0.08]">
          <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 md:flex-row">
            <div>{t('copyright', { year: new Date().getFullYear() })}</div>
            <div className="flex items-center gap-1">
              {t('madeIn')} <span className="text-base">🇺🇿</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
