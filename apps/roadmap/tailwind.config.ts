import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: '#14141A',
        muted: '#6E6A72',
        faint: '#97929A',
        line: '#E7DFDA',
        ground: '#FBF8F6',
        surface: '#FFFFFF',
        sunk: '#F4EFEC',
        accent: '#6B1B2E',
        gold: '#8E7130',
        ok: '#2C6A4E',
        wip: '#8A6212',
        gap: '#A11F35',
        idle: '#7E7A85',
      },
    },
  },
};
export default config;
