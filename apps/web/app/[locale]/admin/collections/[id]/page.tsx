'use client';

import {use} from 'react';
import {useTranslations} from 'next-intl';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import CollectionForm from '../../../../../components/admin/CollectionForm';

type Props = {
  params: Promise<{id: string}>;
};

export default function EditCollectionPage({params}: Props) {
  const {id} = use(params);
  const t = useTranslations('admin.collection');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('edit')}</h1>
        <div className="paper-card p-6">
          <CollectionForm collectionId={id} />
        </div>
      </div>
    </AdminLayout>
  );
}
