// Pul formatlash. SSR va brauzer ICU farqlariga moyil bo'lmasin — manuel formatlovchi.
// Buyok loyihada bir xil ko'rinishni kafolatlaydi.

export type CurrencyCode = 'UZS' | 'USD' | 'EUR';

function formatNumberWithSeparator(
  amount: number,
  fractionDigits: number,
  groupSeparator: string,
  decimalSeparator: string = '.',
): string {
  const fixed = Math.abs(amount).toFixed(fractionDigits);
  const [intPart, fracPart] = fixed.split('.');
  const grouped = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  const sign = amount < 0 ? '-' : '';
  return fracPart ? `${sign}${grouped}${decimalSeparator}${fracPart}` : `${sign}${grouped}`;
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'UZS',
  // locale param qoldirilgan — keyinchalik locale-ga qarab simbol/sep tanlashga kengaytirish uchun
  _locale: string = 'uz-UZ',
): string {
  if (currency === 'UZS') {
    return `${formatNumberWithSeparator(amount, 0, ' ')} so'm`;
  }
  if (currency === 'USD') {
    return `$${formatNumberWithSeparator(amount, 2, ',')}`;
  }
  if (currency === 'EUR') {
    return `€${formatNumberWithSeparator(amount, 2, ',')}`;
  }
  return `${formatNumberWithSeparator(amount, 2, ',')} ${currency}`;
}

export function applyDiscount(price: number, discountPercent: number): number {
  if (discountPercent <= 0) return price;
  return Math.max(0, price - (price * discountPercent) / 100);
}
