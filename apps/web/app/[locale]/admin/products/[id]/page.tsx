'use client';

import {use} from 'react';
import {useTranslations} from 'next-intl';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import ProductForm from '../../../../../components/admin/ProductForm';

type Props = {
  params: Promise<{id: string}>;
};

export default function EditProductPage({params}: Props) {
  const {id} = use(params);
  const t = useTranslations('admin.product');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('edit')}</h1>
        <div className="paper-card p-6">
          <ProductForm productId={id} />
        </div>
      </div>
    </AdminLayout>
  );
}
