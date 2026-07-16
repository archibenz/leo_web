import {Suspense} from 'react';
import type {Metadata} from 'next';
import type {Locale} from '../../../i18n';
import CarePageClient from '../../../components/CarePageClient';

import { API_BASE } from '../../../lib/api';
type Props = {params: Promise<{locale: Locale}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Уход за одеждой' : 'Garment Care',
    description: isRu
      ? 'Рекомендации по уходу за изделиями REINASLEO — шёлк, шерсть, кашемир и другие ткани.'
      : 'Care instructions for REINASLEO garments — silk, wool, cashmere, and other fabrics.',
    alternates: {
      canonical: `/${locale}/care`,
      languages: {en: '/en/care', ru: '/ru/care'},
    },
  };
}

export default async function CarePage({params}: Props) {
  const {locale} = await params;

  let guides: unknown[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/care-guides`, {next: {revalidate: 60}});
    if (res.ok) guides = await res.json();
  } catch { /* fallback to client-side fetch */ }

  return (
    <Suspense>
      <CarePageClient initialGuides={guides} locale={locale} />
    </Suspense>
  );
}
