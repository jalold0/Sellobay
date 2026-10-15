// JSON-LD ni <script> ichiga xavfsiz joylash.
//
// NEGA KERAK: `JSON.stringify` `<` belgisini ekranlamaydi. Mahsulot nomi va tavsifi
// sotuvchidan keladi; unda `</script><script>…` bo'lsa, u JSON blokini yopib, sahifani
// ochgan har bir xaridor brauzerida skript ishga tushirardi (stored XSS, audit SEC-01).
// `<`, `>`, `&` va U+2028/U+2029 ni \u ko'rinishiga o'giramiz — JSON ma'nosi o'zgarmaydi,
// HTML esa ularni teg deb o'qimaydi.

const UNSAFE = /[<>&\u2028\u2029]/g;

const ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/** `<script type="application/ld+json">` ichiga qo'yiladigan matn. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE, (ch) => ESCAPES[ch] ?? ch);
}
