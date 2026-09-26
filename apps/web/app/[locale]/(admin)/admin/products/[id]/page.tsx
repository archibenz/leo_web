'use client';

import {use} from 'react';
import {useTranslations} from 'next-intl';
import ProductForm from '../../../../../../components/admin/ProductForm';

type Props = {
  params: Promise<{id: string}>;
};

// Блок «Рекомендации» снят 26.09: ручки /api/admin/products/{id}/recommendations
// в API нет с 6220cfdd (удалена как мёртвая), а блок остался — на каждой
// загрузке 404 и ошибка в консоли, пустой список и «Сохранить», которое не
// сохраняло никогда.
export default function EditProductPage({params}: Props) {
  const {id} = use(params);
  const t = useTranslations('admin.product');

  return (
    <div className="max-w-4xl *:mb-6 last:*:mb-0">
      <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{t('edit')}</h1>
      <ProductForm productId={id} />
    </div>
  );
}
