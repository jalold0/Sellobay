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
      className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <ArrowUp size={20} />
    </button>
  );
}
