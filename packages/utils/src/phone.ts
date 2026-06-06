const UZ_PHONE = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/;

export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  if (digits.length === 13 && input.startsWith('+998')) return input;
  return null;
}

export function isValidUzPhone(input: string): boolean {
  const normalized = normalizeUzPhone(input);
  return normalized !== null && UZ_PHONE.test(normalized);
}

export function formatUzPhone(input: string): string | null {
  const normalized = normalizeUzPhone(input);
  if (!normalized) return null;
  const match = UZ_PHONE.exec(normalized);
  if (!match) return null;
  const [, op, a, b, c] = match;
  return `+998 ${op} ${a} ${b} ${c}`;
}
