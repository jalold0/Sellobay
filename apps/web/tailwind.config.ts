import type { Config } from 'tailwindcss';

const preset = require('@ecom/ui/tailwind-preset');

const config: Config = {
  presets: [preset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
