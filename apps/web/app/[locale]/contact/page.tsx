import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import ContactForm from '../../../components/ContactForm';
import type {Locale} from '../../../i18n';

type Props = {params: Promise<{locale: Locale}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Контакты' : 'Contact',
    description: isRu
      ? 'Свяжитесь с REINASLEO: запись в ателье, вопросы по заказам, сотрудничество.'
      : 'Get in touch with REINASLEO: atelier appointments, order inquiries, collaboration.',
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {en: '/en/contact', ru: '/ru/contact'},
    },
  };
}

export default async function ContactPage({params}: Props) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'contact'});

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-16 lg:px-8">
      <p className="capsule-tag">{t('tag')}</p>
      <h1 className="font-display leading-tight text-ink text-[clamp(1.5rem,4vw,2.5rem)]">{t('title')}</h1>
      <p className="text-lg leading-relaxed text-ink-soft">{t('subtitle')}</p>
      <div className="paper-card p-6">
        <ContactForm />
      </div>
    </div>
  );
}
