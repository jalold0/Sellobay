'use client';

import { ArrowUp } from 'lucide-react';
import * as React from 'react';

export function ScrollToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Yuqoriga"
      // Sticky "Savatga qo'shish" paneli ko'ringanda uning ustiga chiqadi (--sticky-cta-h)
      // — aks holda tugma panel CTA'sini yopib qo'yadi. z-45 panel (z-40) ustida.
      style={{ bottom: 'calc(1.5rem + var(--sticky-cta-h, 0px))' }}
      className="bg-primary text-primary-foreground focus-visible:ring-primary fixed right-6 z-[45] grid h-12 w-12 place-items-center rounded-full shadow-lg transition hover:scale-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <ArrowUp size={20} />
    </button>
  );
}
