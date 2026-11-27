/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#07090D',
          900: '#07090D',
          850: '#0B0E14',
          800: '#10141C',
          700: '#171C26',
          600: '#1F2531',
        },
        gold: {
          DEFAULT: '#F5C542',
          400: '#F7D06B',
          500: '#F5C542',
          600: '#D6AD45',
          700: '#A9873A',
        },
        bone: '#F5F5F5',
        muted: '#9298A5',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        editorial: '0.22em',
        wide2: '0.14em',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(245,197,66,0.18), 0 24px 60px -28px rgba(245,197,66,0.35)',
        card: '0 24px 60px -40px rgba(0,0,0,0.9)',
      },
      backgroundImage: {
        'gold-sheen': 'linear-gradient(135deg, #F7D06B 0%, #F5C542 40%, #D6AD45 70%, #A9873A 100%)',
        'ink-fade': 'radial-gradient(120% 120% at 50% 0%, #171C26 0%, #0B0E14 45%, #07090D 100%)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        shimmer: 'shimmer 2.4s linear infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
};
