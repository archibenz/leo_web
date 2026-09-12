// Флаг режима правки — отдельным модулем без единого серверного импорта.
//
// Причина конкретная: переключатель в шапке это клиентский компонент, и, беря
// константу из viewer.ts, он утаскивал в браузерный бандл `next/headers`.
// Сборка падала на первом же запросе; типы такое не ловят.

// Режим живёт в адресе, а не в сессии: ссылку на черновик можно открыть,
// отправить себе на телефон и показать.
export const EDIT_PARAM = 'edit';

// Второй, персистентный способ сказать то же самое: кука, которую ставит и
// снимает выключатель в аккаунте/админке (components/editor/editCookie.ts).
// Имя живёт здесь, а не там: viewer.ts читает его на сервере через
// cookies(), клиентский помощник — через document.cookie, и обоим нужна
// только строка, без серверных импортов.
export const EDIT_COOKIE = 'rl_edit';

type SearchParams = Record<string, string | string[] | undefined>;

// Ровно '1' и ничего больше: «похожие» значения вроде ?edit=true не должны
// открывать режим случайно.
export function wantsEditing(searchParams?: SearchParams): boolean {
  const raw = searchParams?.[EDIT_PARAM];
  return (Array.isArray(raw) ? raw[0] : raw) === '1';
}
