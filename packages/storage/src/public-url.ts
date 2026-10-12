// Ochiq rasm manzili BIZNING xotiramizdanmi (Vercel Blob, `products/` papkasi).
//
// Tovar rasmi sifatida ilgari istalgan tashqi URL qabul qilinardi (audit O10): begona saytdagi
// rasm o'chib qolishi, almashtirilishi yoki kuzatuv pikseli bo'lishi mumkin edi. Endi faqat
// panelning «Rasm yuklash» tugmasi qaytargan manzil o'tadi.

const BLOB_PUBLIC_HOST_SUFFIX = '.public.blob.vercel-storage.com';

export function isOwnPublicImageUrl(url: string, folder = 'products'): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      u.hostname.endsWith(BLOB_PUBLIC_HOST_SUFFIX) &&
      u.pathname.startsWith(`/${folder}/`) &&
      !u.pathname.includes('..')
    );
  } catch {
    return false;
  }
}
