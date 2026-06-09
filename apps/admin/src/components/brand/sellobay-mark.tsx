import Image from 'next/image';

interface SellobayMarkProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

// Sellobay rasmiy SB logo — Admin paneli uchun
export function SellobayMark({ size = 40, className = '', priority = false }: SellobayMarkProps) {
  const src =
    size <= 32
      ? '/sellobay-icon-32.png'
      : size <= 64
        ? '/sellobay-icon-64.png'
        : size <= 192
          ? '/sellobay-icon-192.png'
          : '/sellobay-icon-512.png';

  return (
    <Image
      src={src}
      alt="Sellobay"
      width={size}
      height={size}
      className={'rounded-[22%] ' + className}
      priority={priority}
    />
  );
}
