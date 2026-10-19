'use client';

import {useTranslations} from 'next-intl';
import {usePageLoading} from './PageLoadingProvider';
import './page-skeleton.css';

export type PageSkeletonKind = 'home' | 'catalog' | 'product' | 'account' | 'bag' | 'favorites' | 'editorial' | 'info' | 'admin-dashboard' | 'admin-table' | 'admin-form';

type Props = {kind: PageSkeletonKind; embedded?: boolean; className?: string};

export function getPageSkeletonKind(pathname: string): PageSkeletonKind {
  const segments = pathname.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  if (segments[0] === 'ru' || segments[0] === 'en') segments.shift();
  const [page, section, item] = segments;
  if (!page) return 'home';
  if (page === 'admin') {
    if (!section) return 'admin-dashboard';
    return !item && ['products', 'inventory', 'care', 'socials'].includes(section) ? 'admin-table' : 'admin-form';
  }
  switch (page) {
    case 'shop': return 'catalog';
    case 'product': return 'product';
    case 'account':
    case 'auth': return 'account';
    case 'bag': return 'bag';
    case 'favourites': return 'favorites';
    case 'sets':
    case 'lookbook': return 'editorial';
    default: return 'info';
  }
}

function Block({className = ''}: {className?: string}) {
  return <div className={`page-skeleton__block ${className}`} />;
}

function Copy({lines = 3}: {lines?: number}) {
  return <div className="page-skeleton__copy">{Array.from({length: lines}, (_, i) => <Block key={i} className="page-skeleton__line" />)}</div>;
}

function Heading({eyebrow = true}: {eyebrow?: boolean}) {
  return <div className="page-skeleton__heading">{eyebrow && <Block className="page-skeleton__eyebrow" />}<Block className="page-skeleton__title" /></div>;
}

function ProductGrid({home = false}: {home?: boolean}) {
  return (
    <div className={`page-skeleton__grid${home ? ' page-skeleton__grid--home' : ''}`}>
      {Array.from({length: 6}, (_, i) => (
        <div key={i} className="page-skeleton__product-card">
          <Block className="page-skeleton__portrait" />
          <Block className="page-skeleton__line" />
          <Block className="page-skeleton__eyebrow" />
        </div>
      ))}
    </div>
  );
}

function AccountFields({embedded = false}: {embedded?: boolean}) {
  return <div className="page-skeleton__account-fields"><Heading eyebrow={!embedded} /><Copy lines={2} /><Block className="page-skeleton__tabs" /><Block className="page-skeleton__field" /><Block className="page-skeleton__field" /><Block className="page-skeleton__button" /></div>;
}

