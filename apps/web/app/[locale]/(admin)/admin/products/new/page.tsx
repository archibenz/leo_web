'use client';

import {useTranslations} from 'next-intl';
import ProductForm from '../../../../../../components/admin/ProductForm';

export default function NewProductPage() {
  const t = useTranslations('admin.product');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{t('add')}</h1>
      <div>
        <ProductForm isNew />
      </div>
    </div>
  );
}
