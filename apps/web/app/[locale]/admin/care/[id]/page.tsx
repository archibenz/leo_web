'use client';

import {useState, useEffect} from 'react';
import {useParams} from 'next/navigation';
import CareGuideForm from '../../../../../components/admin/CareGuideForm';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import Spinner from '../../../../../components/ui/Spinner';
import {apiFetch} from '../../../../../lib/api';

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
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<CareGuideData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<CareGuideData>(`/api/admin/care-guides/${id}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Spinner size="md" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <p className="text-sm text-[var(--ink-soft)]">Not found</p>
      </AdminLayout>
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
