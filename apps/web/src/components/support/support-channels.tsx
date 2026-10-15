import { Mail, Phone, Send } from 'lucide-react';

import { type SupportContacts, telHref } from '../../lib/support';

/**
 * Qo'llab-quvvatlash kanallari kartalari — faqat ENV da sozlanganlari (audit TRU-01).
 *
 * Ilgari yordam va kontaktlar sahifalarida `+998 71 200 00 00`, `support@example.uz`,
 * `@ecom_uz_bot` va `href="#"` dagi «Live chat» turardi.
 */
export function SupportChannels({ support }: { support: SupportContacts }) {
  const items = [
    support.phone
      ? { icon: Phone, label: 'Telefon', value: support.phone, href: telHref(support.phone) }
      : null,
    support.email
      ? { icon: Mail, label: 'Email', value: support.email, href: `mailto:${support.email}` }
      : null,
    support.telegram
      ? {
          icon: Send,
          label: 'Telegram',
          value: `@${support.telegram}`,
          href: `https://t.me/${support.telegram}`,
        }
      : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => {
        const Icon = c.icon;
        return (
          <a
            key={c.label}
            href={c.href}
            {...(c.href.startsWith('https://') ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="bg-card hover:border-primary flex items-center gap-3 rounded-xl border p-4 transition"
          >
            <div className="bg-primary/10 text-primary grid h-10 w-10 shrink-0 place-items-center rounded-lg">
              <Icon size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-muted-foreground text-xs">{c.label}</div>
              <div className="truncate text-sm font-semibold">{c.value}</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
