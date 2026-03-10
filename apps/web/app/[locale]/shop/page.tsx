import {Suspense} from 'react';
import type {Locale} from '../../../i18n';
import ShopClient from '../../../components/ShopClient';

export default async function ShopPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  void locale;
  return (
    <Suspense>
      <ShopClient />
    </Suspense>
  );
}
