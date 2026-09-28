// Хост, откуда пришли, — у первого просмотра загрузки страницы (решение 28.09,
// экран «Источники» аналитики). Только хост: путь и строка запроса чужой
// страницы могут нести что угодно. Свой домен или пустой реферер — 'direct'.
// Переходы внутри сайта (клиентский роутер) document.referrer не меняют,
// поэтому хост берётся один раз на загрузку, а не на каждый просмотр.

let taken = false;

export function referrerHostOf(referrer: string, ownHost: string): string {
  const bare = (host: string) => host.toLowerCase().replace(/^www\./, '');
  try {
    const host = bare(new URL(referrer).hostname);
    return host && host !== bare(ownHost) ? host : 'direct';
  } catch {
    return 'direct';
  }
}

/** Хост реферера для первого просмотра загрузки; дальше — undefined. */
export function takeReferrerHost(): string | undefined {
  if (taken || typeof document === 'undefined') return undefined;
  taken = true;
  return referrerHostOf(document.referrer, window.location.hostname);
}
