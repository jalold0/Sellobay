'use client';

import { Zap } from 'lucide-react';
import * as React from 'react';

interface Props {
  endTime: number; // ms timestamp
  className?: string;
  variant?: 'default' | 'compact';
  showFlame?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calc(endTime: number): TimeLeft {
  const diff = endTime - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    expired: false,
  };
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

// TZ §5: Flash Sale countdown — 4 ta blok
export function CountdownTimer({
  endTime,
  className = '',
  variant = 'default',
  showFlame = true,
}: Props) {
  const [time, setTime] = React.useState<TimeLeft>(() => calc(endTime));
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTime(calc(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  // SSR safety
  if (!mounted) {
    return (
      <div className={'flex items-center gap-2 ' + className}>
        <div className="bg-secondary h-14 w-14 animate-pulse rounded-xl" />
        <div className="bg-secondary h-14 w-14 animate-pulse rounded-xl" />
        <div className="bg-secondary h-14 w-14 animate-pulse rounded-xl" />
        <div className="bg-secondary h-14 w-14 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (time.expired) {
    return (
      <div className={className}>
        <span className="text-muted-foreground text-sm font-medium">Aksiya tugadi</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={'inline-flex items-center gap-1 font-mono text-sm font-bold ' + className}>
        {showFlame && <Zap size={14} className="text-brand-orange flash-glow" />}
        <span>
          {pad2(time.days)}:{pad2(time.hours)}:{pad2(time.minutes)}:{pad2(time.seconds)}
        </span>
      </div>
    );
  }

  return (
    <div className={'flex items-center gap-2 ' + className}>
      {[
        { value: time.days, label: 'KUN' },
        { value: time.hours, label: 'SOAT' },
        { value: time.minutes, label: 'DAQ' },
        { value: time.seconds, label: 'SON' },
      ].map((b, i, arr) => (
        <React.Fragment key={b.label}>
          <div className="flex flex-col items-center">
            <div className="bg-secondary grid h-14 min-w-[60px] place-items-center rounded-xl text-2xl font-black tabular-nums text-white shadow-lg md:h-16 md:text-3xl">
              {pad2(b.value)}
            </div>
            <div className="text-muted-foreground mt-1.5 text-[10px] font-bold uppercase tracking-widest">
              {b.label}
            </div>
          </div>
          {i < arr.length - 1 && (
            <div className="text-secondary -mt-5 text-xl font-black md:text-2xl">:</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
