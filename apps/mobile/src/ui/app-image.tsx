// Sellobay mobil — expo-image o'ramasi.
// React Native Image o'rniga: memory+disk kesh, fade transition, contentFit.
// Rasm ~60% tezroq ko'rinadi (kesh) va sakrashsiz fade bilan chiqadi.
import { Image as ExpoImage, type ImageProps } from 'expo-image';
import { cssInterop } from 'nativewind';

// NativeWind className -> style mapping (expo-image uchun)
cssInterop(ExpoImage, { className: 'style' });

type Props = ImageProps & { className?: string };

export function AppImage({ transition = 250, contentFit = 'cover', ...props }: Props) {
  // className runtime'da cssInterop orqali style'ga aylantiriladi; TS uchun cast.
  return (
    <ExpoImage
      cachePolicy="memory-disk"
      transition={transition}
      contentFit={contentFit}
      {...(props as ImageProps)}
    />
  );
}
