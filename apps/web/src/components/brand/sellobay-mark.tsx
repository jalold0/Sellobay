import Image from 'next/image';
import * as React from 'react';

interface SellobayMarkProps {
  size?: number; // px
  className?: string;
  priority?: boolean; // Next/image priority hint
}

/**
 * Sellobay rasmiy SB logo — foydalanuvchi yuborgan PNG.
 * Manba: /public/sellobay-icon-512.png (340×340 asl, kerakli o'lchamga moslanadi)
 *
 * Bu komponent loyihada SB logoni ko'rsatish uchun yagona yo'l —
 * SVG chizish yo'q, har joyda AYNAN bir xil rasmiy logo ishlatiladi.
 */
// Cache-bust: logo yangilanganda versiyani oshiring
const ICON_VERSION = 'v9-master-square';

export function SellobayMark({ size = 40, className = '', priority = false }: SellobayMarkProps) {
  // Redesign: yagona master-square asset (crimson #531625 fon, oq S)
  const src = `/sellobay-square.png?${ICON_VERSION}`;

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
