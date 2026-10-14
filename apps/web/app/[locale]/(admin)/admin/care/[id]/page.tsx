'use client';

import {useState, useEffect} from 'react';
import {useParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Button} from '../../../../../../components/ui/button';
import {Panel} from '../../../../../../components/admin/dashboard/panel';
import CareGuideForm from '../../../../../../components/admin/CareGuideForm';
import BrandLoader from '../../../../../../components/BrandLoader';
import {apiFetch} from '../../../../../../lib/api';

interface CareGuideData {
  id: string;
  title: string;
  description: string | null;
  tips: string | null;
  image: string | null;
  careSymbols: string;
  sortOrder: number;
  active: boolean;
}

export default function EditCareGuidePage() {
  const ui = useTranslations('admin.ui');
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<CareGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    apiFetch<CareGuideData>(`/api/admin/care-guides/${id}`)
      .then(data => {if (active) setData(data);})
      .catch(() => {if (active) setLoadFailed(true);})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [id, loadAttempt]);

  if (loading) {
    return (
      <div role="status" aria-label={ui('loading')} className="flex items-center justify-center py-20">
        <BrandLoader size={32} />
      </div>
    );
  }

  if (loadFailed || !data) {
    return (
      <Panel><p role="alert" className="mb-4 text-[13px]">{ui('loadFailed')}</p><Button className="min-h-11" onClick={() => setLoadAttempt(value => value + 1)}>{ui('retry')}</Button></Panel>
    );
  }

  const symbols: string[] = (() => {
    try { return JSON.parse(data.careSymbols); } catch { return []; }
  })();

  return (
    <CareGuideForm
      initial={{
        id: data.id,
        title: data.title,
        description: data.description ?? '',
        tips: data.tips ?? '',
        image: data.image ?? '',
        careSymbols: symbols,
        sortOrder: data.sortOrder,
        active: data.active,
      }}
    />
  );
}
