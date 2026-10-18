'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {PageSkeleton} from '@/components/loading/PageSkeleton';
import {usePageLoading} from '@/components/loading/PageLoadingProvider';
import {apiFetch} from '../../../../../lib/api';
import {DynamicButton} from '../../../../../components/ui/dynamic-button';
import {Button} from '../../../../../components/ui/button';
import {Checkbox} from '../../../../../components/ui/checkbox';
import {Input} from '../../../../../components/ui/input';
import {Label} from '../../../../../components/ui/label';
import {Panel} from '../../../../../components/admin/dashboard/panel';
import {Notice} from '../../../../../components/admin/list/notice';
import {useIsDesktop} from '../../../../../components/editor/useIsDesktop';
import {SOCIAL_LABELS, type SocialNetwork} from '../../../../../lib/site/socials';

// Соцсети сайта — один список на подвал, страницу контактов и разметку для
// поисковиков (lib/site/socials.ts). Владелец отмечает, какие показывать.
// Адреса проверяет сервер (https и домен своей сети); его причину отказа
// показываем как есть — «адрес telegram должен вести на t.me» понятнее, чем
// «ошибка 400».
//
// Правка — только на компьютере (решение 24.09, как режим правки витрины):
// на узком экране список виден, но поля закрыты.

type Row = {network: SocialNetwork; href: string; shown: boolean};

export default function AdminSocialsPage() {
  const t = useTranslations('admin.socials');
  const ui = useTranslations('admin.ui');
  const desktop = useIsDesktop();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ok: boolean; text: string} | null>(null);

  usePageLoading(!rows && !loadFailed);

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    apiFetch<{links: Row[]}>('/api/admin/site/socials')
      .then((data) => {if (active) setRows(data.links);})
      .catch(() => {if (active) setLoadFailed(true);});
    return () => {active = false;};
  }, [loadAttempt]);

  const update = (network: SocialNetwork, patch: Partial<Row>) => {
    setMessage(null);
    setRows((prev) => prev && prev.map((r) => (r.network === network ? {...r, ...patch} : r)));
  };

  const save = async () => {
    if (!rows || saving || !desktop) return;
    setSaving(true);
    setMessage(null);
    try {
      const data = await apiFetch<{links: Row[]}>('/api/admin/site/socials', {
        method: 'PUT',
        body: JSON.stringify({links: rows}),
      });
      setRows(data.links);
      setMessage({ok: true, text: t('saved')});
    } catch (err) {
      setMessage({ok: false, text: err instanceof Error ? err.message : t('saveFailed')});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="*:mb-6 last:*:mb-0 pb-20">
      <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{t('title')}</h1>
      <Notice>{t('intro')}</Notice>
      {!desktop && <Notice>{t('desktopOnly')}</Notice>}

      {loadFailed ? (
        <Panel>
          <p role="alert" className="mb-4 text-[13px]">{ui('loadFailed')}</p>
          <Button className="min-h-11" onClick={() => setLoadAttempt(value => value + 1)}>{ui('retry')}</Button>
        </Panel>
      ) : !rows ? (
        <PageSkeleton kind="admin-form" embedded />
      ) : (
        <Panel>
          <div className="space-y-5">
            {rows.map((row) => (
              <div key={row.network} className="grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr_auto] md:items-center">
                <Label htmlFor={`social-${row.network}`} className="text-[13px]">
                  {SOCIAL_LABELS[row.network]}
                </Label>
                <Input
                  id={`social-${row.network}`}
                  value={row.href}
                  disabled={!desktop || saving}
                  inputMode="url"
                  onChange={(e) => update(row.network, {href: e.target.value})}
                />
                <label className="flex min-h-11 items-center gap-2 text-[13px]">
                  <Checkbox
                    checked={row.shown}
                    disabled={!desktop || saving}
                    aria-label={t('showOnSite', {network: SOCIAL_LABELS[row.network]})}
                    onCheckedChange={(v) => update(row.network, {shown: v === true})}
                  />
                  {t('shown')}
                </label>
              </div>
            ))}
            {desktop && (
              <div className="flex flex-wrap items-center gap-4">
                <DynamicButton onClick={save} state={saving ? 'pending' : message?.ok ? 'success' : 'idle'}>
                  {saving ? t('saving') : message?.ok ? t('savedAction') : t('save')}
                </DynamicButton>
                {message && (
                  <p role="status" className={message.ok ? 'text-[13px]' : 'text-[13px] text-destructive'}>
                    {message.text}
                  </p>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
