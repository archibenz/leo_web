'use client';

import {use} from 'react';
import {useTranslations} from 'next-intl';
import CollectionForm from '../../../../../../components/admin/CollectionForm';

type Props = {
  params: Promise<{id: string}>;
};

export default function EditCollectionPage({params}: Props) {
  const {id} = use(params);
  const t = useTranslations('admin.collection');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{t('edit')}</h1>
      <div>
        <CollectionForm collectionId={id} />
      </div>
    </div>
  );
}
