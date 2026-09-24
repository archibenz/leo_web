'use client';

import {useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import BrandLoader from '../../../../../components/BrandLoader';
import {apiFetch} from '../../../../../lib/api';
import {Button} from '../../../../../components/ui/button';
import {Input} from '../../../../../components/ui/input';
import {Textarea} from '../../../../../components/ui/textarea';
import {Label} from '../../../../../components/ui/label';
import {Panel} from '../../../../../components/admin/dashboard/panel';
import {Notice} from '../../../../../components/admin/list/notice';
import {useIsDesktop} from '../../../../../components/editor/useIsDesktop';
import {
  DEFAULT_CONTACT_EMAIL,
  SITE_TEXT_FIELDS,
  editProblem,
  type LocalizedEdit,
  type SiteTextEdits,
  type SiteTextField,
} from '../../../../../lib/site/texts';
import ruMessages from '../../../../../messages/ru.json';
import enMessages from '../../../../../messages/en.json';

// «Тексты сайта» — правки заголовков и подписей витрины (lib/site/texts.ts).
// Пустое поле — «как было»: у каждого виден исходный текст. Ошибка — прямо у
// поля и до сохранения: плейсхолдер вроде {name} обязан остаться, иначе
// витрина правку не покажет. Сервер проверяет своё и отвечает причиной.
// Правка — только на компьютере (решение 24.09, как режим правки витрины).

const LANGS = ['ru', 'en'] as const;
type Lang = (typeof LANGS)[number];
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function original(key: string, lang: Lang): string {
  const dict = lang === 'ru' ? ruMessages : enMessages;
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], dict);
  return typeof value === 'string' ? value : '';
}

export default function AdminTextsPage() {
  const t = useTranslations('admin.texts');
  const desktop = useIsDesktop();
  const [edits, setEdits] = useState<Record<string, LocalizedEdit> | null>(null);
  const [email, setEmail] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ok: boolean; text: string} | null>(null);

  useEffect(() => {
    apiFetch<SiteTextEdits>('/api/admin/site/texts')
      .then((data) => {
        setEdits(data.texts ?? {});
        setEmail(data.contactEmail ?? '');
      })
      .catch(() => setLoadFailed(true));
  }, []);

  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    if (!edits) return out;
    for (const group of SITE_TEXT_FIELDS) {
      for (const field of group.fields) {
        for (const lang of LANGS) {
          const value = edits[field.key]?.[lang]?.trim();
          if (!value) continue;
          const problem = editProblem(value, original(field.key, lang), field.max);
          if (problem) out[`${field.key}.${lang}`] = problem;
        }
      }
    }
    const e = email.trim();
    if (e && !EMAIL.test(e)) out.contactEmail = t('emailProblem');
    return out;
  }, [edits, email, t]);

  const setText = (key: string, lang: Lang, value: string) =>
    setEdits((prev) => ({...prev, [key]: {...prev?.[key], [lang]: value}}));

  const reset = (key: string) =>
    setEdits((prev) => {
      const next = {...prev};
      delete next[key];
      return next;
    });

  const save = async () => {
    if (!edits) return;
    setSaving(true);
    setMessage(null);
    try {
      const data = await apiFetch<SiteTextEdits>('/api/admin/site/texts', {
        method: 'PUT',
        body: JSON.stringify({texts: edits, contactEmail: email}),
      });
      setEdits(data.texts ?? {});
      setEmail(data.contactEmail ?? '');
      setMessage({ok: true, text: t('saved')});
    } catch (err) {
      setMessage({ok: false, text: err instanceof Error ? err.message : t('saveFailed')});
    } finally {
      setSaving(false);
    }
  };

  const field = (f: SiteTextField) => {
    const Control = f.max >= 160 ? Textarea : Input;
    const touched = LANGS.some((lang) => edits?.[f.key]?.[lang]?.trim());
    return (
      <div key={f.key} className="space-y-2 border-b pb-5 last:border-b-0 last:pb-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] font-medium">{f.label}</p>
          {desktop && touched && (
            <Button variant="ghost" size="sm" onClick={() => reset(f.key)}>
              {t('reset')}
            </Button>
          )}
        </div>
        {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {LANGS.map((lang) => {
            const id = `text-${f.key}-${lang}`;
            const problem = problems[`${f.key}.${lang}`];
            return (
              <div key={lang} className="space-y-1">
                <Label htmlFor={id} className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {lang === 'ru' ? t('ru') : t('en')}
                </Label>
                <Control
                  id={id}
                  value={edits?.[f.key]?.[lang] ?? ''}
                  placeholder={original(f.key, lang)}
                  disabled={!desktop}
                  aria-invalid={problem ? true : undefined}
                  onChange={(e) => setText(f.key, lang, e.target.value)}
                />
                {problem && <p className="text-[12px] text-destructive">{problem}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const hasProblems = Object.keys(problems).length > 0;

  return (
    <div className="*:mb-6 last:*:mb-0 pb-20">
      <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{t('title')}</h1>
      <Notice>{t('intro')}</Notice>
      {!desktop && <Notice>{t('desktopOnly')}</Notice>}

      {loadFailed ? (
        <Panel>
          <p className="text-[13px]">{t('loadFailed')}</p>
        </Panel>
      ) : !edits ? (
        <div className="flex items-center justify-center py-20">
          <BrandLoader size={32} />
        </div>
      ) : (
        <>
          {SITE_TEXT_FIELDS.map((group) => (
            <Panel key={group.page} title={group.title}>
              <div className="space-y-5">
                {group.fields.map(field)}
                {group.page === 'contact' && (
                  <div className="space-y-2">
                    <Label htmlFor="text-contact-email" className="text-[13px] font-medium">
                      {t('email')}
                    </Label>
                    <p className="text-[11px] text-muted-foreground">{t('emailHint')}</p>
                    <Input
                      id="text-contact-email"
                      type="email"
                      value={email}
                      placeholder={DEFAULT_CONTACT_EMAIL}
                      disabled={!desktop}
                      aria-invalid={problems.contactEmail ? true : undefined}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {problems.contactEmail && <p className="text-[12px] text-destructive">{problems.contactEmail}</p>}
                  </div>
                )}
              </div>
            </Panel>
          ))}
          {desktop && (
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={save} disabled={saving || hasProblems}>
                {saving ? t('saving') : t('save')}
              </Button>
              {hasProblems && <p className="text-[13px] text-destructive">{t('fixFirst')}</p>}
              {message && (
                <p role="status" className={message.ok ? 'text-[13px]' : 'text-[13px] text-destructive'}>
                  {message.text}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
