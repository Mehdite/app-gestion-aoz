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
        danger: {
          500: '#D42B2B',  // AXA red
          600: '#B02020',
        },
        success: { 500: '#059669' },
        warning: { 500: '#D97706' },
        info:    { 500: '#0284C7' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,.08), 0 1px 2px -1px rgba(0,0,0,.06)',
        panel: '0 4px 6px -1px rgba(0,0,0,.08), 0 2px 4px -2px rgba(0,0,0,.06)',
      },
    },
  },
  plugins: [],
};

export default config;
