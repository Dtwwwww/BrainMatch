import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F5A623',
          light: '#F7C873',
          dark: '#D4891A',
          glow: 'rgba(245,166,35,0.25)',
        },
        accent: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          glow: 'rgba(99,102,241,0.2)',
        },
        grade: {
          S: {
            bg: '#3B1A24',
            text: '#F8719D',
            border: 'rgba(248,113,157,0.3)',
          },
          A: {
            bg: '#2D2410',
            text: '#F5A623',
            border: 'rgba(245,166,35,0.3)',
          },
          B: {
            bg: '#1A2A24',
            text: '#6EE7B7',
            border: 'rgba(110,231,183,0.3)',
          },
          C: {
            bg: '#1F1F23',
            text: '#A1A1AA',
            border: 'rgba(161,161,170,0.3)',
          },
        },
        success: { DEFAULT: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
        warning: { DEFAULT: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
        error: { DEFAULT: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
        info: { DEFAULT: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
      },
      fontFamily: {
        sans: [
          'Inter',
          'SF Pro Text',
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Microsoft YaHei',
          'Noto Sans SC',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Cascadia Code',
          'Fira Code',
          'monospace',
        ],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        glass:
          '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset',
        'glass-hover':
          '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
        'glow-brand': '0 0 30px rgba(245,166,35,0.3)',
        'glow-accent': '0 0 30px rgba(99,102,241,0.2)',
        'glow-S': '0 0 12px rgba(248,113,157,0.15)',
        'glow-A': '0 0 12px rgba(245,166,35,0.15)',
        'glow-offer': '0 0 10px rgba(34,197,94,0.1)',
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'count-up': 'countUp 0.8s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16,1,0.3,1)',
        spring: 'cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
