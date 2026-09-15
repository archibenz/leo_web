'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import {apiFetch} from '../../lib/api';
import ImageUpload from './ImageUpload';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import {Panel} from './dashboard/panel';
import {FormActions, FormField} from './form/field';

interface CollectionFormProps {
  collectionId?: string;
  isNew?: boolean;
}

export default function CollectionForm({collectionId, isNew}: CollectionFormProps) {
  const t = useTranslations('admin.collection');
  const router = useRouter();
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    sortOrder: 0,
  });

  useEffect(() => {
    if (collectionId && !isNew) {
      apiFetch<Record<string, unknown>>(`/api/admin/collections/${collectionId}`).then(data => {
        setForm({
          name: (data.name as string) || '',
          description: (data.description as string) || '',
          imageUrl: (data.imageUrl as string) || '',
          sortOrder: (data.sortOrder as number) || 0,
        });
      }).catch(() => {});
    }
  }, [collectionId, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      if (isNew) {
        await apiFetch('/api/admin/collections', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setMessage(t('created'));
        setTimeout(() => router.push(`/${locale}/admin/collections`), 1000);
      } else {
        await apiFetch(`/api/admin/collections/${collectionId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setMessage(t('updated'));
      }
    } catch {
      setMessage('Error saving collection');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (images: {src: string; alt: string}[]) => {
    if (images.length > 0) {
      setForm(prev => ({...prev, imageUrl: images[images.length - 1].src}));
    }
  };

  return (
    <form className="*:mb-6 last:*:mb-0 pb-20" onSubmit={handleSubmit}>
      <Panel title={t('name')}>
        <div className="space-y-6">
          <FormField id="collection-name" label={t('name')}>
            <Input
              className="min-h-11"
              id="collection-name"
              onChange={e => setForm(prev => ({...prev, name: e.target.value}))}
              required
              value={form.name}
            />
          </FormField>

          <FormField id="collection-description" label={t('description')}>
            <Textarea
              className="min-h-24"
              id="collection-description"
              onChange={e => setForm(prev => ({...prev, description: e.target.value}))}
              value={form.description}
            />
          </FormField>

          <FormField id="collection-sort" label={t('sortOrder')}>
            <Input
              className="min-h-11 w-28"
              id="collection-sort"
              inputMode="numeric"
              onChange={e => setForm(prev => ({...prev, sortOrder: parseInt(e.target.value) || 0}))}
              type="number"
              value={form.sortOrder}
            />
          </FormField>
        </div>
      </Panel>

      <Panel title={t('image')}>
        <ImageUpload
          images={form.imageUrl ? [{src: form.imageUrl, alt: form.name}] : []}
          onChange={handleImageChange}
        />
      </Panel>

      <FormActions
        cancelLabel={t('cancel')}
        message={message}
        onCancel={() => router.push(`/${locale}/admin/collections`)}
        saveLabel={t('save')}
        saving={saving}
        savingLabel={t('saving')}
      />
    </form>
  );
}
