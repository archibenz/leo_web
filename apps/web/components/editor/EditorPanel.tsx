'use client';

import {useEffect, useState} from 'react';
import {useLoadingRouter as useRouter} from '@/components/loading/useLoadingRouter';
import {useEditor, type EditorTab} from './EditorProvider';
import {useEditHrefs} from './editHrefs';
import {writeEditCookie} from './editCookie';
import {workspaceCopy} from './workspaceCopy';
import SectionForm from './SectionForm';
import TickerForm from './TickerForm';
import VariantForm from './VariantForm';
import ModelForm from './ModelForm';
import PublishList from './PublishList';
import styles from './EditorWorkspace.module.css';

export default function EditorPanel() {
  const {editing, sessionEditing, target, selectedRegion, regions, selectRegion, refresh, locale, products,
    tab, setTab, formState, operationBusy, guardMessage, canLeave, discardLocal} = useEditor();
  const router = useRouter();
  const {plainHref} = useEditHrefs();
  const [saved, setSaved] = useState(0);
  const [changesVisited, setChangesVisited] = useState(false);
  useEffect(() => {if (tab === 'changes') setChangesVisited(true);}, [tab]);
  const copy = workspaceCopy(locale);
  if (!sessionEditing) return null;
  const busy = formState.busy || operationBusy;
  const onSaved = () => {setSaved((value) => value + 1); refresh();};
  const formKey = target ? `${target.kind}:${target.kind === 'variant' ? target.modelId : ''}:${target.id}:${selectedRegion}` : '';
  const finish = () => {
    if (!canLeave()) return;
    writeEditCookie(false);
    router.replace(plainHref);
    router.refresh();
  };

  return <aside aria-label={copy.title} hidden={!editing} className={styles.inspector}>
    <header className={styles.heading}>
      <span className={styles.eyebrow}>REINASLEO</span>
      <h2>{copy.title}</h2>
      <p>{copy.preview}</p>
    </header>
    <div role="tablist" aria-label={copy.title} className={styles.tabs}>
      {(['blocks', 'properties', 'changes'] as EditorTab[]).map((key) =>
        <button className="min-h-11" key={key} id={`editor-tab-${key}`} type="button" role="tab" aria-selected={tab === key}
          aria-controls={`editor-panel-${key}`} tabIndex={tab === key ? 0 : -1}
          onClick={() => setTab(key)} onKeyDown={(event) => {
            const keys: EditorTab[] = ['blocks', 'properties', 'changes'];
            const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (!delta) return;
            event.preventDefault();
            const next = keys[(keys.indexOf(key) + delta + keys.length) % keys.length];
            setTab(next);
            document.getElementById(`editor-tab-${next}`)?.focus();
          }}>{copy[key]}</button>)}
    </div>
    <div className={styles.panelBody}>
      <section id="editor-panel-blocks" role="tabpanel" aria-labelledby="editor-tab-blocks" hidden={tab !== 'blocks'}>
        <p className={styles.hint}>{regions.length ? copy.intro : copy.empty}</p>
        <ol className={styles.blockList}>{regions.map((region, index) => <li key={region.id}>
          <button className="min-h-11" type="button" aria-pressed={region.id === selectedRegion} onClick={() => selectRegion(region.id)}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{region.label}
          </button>
        </li>)}</ol>
      </section>
      <section id="editor-panel-properties" role="tabpanel" aria-labelledby="editor-tab-properties" hidden={tab !== 'properties'}>
        {target ? <>
          <h3 className={styles.targetHeading}>{target.label}</h3>
          <p className={styles.hint}>{copy.previewHint}</p>
          <fieldset disabled={operationBusy} inert={operationBusy}>
          {target.kind === 'section' ? target.section.layout === 'ticker'
            ? <TickerForm key={formKey} section={target.section} products={products} locale={locale} onSaved={onSaved} />
            : <SectionForm key={formKey} section={target.section} onSaved={onSaved} />
            : target.kind === 'variant'
              ? <VariantForm key={formKey} modelId={target.modelId} variantId={target.id} onSaved={onSaved} />
              : <ModelForm key={formKey} modelId={target.id} onSaved={onSaved} />}
          </fieldset>
          {formState.dirty && <button className={`min-h-11 ${styles.textAction}`} disabled={busy} type="button" onClick={discardLocal}>{copy.discardLocal}</button>}
        </> : <p className={styles.hint}>{copy.intro}</p>}
      </section>
      <section id="editor-panel-changes" role="tabpanel" aria-labelledby="editor-tab-changes" hidden={tab !== 'changes'}>
        <h3 className={styles.targetHeading}>{copy.savedDrafts}</h3>
        <p className={styles.hint}>{copy.savedDraftsHint}</p>
        {(tab === 'changes' || changesVisited) && <PublishList reloadKey={saved} />}
      </section>
    </div>
    <footer className={styles.footer}>
      <p aria-live="polite" className={styles.saveStatus} data-dirty={formState.dirty}>{busy ? copy.busy : formState.dirty ? copy.dirty : copy.clean}</p>
      {guardMessage && <p role="alert" className={styles.guardMessage}>{guardMessage}</p>}
      <button type="button" disabled={busy} onClick={finish} className={`min-h-11 ${styles.finish}`}>{copy.finish}</button>
    </footer>
  </aside>;
}
