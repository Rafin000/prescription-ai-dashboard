/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#F6F9F8',
          muted: '#EEF4F2',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FAFDFB',
        },
        ink: {
          DEFAULT: '#0B1F1C',
          2: '#3E5350',
          3: '#7A8C89',
          4: '#A8B6B3',
        },
        line: {
          DEFAULT: '#E3EBE8',
          strong: '#CFDBD6',
        },
        accent: {
          DEFAULT: '#0F766E',
          hover: '#115E59',
          soft: '#CCFBF1',
          softer: '#E6FAF5',
          ink: '#134E4A',
        },
        success: {
          DEFAULT: '#15803D',
          soft: '#DCFCE7',
        },
        warn: {
          DEFAULT: '#B45309',
          soft: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#B91C1C',
          soft: '#FEE2E2',
        },
        info: {
          DEFAULT: '#1D4ED8',
          soft: '#DBEAFE',
        },
        live: {
          DEFAULT: '#DC2626',
          soft: '#FEE2E2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        bn: ['"Hind Siliguri"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '10px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        xs: '0 1px 1px rgba(15, 23, 42, 0.04)',
        sm: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        md: '0 4px 14px rgba(15, 23, 42, 0.08)',
        lg: '0 20px 50px -12px rgba(15, 23, 42, 0.22)',
        accent: '0 8px 24px -8px rgba(15, 118, 110, 0.35)',
        ring: '0 0 0 3px #E6FAF5',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        caret: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        caret: 'caret 1s steps(1) infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
