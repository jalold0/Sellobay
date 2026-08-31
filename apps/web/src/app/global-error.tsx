'use client';

import * as Sentry from '@sentry/nextjs';
import * as React from 'react';

/**
 * Root layout darajasidagi xatolar uchun. Bu yerga tushgan xato — sahifa
 * umuman render bo'lmagani, shuning uchun uni albatta qayd etamiz.
 *
 * [locale]/error.tsx odatdagi sahifa xatolarini ushlaydi; bu esa undan
 * yuqoridagi, oxirgi himoya chizig'i.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#FAF6F4',
          color: '#0A0A0C',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Nimadir noto&apos;g&apos;ri ketdi
          </h1>
          <p style={{ color: '#6B6B73', marginTop: 10, fontSize: 14.5 }}>
            Xatolik qayd etildi. Sahifani yangilab ko&apos;ring.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              marginTop: 18,
              padding: '10px 20px',
              borderRadius: 10,
              background: '#531625',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Bosh sahifa
          </a>
        </div>
      </body>
    </html>
  );
}
