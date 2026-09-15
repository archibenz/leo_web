'use client';

import {useTranslations} from 'next-intl';
import CollectionForm from '../../../../../../components/admin/CollectionForm';

export default function NewCollectionPage() {
  const t = useTranslations('admin.collection');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{t('add')}</h1>
      <div>
        <CollectionForm isNew />
      </div>
    </div>
  );
}
