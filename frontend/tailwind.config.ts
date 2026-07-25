import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#E8F0FB',
          100: '#C5D8F5',
          200: '#9FBDED',
          300: '#79A2E5',
          400: '#5D8EDF',
          500: '#1A73E8',  // Primary blue
          600: '#0F4880',  // AXA deep blue
          700: '#0D3D6B',
          800: '#0A3157',
          900: '#062342',
        },
        navy: {
          950: '#040D1A',
          900: '#091F3D',
          800: '#0B2847',
          700: '#0E355E',
          600: '#124275',
          300: '#5B90C0',
          200: '#94B4D8',
          100: '#C8DDF0',
          50:  '#EBF4FA',
        },
        danger: {
          500: '#D42B2B',  // AXA red
          600: '#B02020',
        },
        success: { 500: '#059669' },
        warning: { 500: '#D97706' },
        info:    { 500: '#0284C7' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        card:    '0 2px 8px 0 rgba(14, 62, 118, 0.07), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        panel:   '0 4px 16px -2px rgba(14, 62, 118, 0.10), 0 2px 6px -2px rgba(0, 0, 0, 0.05)',
        sidebar: '2px 0 24px 0 rgba(4, 13, 26, 0.25)',
        input:   '0 0 0 3px rgba(26, 115, 232, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
