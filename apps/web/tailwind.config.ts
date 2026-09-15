import type {Config} from 'tailwindcss';

const config: Config = {
  // У Tailwind 3 без этой строки действует стратегия 'media': классы `dark:`
  // включаются НАСТРОЙКОЙ СИСТЕМЫ пользователя. Примитивы shadcn такие классы
  // приносят (`dark:bg-input/30` на полях ввода), а владелец смотрит админку с
  // телефона и уже дважды жаловался, что она тёмная. Сама витрина `dark:` не
  // использует ни разу — проверено, ноль вхождений, — поэтому переход на
  // 'class' ничего не меняет ей и закрывает тёмный экран у него.
  darkMode: ['class'],
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
        // remapped here — the key above is the gradient's gold and 23 files use it
        // (130 class uses, `text-accent` alone 67 times).
        //
        // Отсюда `ui-accent` ниже. У shadcn `accent` — это ПОВЕРХНОСТЬ наведения
        // (пункт списка под курсором), у нас `accent` — БРЕНДОВОЕ ЗОЛОТО текста.
        // Одно имя, два разных смысла. Переопределить ключ `accent` под shadcn
        // нельзя: золото задано шестнадцатеричным кодом, а перевод его в hsl()
        // округляет составляющие и молча сдвигает цвет на всех 130 местах витрины.
        // Поэтому золото не трогаем вовсе, а примитивам даём отдельный токен;
        // в них `bg-accent` заменён на `bg-ui-accent` (18 мест, 6 файлов).
        // Сторож против возврата: components/ui/__tests__/no-bare-accent.test.ts.
        'ui-accent': {
          DEFAULT: 'hsl(var(--sh-ui-accent) / <alpha-value>)',
          foreground: 'hsl(var(--sh-ui-accent-foreground) / <alpha-value>)'
        },
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
        },
        // Боковая панель админки (components/ui/sidebar.tsx). Отдельная
        // восьмёрка токенов — не наша прихоть, так устроен примитив shadcn:
        // панель обязана отличаться от полотна страницы, иначе граница между
        // навигацией и содержимым пропадает. Значения задаются в globals.css,
        // в нашей тёплой палитре, а не в цинке, который положил установщик.
        sidebar: {
          DEFAULT: 'hsl(var(--sh-sidebar) / <alpha-value>)',
          foreground: 'hsl(var(--sh-sidebar-foreground) / <alpha-value>)',
          primary: 'hsl(var(--sh-sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'hsl(var(--sh-sidebar-primary-foreground) / <alpha-value>)',
          accent: 'hsl(var(--sh-sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'hsl(var(--sh-sidebar-accent-foreground) / <alpha-value>)',
          border: 'hsl(var(--sh-sidebar-border) / <alpha-value>)',
          ring: 'hsl(var(--sh-sidebar-ring) / <alpha-value>)'
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
