import { Star } from 'lucide-react';

import { cn } from '../lib/cn';

interface RatingProps {
  value: number;
  max?: number;
  size?: number;
  showValue?: boolean;
  reviewCount?: number;
  className?: string;
}

export function Rating({ value, max = 5, size = 14, showValue, reviewCount, className }: RatingProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex">
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < Math.floor(value);
          const half = !filled && i < value;
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={cn(
                'shrink-0',
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : half
                    ? 'fill-yellow-400/50 text-yellow-400'
                    : 'fill-muted text-muted-foreground/30',
              )}
            />
          );
        })}
      </div>
      {showValue && <span className="text-xs font-medium">{value.toFixed(1)}</span>}
      {reviewCount !== undefined && (
        <span className="text-xs text-muted-foreground">({reviewCount})</span>
      )}
    </div>
  );
}
