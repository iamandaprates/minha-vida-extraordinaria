import type { Config } from 'tailwindcss';

/** Mive tokens. Semantic colours read CSS variables so the same class works in light and dark. */
const themed = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /** Desktop começa em 769px: até 768px (inclusive) vale a navegação de celular. */
      screens: { md: '769px' },
      colors: {
        magenta: '#F31991',
        violeta: '#3B0A4D',
        lilas: '#CFA3FF',
        ciano: '#00C9DF',
        rosa: '#FFE6F3',
        perola: '#FFFFFF',
        ink: themed('ink'),
        'ink-soft': themed('ink-soft'),
        muted: themed('muted'),
        canvas: themed('canvas'),
        line: themed('line')
      },
      fontFamily: { sans: ['"Sora Variable"', 'Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        glass: '0 16px 40px rgba(59, 10, 77, 0.08)',
        lift: '0 24px 60px rgba(59, 10, 77, 0.14)',
        magenta: '0 12px 28px rgba(243, 25, 145, 0.32)'
      },
      backgroundImage: { 'grad-magenta': 'linear-gradient(135deg, #F31991 0%, #FF4FB0 55%, #CFA3FF 120%)' },
      keyframes: {
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(243, 25, 145, 0.55)' }, '60%': { boxShadow: '0 0 0 8px rgba(243, 25, 145, 0)' } },
        drift: { '0%, 100%': { transform: 'translate3d(0, 0, 0)' }, '50%': { transform: 'translate3d(-2%, 1.5%, 0)' } }
      },
      animation: { 'pulse-glow': 'pulseGlow 2.4s ease-out infinite', drift: 'drift 18s ease-in-out infinite' }
    }
  },
  plugins: []
} satisfies Config;
