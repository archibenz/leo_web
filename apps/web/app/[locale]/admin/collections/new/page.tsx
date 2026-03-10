'use client';

import {useTranslations} from 'next-intl';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import CollectionForm from '../../../../../components/admin/CollectionForm';

export default function NewCollectionPage() {
  const t = useTranslations('admin.collection');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('add')}</h1>
        <div className="paper-card p-6">
          <CollectionForm isNew />
        </div>
      </div>
    </AdminLayout>
  );
}
