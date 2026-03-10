import type {Config} from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './messages/**/*.{ts,tsx,json}'
  ],
  theme: {
    extend: {
      colors: {
        paper: '#1E120D',
        paperMuted: '#2B1711',
        ink: '#F3E9DA',
        inkSoft: '#F2E6D8',
        accent: '#D4A574',
        button: '#9A3A2A'
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 24px 48px rgba(43, 23, 17, 0.08)',
        subtle: '0 12px 24px rgba(43, 23, 17, 0.04)'
      },
      borderRadius: {
        collage: '18px'
      }
    }
  },
  plugins: []
};

export default config;
