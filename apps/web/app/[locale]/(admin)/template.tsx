import type {ReactNode} from 'react';

// Переход между страницами админки. Тот же, что у витрины, и по той же
// причине стоит ЗДЕСЬ, а не уровнем выше: шаблон пересоздаётся на каждой
// навигации вместе со всем поддеревом, и подними его на `[locale]` — внутрь
// попал бы `(admin)/layout.tsx` с AuthProvider, который тогда спрашивал бы
// `/api/auth/me` на каждый переход. Подробнее в соседнем шаблоне витрины.
export default function AdminTemplate({children}: {children: ReactNode}) {
  return <div className="page-enter">{children}</div>;
}