function Content({kind, embedded}: Props) {
  if (kind === 'home') return (
    <>
      <div className="page-skeleton__hero"><div><Block className="page-skeleton__eyebrow" /><Block className="page-skeleton__hero-title" /><Block className="page-skeleton__button" /></div></div>
      <div className="page-skeleton__container page-skeleton__home-products"><Heading /><ProductGrid home /></div>
    </>
  );
  if (kind === 'catalog' || kind === 'favorites') return (
    <>
      {!embedded && <Heading eyebrow={false} />}
      {kind === 'catalog' && !embedded && <><Block className="page-skeleton__search" /><div className="page-skeleton__filters">{Array.from({length: 5}, (_, i) => <Block key={i} className="page-skeleton__filter" />)}</div></>}
      <ProductGrid />
    </>
  );
  if (kind === 'product') return (
    <>
      <Block className="page-skeleton__breadcrumb" />
      <div className="page-skeleton__product-layout">
        <div className="page-skeleton__gallery"><Block className="page-skeleton__product-image" /></div>
        <div className="page-skeleton__product-details">
          <Heading /><Block className="page-skeleton__price" /><Copy /><Block className="page-skeleton__eyebrow" />
          <div className="page-skeleton__swatches">{Array.from({length: 3}, (_, i) => <Block key={i} />)}</div>
          <Block className="page-skeleton__eyebrow" /><div className="page-skeleton__sizes">{Array.from({length: 4}, (_, i) => <Block key={i} />)}</div>
          <Block className="page-skeleton__button" /><Copy lines={4} />
        </div>
      </div>
    </>
  );
  if (kind === 'account') return embedded ? <AccountFields embedded /> : (
    <div className="page-skeleton__account-layout"><Block className="page-skeleton__account-art" /><div className="page-skeleton__account-panel"><AccountFields /></div></div>
  );
  if (kind === 'bag') return (
    <div className="page-skeleton__bag">
      {!embedded && <Heading eyebrow={false} />}
      <div className="page-skeleton__bag-rows">{Array.from({length: 2}, (_, i) => (
        <div className="page-skeleton__bag-row" key={i}><Block className="page-skeleton__bag-image" /><div><Copy lines={2} /><Block className="page-skeleton__price" /></div><Block className="page-skeleton__bag-price" /></div>
      ))}</div>
      <div className="page-skeleton__bag-total"><Block className="page-skeleton__eyebrow" /><Block className="page-skeleton__price" /></div><Block className="page-skeleton__button" />
    </div>
  );
  if (kind === 'editorial') return (
    <><Heading /><Copy lines={2} /><div className="page-skeleton__editorial-layout"><Block className="page-skeleton__portrait" /><div><Heading /><Copy lines={4} /><Block className="page-skeleton__button" /></div></div></>
  );
  if (kind === 'info') return (
    <div className="page-skeleton__info-layout"><div><Heading /><Copy lines={3} /></div><div>{Array.from({length: 3}, (_, i) => <div key={i} className="page-skeleton__info-section"><Block className="page-skeleton__eyebrow" /><Copy lines={4} /></div>)}</div></div>
  );
  if (kind === 'admin-dashboard') return (
    <>
      {!embedded && <Heading eyebrow={false} />}
      <div className="page-skeleton__stats">{Array.from({length: 4}, (_, i) => <div key={i} className="page-skeleton__card"><Block className="page-skeleton__eyebrow" /><Block className="page-skeleton__title" /><Block className="page-skeleton__line" /></div>)}</div>
      <div className="page-skeleton__charts"><Block /><Block /></div>
      <TableRows />
    </>
  );
  if (kind === 'admin-table') return <>{!embedded && <><Heading eyebrow={false} /><div className="page-skeleton__table-tools"><Block className="page-skeleton__search" /><Block className="page-skeleton__button" /></div></>}<TableRows /></>;
  return (
    <>{!embedded && <Heading eyebrow={false} />}<div className="page-skeleton__form">{Array.from({length: 4}, (_, i) => <div key={i}><Block className="page-skeleton__eyebrow" /><Block className="page-skeleton__field" /></div>)}<Block className="page-skeleton__textarea" /><Block className="page-skeleton__button" /></div></>
  );
}

function TableRows() {
  return <div className="page-skeleton__table">{Array.from({length: 6}, (_, i) => <div key={i} className="page-skeleton__table-row"><Block className="page-skeleton__table-thumbnail" /><Block className="page-skeleton__line" /><Block className="page-skeleton__line" /><Block className="page-skeleton__line" /></div>)}</div>;
}

export function PageSkeleton({kind, embedded = false, className = ''}: Props) {
  const t = useTranslations('common');
  const admin = kind.startsWith('admin-');
  return (
    <div
      className={`page-skeleton page-skeleton--${kind}${embedded ? ' page-skeleton--embedded' : ''} ${className}`}
      data-page-skeleton={kind}
      data-shop-loading={!embedded && !admin ? '' : undefined}
      role="status"
      aria-label={t('loading')}
    >
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden="true" data-skeleton-content=""><Content kind={kind} embedded={embedded} /></div>
    </div>
  );
}

export function PageLoadingFallback(props: Props) {
  usePageLoading(true);
  return <PageSkeleton {...props} />;
}
