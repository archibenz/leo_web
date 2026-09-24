import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {defaultLocale, locales, type Locale} from './i18n-routing';
import {applyTextEdits, getSiteTexts} from './lib/site/texts';

// Re-export for use in components
export {defaultLocale, locales, type Locale} from './i18n-routing';

export default getRequestConfig(async ({requestLocale}) => {
  // Validate that the incoming locale parameter is valid
  const locale = await requestLocale;
  
  if (!locale || !locales.includes(locale as Locale)) {
    notFound();
  }

  // «Тексты сайта»: правки владельца поверх перевода (lib/site/texts.ts).
  // Только белый список ключей; не подошедшая правка — исходный текст.
  const base = (await import(`./messages/${locale}.json`)).default;
  return {
    locale,
    messages: applyTextEdits(base, await getSiteTexts(), locale)
  };
});
