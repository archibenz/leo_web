'use client';

// Variant 2 "White" — shared editorial footer. Rendered on the landing, shop
// and PDP so every page of the prototype closes on the same brand chrome.
// Prototype destinations stay inside /white (no leak to the gradient site).

const INK = '#1c1714';
const MUTED = '#776e64';
const HAIR = '#e7e2db';

export default function WhiteFooter({locale}: {locale: string}) {
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);

  return (
    <footer className="border-t" style={{borderColor: HAIR}}>
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <p className="font-display text-[20px] tracking-[0.3em]">REINASLEO</p>
          <p className="mt-3 text-[12px] leading-relaxed" style={{color: MUTED}}>{t('Premium womenswear', 'Премиальная женская одежда')}</p>
        </div>
        {[
          {h: t('Shop', 'Магазин'), href: `/${locale}/white/shop`, items: [t('New', 'Новинки'), t('Dresses', 'Платья'), t('Outerwear', 'Верхняя одежда')]},
          {h: t('Brand', 'Бренд'), href: `/${locale}/white`, items: [t('About', 'О бренде'), t('Care', 'Уход'), t('Contact', 'Контакты')]},
        ].map((col) => (
          <div key={col.h}>
            <p className="mb-4 text-[11px] uppercase tracking-[0.2em]" style={{color: INK}}>{col.h}</p>
            <ul className="space-y-2.5 text-[13px]" style={{color: MUTED}}>
              {col.items.map((it) => (
                <li key={it}>
                  <a href={col.href} className="inline-block transition-opacity hover:opacity-60">{it}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.2em]" style={{color: INK}}>{t('Newsletter', 'Рассылка')}</p>
          <form onSubmit={(e) => e.preventDefault()} className="flex items-center border-b pb-1.5" style={{borderColor: MUTED}}>
            <label htmlFor="wv-newsletter" className="sr-only">{t('Email address', 'Email-адрес')}</label>
            <input
              id="wv-newsletter"
              type="email"
              autoComplete="email"
              placeholder={t('Email', 'Email')}
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#7a7167]"
              style={{color: INK}}
            />
            <button
              type="submit"
              aria-label={t('Subscribe', 'Подписаться')}
              className="shrink-0 px-1 text-[12px] uppercase tracking-[0.16em] transition-opacity hover:opacity-60"
              style={{color: INK}}
            >
              →
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-6 pb-10 text-[11px] uppercase tracking-[0.14em] sm:px-10" style={{color: MUTED}}>
        © 2026 REINASLEO · {t('White variant — preview', 'Белый вариант — превью')}
      </div>
    </footer>
  );
}
