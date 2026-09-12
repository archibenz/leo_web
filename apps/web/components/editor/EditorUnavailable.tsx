import Link from 'next/link';
import {HAIR, INK, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';

// Предпросмотр не собрался. Показать вместо него опубликованную витрину
// нельзя: владелец решит либо «правка потерялась» и сделает её заново поверх
// уже сохранённой, либо — хуже — «правка применилась» и нажмёт «Опубликовать»
// вслепую. Поэтому здесь страница, а не подмена.
export default function EditorUnavailable({plainHref, reason}: {plainHref: string; reason: string}) {
  return (
    <main id="wv-main" className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col justify-center px-6 py-24">
      <p className="text-[11px] uppercase tracking-[0.28em]" style={{color: SIGNAL}}>
        Предпросмотр
      </p>
      <h1 className="mt-4 font-display text-[34px] font-light leading-tight" style={{color: INK}}>
        Сервер данных недоступен
      </h1>
      <p className="mt-5 text-[15px] leading-relaxed" style={{color: MUTED}}>
        Черновик показать нечем. Правка не потеряна — она сохранена на сервере и ждёт публикации. Обновите страницу
        через минуту.
      </p>
      <p className="mt-6 border-t pt-4 text-[12px]" style={{borderColor: HAIR, color: MUTED}}>
        {reason}
      </p>
      <Link href={plainHref} className="mt-8 inline-flex self-start px-5 py-3 text-[11px] uppercase tracking-[0.18em]" style={{border: `1px solid ${INK}`, color: INK}}>
        Открыть витрину как покупатель
      </Link>
    </main>
  );
}
