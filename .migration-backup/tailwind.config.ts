import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  theme: { extend: { colors: { brand: { 50: '#eff6ff', 600: '#2563eb', 700: '#1d4ed8' } } } },
  plugins: []
};
export default config;
