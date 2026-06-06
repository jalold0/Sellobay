import { formatMoney as fmtMoney, type CurrencyCode } from '@ecom/utils';

export function formatMoney(amount: number | string | null | undefined, currency: CurrencyCode = 'UZS', locale = 'uz-UZ'): string {
  if (amount === null || amount === undefined) return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  return fmtMoney(n, currency, locale);
}

export function formatNumber(value: number | string | null | undefined, _locale = 'uz-UZ'): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  const fixed = Math.abs(Math.trunc(n)).toString();
  const grouped = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return n < 0 ? `-${grouped}` : grouped;
}

const MONTHS_UZ_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatDate(value: Date | string | null | undefined, _locale = 'uz-UZ'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())} ${MONTHS_UZ_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
}

export function formatDateTime(value: Date | string | null | undefined, _locale = 'uz-UZ'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())} ${MONTHS_UZ_SHORT[d.getMonth()]}, ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = d.getTime() - Date.now();
  const past = diffMs < 0;
  const sec = Math.round(Math.abs(diffMs) / 1000);
  const suffix = past ? 'oldin' : 'keyin';
  if (sec < 60) return past ? 'hozirgina' : 'hoziroq';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} daqiqa ${suffix}`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} soat ${suffix}`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} kun ${suffix}`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo} oy ${suffix}`;
  return `${Math.round(mo / 12)} yil ${suffix}`;
}

export function pickLocalized(value: Partial<Record<'uz' | 'ru' | 'en', string>> | string | null | undefined, locale: 'uz' | 'ru' | 'en' = 'uz'): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.uz ?? '';
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}
