'use client';

import {useMemo} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {EDIT_PARAM} from '../../lib/catalogue/viewer';

// Режим живёт в адресе, а не в сессии: ссылку на черновик можно открыть,
// отправить себе на телефон и показать — и она покажет то же самое.
export function useEditHrefs(): {wantsEdit: boolean; editHref: string; plainHref: string} {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(() => {
    const on = new URLSearchParams(searchParams.toString());
    on.set(EDIT_PARAM, '1');
    const off = new URLSearchParams(searchParams.toString());
    off.delete(EDIT_PARAM);
    const href = (p: URLSearchParams) => (p.toString() ? `${pathname}?${p}` : pathname);
    return {wantsEdit: searchParams.get(EDIT_PARAM) === '1', editHref: href(on), plainHref: href(off)};
  }, [pathname, searchParams]);
}
