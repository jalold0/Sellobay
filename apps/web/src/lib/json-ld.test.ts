import { describe, expect, it } from 'vitest';

import { jsonLdHtml } from './json-ld';

describe('jsonLdHtml (audit SEC-01)', () => {
  it('sotuvchi matnidagi </script> JSON blokini yopa olmaydi', () => {
    const html = jsonLdHtml({ description: 'Zo`r</script><script>alert(1)</script>' });
    expect(html).not.toContain('</script>');
    expect(html).not.toContain('<');
  });

  it('JSON ma`nosi o`zgarmaydi — qayta o`qilganda asl matn', () => {
    const data = { name: 'A & B <tag> \u2028 qator', price: 1490000 };
    expect(JSON.parse(jsonLdHtml(data))).toEqual(data);
  });
});
