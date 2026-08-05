import type {Metadata} from 'next';
import {getMessages} from 'next-intl/server';
import {headers} from 'next/headers';
import WhiteInfoShowcase from '../info/WhiteInfoShowcase';
import {brandMeta} from '../../../lib/openGraph';
import {safeJsonLd} from '../../../lib/jsonLd';

// Variant 2 "White" — FAQ page (pitch preview at /<locale>/faq).
// Indexable — the White variant is the site. title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  const title = 'FAQ · REINASLEO';
  const description = ru
    ? 'Ответы на вопросы о размерах, заказах, доставке и возврате REINASLEO.'
    : 'Answers about sizing, orders, delivery and returns at REINASLEO.';
  return {
    title: {absolute: title},
    description,
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}/faq`},
    ...brandMeta({locale, path: '/faq', title, description}),
  };
}

type Section = {h: string; b: string};

export default async function WhiteFaqPage({params}: Props) {
  const {locale} = await params;
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  // The questions already lived in the translations and rendered as plain text.
  // Declaring them as an FAQPage is what lets the answers surface directly in
  // the result — which is the whole point of having written them.
  const messages = (await getMessages()) as {white?: {info?: {faq?: {sections?: Section[]}}}};
  const sections = messages.white?.info?.faq?.sections ?? [];
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sections.map((s) => ({
      '@type': 'Question',
      name: s.h,
      acceptedAnswer: {'@type': 'Answer', text: s.b},
    })),
  };

  return (
    <>
      {sections.length > 0 && (
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html: safeJsonLd(faqJsonLd)}} />
      )}
      <WhiteInfoShowcase locale={locale} ns="faq" />
    </>
  );
}
