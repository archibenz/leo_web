'use client';

import {useTranslations} from 'next-intl';
import BrandLoader from './BrandLoader';

type LoaderSplashProps = {
  size?: number;
};

export default function LoaderSplash({size = 128}: LoaderSplashProps) {
  const t = useTranslations('common');
  return (
    <div
      role="status"
      aria-label={t('loading')}
      // БЕЛЫЙ, КАК САЙТ. До 17.09 экран загрузки АДМИНКИ
      // (app/[locale]/(admin)/admin/loading.tsx) оставался из градиентной
      // эпохи: подложка bg-paper = #1E120D, надпись text-ink = #F3E9DA,
      // золотое свечение, красный отсвет и виньетка, затемнявшая углы до
      // rgba(8,4,2,.45).
      //
      // Владелец просил админку светлым стилем, как витрина, и этот экран он
      // видит ЧАЩЕ страницы ошибки — при каждой загрузке админского раздела.
      // Тёмная вспышка между двумя белыми экранами читается как чужая
      // страница, а не как ожидание.
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center bg-white text-[#1c1714]"
      style={{height: '100dvh', minHeight: '100dvh'}}
    >
      <div className="relative flex flex-col items-center gap-12">
        <BrandLoader size={size} decorative />

        <div className="flex flex-col items-center gap-3">
          {/* Волосяная линия витрины вместо золотой: золото — цвет прежней
              темы, и здесь оно осталось последним её следом. */}
          <span aria-hidden className="block h-px w-16" style={{background: '#e7e2db'}} />
          <span className="font-display uppercase text-sm tracking-[0.55em]" style={{color: '#776e64'}}>
            REINASLEO
          </span>
        </div>
      </div>
    </div>
  );
}
