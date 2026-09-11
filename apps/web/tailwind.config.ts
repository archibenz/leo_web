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
        button: '#9A3A2A',
        // Tokens shadcn blocks expect. They point at --sh-* (globals.css), not at
        // shadcn's own --background/--accent/...: those names would collide with the
        // gradient site's :root and repaint the admin. `accent` is deliberately not
        // remapped here — the key above is the gradient's gold and 17 files use it,
        // so a shadcn component that wants hover:bg-accent gets restyled instead.
        background: 'hsl(var(--sh-background) / <alpha-value>)',
        foreground: 'hsl(var(--sh-foreground) / <alpha-value>)',
        border: 'hsl(var(--sh-border) / <alpha-value>)',
        input: 'hsl(var(--sh-input) / <alpha-value>)',
        ring: 'hsl(var(--sh-ring) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--sh-primary) / <alpha-value>)',
          foreground: 'hsl(var(--sh-primary-foreground) / <alpha-value>)'
        },
        secondary: {
          DEFAULT: 'hsl(var(--sh-secondary) / <alpha-value>)',
          foreground: 'hsl(var(--sh-secondary-foreground) / <alpha-value>)'
        },
        muted: {
          DEFAULT: 'hsl(var(--sh-muted) / <alpha-value>)',
          foreground: 'hsl(var(--sh-muted-foreground) / <alpha-value>)'
        },
        destructive: {
          DEFAULT: 'hsl(var(--sh-destructive) / <alpha-value>)',
          foreground: 'hsl(var(--sh-destructive-foreground) / <alpha-value>)'
        },
        card: {
          DEFAULT: 'hsl(var(--sh-card) / <alpha-value>)',
          foreground: 'hsl(var(--sh-card-foreground) / <alpha-value>)'
        },
        popover: {
          DEFAULT: 'hsl(var(--sh-popover) / <alpha-value>)',
          foreground: 'hsl(var(--sh-popover-foreground) / <alpha-value>)'
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        accent: ['var(--font-accent)', 'Georgia', 'serif']
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
