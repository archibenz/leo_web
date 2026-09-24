// Куда вернуть после входа: ?next= на странице аккаунта. Туда ведёт nginx,
// когда незалогиненный открывает /analytics (дашборд аналитики живёт на том же
// домене, но это не роут Next).
//
// Пускаем только путь на своём же сайте. Проверки «начинается с /» мало:
// «//evil.com» и «/\evil.com» браузер читает как чужой хост, а табуляцию и
// перевод строки внутри адреса молча выбрасывает — «/\t/evil.com» становится
// «//evil.com». Поэтому адрес разбирается тем же парсером, что у браузера, и
// сверяется источник; наружу отдаётся уже разобранный путь, не сырая строка.
export function safeNextPath(raw: string | null | undefined, origin: string): string | null {
  if (!raw || !raw.startsWith('/')) return null;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return url.pathname + url.search + url.hash;
}
