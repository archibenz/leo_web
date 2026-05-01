import Link from 'next/link';

interface DesktopNudgeProps {
  locale: string;
}

export default function DesktopNudge({locale}: DesktopNudgeProps) {
  const isRu = locale === 'ru';
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-8 py-24">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <p className="font-accent text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
          Mobile preview
        </p>
        <h1 className="font-display text-3xl font-light leading-tight text-[var(--ink)]">
          {isRu ? 'Лучше всего на телефоне' : 'Best experienced on mobile'}
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
          {isRu
            ? 'Эта версия каталога рассчитана на вертикальный скролл со смартфона. Откройте страницу с телефона или вернитесь к десктопному магазину.'
            : 'This catalog is designed for vertical scroll on a phone. Open it on mobile or head back to the desktop shop.'}
        </p>
        <Link
          href={`/${locale}/shop`}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)] transition-colors duration-200 hover:bg-[var(--accent)] hover:text-paper"
        >
          {isRu ? 'Открыть каталог' : 'Open shop'}
        </Link>
      </div>
    </div>
  );
}
