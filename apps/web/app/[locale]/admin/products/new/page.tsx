'use client';

import {useTranslations} from 'next-intl';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import ProductForm from '../../../../../components/admin/ProductForm';

export default function NewProductPage() {
  const t = useTranslations('admin.product');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('add')}</h1>
        <div className="paper-card p-6">
          <ProductForm isNew />
        </div>
      </div>
    </AdminLayout>
  );
}
