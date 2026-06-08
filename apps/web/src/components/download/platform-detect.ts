// Foydalanuvchi qurilmasi va brauzerini aniqlash
export type Platform = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';
export type Browser = 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'unknown';

export interface DetectedDevice {
  platform: Platform;
  browser: Browser;
  isStandalone: boolean;
  canInstallPwa: boolean;
}

export function detectDevice(): DetectedDevice {
  if (typeof window === 'undefined') {
    return { platform: 'unknown', browser: 'unknown', isStandalone: false, canInstallPwa: false };
  }
  const ua = window.navigator.userAgent.toLowerCase();
  const platform: Platform = /iphone|ipad|ipod/.test(ua)
    ? 'ios'
    : /android/.test(ua)
      ? 'android'
      : /windows/.test(ua)
        ? 'windows'
        : /macintosh|mac os x/.test(ua)
          ? 'mac'
          : /linux/.test(ua)
            ? 'linux'
            : 'unknown';

  const browser: Browser = /edg\//.test(ua)
    ? 'edge'
    : /samsungbrowser/.test(ua)
      ? 'samsung'
      : /firefox/.test(ua)
        ? 'firefox'
        : /chrome\//.test(ua)
          ? 'chrome'
          : /safari/.test(ua)
            ? 'safari'
            : 'unknown';

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    // @ts-ignore - iOS-specific
    window.navigator.standalone === true;

  // Chrome/Edge/Samsung Android beforeinstallprompt'ni qo'llab-quvvatlaydi
  const canInstallPwa =
    (platform === 'android' &&
      (browser === 'chrome' || browser === 'edge' || browser === 'samsung')) ||
    (platform === 'windows' && (browser === 'chrome' || browser === 'edge')) ||
    (platform === 'mac' && (browser === 'chrome' || browser === 'edge'));

  return { platform, browser, isStandalone, canInstallPwa };
}
