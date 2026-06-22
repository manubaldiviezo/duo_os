import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: 'var(--brand)',
        'brand-d': 'var(--brand-d)',
        'brand-l': 'var(--brand-l)',
        'brand-light': 'var(--brand-l)',
        'ios-bg': 'var(--ios-bg)',
        'ios-card': 'var(--ios-card)',
        'ios-text': 'var(--ios-text)',
        'ios-text-2': 'var(--ios-text-2)',
        'ios-text-3': 'var(--ios-text-3)',
        'ios-sep': 'var(--ios-sep)',
        'ios-red': '#FF3B30',
        'ios-orange': '#FF9500',
        'ios-green': '#34C759',
        'ios-yellow': '#FFCC00',
        'ios-blue': '#007AFF',
        'ios-purple': '#AF52DE',
        'ios-pink': '#FF2D55',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        ios: '14px',
        'ios-lg': '18px',
        'ios-card': '16px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        ios: '20px',
      },
    },
  },
  plugins: [],
} satisfies Config;
