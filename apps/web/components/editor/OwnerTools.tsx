'use client';

import {useTranslations} from 'next-intl';
import Link from '@/components/loading/LoadingLink';
import {useEditorSession} from './useEditorSession';
import {writeEditCookie} from './editCookie';
import {workspaceCopy} from './workspaceCopy';
import styles from './EditorWorkspace.module.css';

export default function OwnerTools({locale}: {locale: string}) {
  const {isAdmin} = useEditorSession();
  const t = useTranslations('white.editModeSwitch');
  const copy = workspaceCopy(locale);
  if (!isAdmin) return null;

  return <section className={styles.ownerTools} aria-label={t('sectionLabel')}>
    <p className={styles.ownerLabel}>{t('sectionLabel')}</p>
    <Link href={`/${locale}?edit=1`} onClick={() => writeEditCookie(true)} className={`min-h-11 ${styles.ownerEntry}`}>
      <strong>{copy.entry}</strong><span>{copy.entryHint}</span>
    </Link>
    <div className={styles.ownerLinks}>
      <a className="min-h-11" href={`/${locale}/admin`}>{t('adminLink')}</a>
    </div>
  </section>;
}
