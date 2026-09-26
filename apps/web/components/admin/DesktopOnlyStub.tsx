import desktopOnly from '../../lib/nav/desktop-only.json';

// «Панель работает на компьютере» — админка при ширине окна меньше 1024 px
// (задача владельца 26.09, общая с дашбордом аналитики: текст и ссылки —
// lib/nav/desktop-only.json, копия источника в leo_analytics).
//
// ТОЛЬКО CSS: заглушка видна до lg (min-width 1024px), панель — с lg. Без JS
// нет вспышки и нет расхождения «сервер решил одно, браузер другое».
// Порог в JSON сверяет с брейкпоинтом Tailwind lib/nav/__tests__/desktopOnly.test.ts.
//
// Цвета — токены (bg-background, text-foreground…): заглушка стоит внутри
// data-admin-shell и темнеет по системной теме вместе с админкой.
export default function DesktopOnlyStub() {
  const [site, bot] = desktopOnly.actions;
  return (
    <main
      data-desktop-only-stub=""
      className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16 text-center text-foreground lg:hidden"
    >
      <p className="font-display text-[20px] tracking-[0.12em]">REINASLEO</p>
      <h1 className="mt-10 font-display text-[clamp(26px,7vw,34px)] leading-[1.1]">{desktopOnly.title}</h1>
      <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted-foreground">{desktopOnly.body}</p>
      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <a
          href={site.href}
          className="flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-[14px] uppercase tracking-[0.12em] text-primary-foreground"
        >
          {site.label}
        </a>
        <a
          href={bot.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center rounded-md border border-border px-4 text-[14px] uppercase tracking-[0.12em]"
        >
          {bot.label}
        </a>
      </div>
    </main>
  );
}
