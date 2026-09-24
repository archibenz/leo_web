'use client';

import {useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import BrandLoader from '../../BrandLoader';
import {apiFetch} from '../../../lib/api';
import {Panel, PanelEmpty} from './panel';
import {Stat, StatGrid} from './stat-grid';
import {SeriesChart} from './series-chart';
import {ShareList} from './share-list';

// Посещения витрины по site_events. Сутки режет сервер, по Москве
// (SiteStatsService), — соседние карточки регистраций и бота режут по UTC,
// поэтому регистраций здесь нарочно нет: два числа с одним именем и разными
// сутками рядом на одном экране читались бы как ошибка.
//
// Грузится отдельно от остального дашборда. Упавшая ручка посещений не должна
// уносить с собой заказы и склад, как унесла бы, стоя в общем Promise.all.

export type SiteDay = {
  date: string;
  pageViews: number;
  sessions: number;
  productViews: number;
  marketplaceClicks: number;
  addToCart: number;
  addToFavourite: number;
  signups: number;
  byDevice: Record<string, number>;
  byLocale: Record<string, number>;
  byMarketplace: Record<string, number>;
};

type SitePath = {path: string; views: number};

type Totals = Omit<SiteDay, 'date' | 'byLocale'>;

const DAYS = 30;
const DEVICE_KEYS: Record<string, string> = {phone: 'devicePhone', desktop: 'deviceDesktop'};
const MARKETPLACE_NAMES: Record<string, string> = {wildberries: 'WB', ozon: 'Ozon'};

function mergeCounts(into: Record<string, number>, from: Record<string, number>): Record<string, number> {
  const out = {...into};
  for (const [key, value] of Object.entries(from)) out[key] = (out[key] ?? 0) + value;
  return out;
}

function sumDays(days: SiteDay[]): Totals {
  return days.reduce<Totals>(
    (acc, d) => ({
      pageViews: acc.pageViews + d.pageViews,
      sessions: acc.sessions + d.sessions,
      productViews: acc.productViews + d.productViews,
      marketplaceClicks: acc.marketplaceClicks + d.marketplaceClicks,
      addToCart: acc.addToCart + d.addToCart,
      addToFavourite: acc.addToFavourite + d.addToFavourite,
      signups: acc.signups + d.signups,
      byDevice: mergeCounts(acc.byDevice, d.byDevice),
      byMarketplace: mergeCounts(acc.byMarketplace, d.byMarketplace),
    }),
    {
      pageViews: 0,
      sessions: 0,
      productViews: 0,
      marketplaceClicks: 0,
      addToCart: 0,
      addToFavourite: 0,
      signups: 0,
      byDevice: {},
      byMarketplace: {},
    },
  );
}

export function SiteVisits() {
  const t = useTranslations('admin');
  const [days, setDays] = useState<SiteDay[] | null>(null);
  const [paths, setPaths] = useState<SitePath[] | null>(null);
  const [daysFailed, setDaysFailed] = useState(false);
  const [pathsFailed, setPathsFailed] = useState(false);

  useEffect(() => {
    apiFetch<SiteDay[]>(`/api/admin/stats/site-daily?days=${DAYS}`)
      .then(setDays)
      .catch(() => setDaysFailed(true));
    apiFetch<SitePath[]>(`/api/admin/stats/site-paths?days=${DAYS}&limit=10`)
      .then(setPaths)
      .catch(() => setPathsFailed(true));
  }, []);

  const totals = useMemo(() => (days ? sumDays(days) : null), [days]);

  const title = t('dashboardPage.visitsTitle');

  if (daysFailed) {
    return (
      <Panel title={title}>
        <PanelEmpty>{t('dashboardPage.visitsLoadFailed')}</PanelEmpty>
      </Panel>
    );
  }

  if (!days || !totals) {
    return (
      <Panel title={title}>
        <div className="flex items-center justify-center py-10">
          <BrandLoader size={24} />
        </div>
      </Panel>
    );
  }

  if (totals.pageViews === 0) {
    return (
      <Panel title={title}>
        <PanelEmpty>{t('dashboardPage.noVisits')}</PanelEmpty>
      </Panel>
    );
  }

  const marketplaceSplit = Object.entries(totals.byMarketplace)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `${MARKETPLACE_NAMES[name] ?? name} ${count}`)
    .join(' · ');

  const devices = Object.entries(totals.byDevice)
    .sort(([, a], [, b]) => b - a)
    .map(([key, count]) => ({
      id: key,
      title: DEVICE_KEYS[key] ? t(`dashboardPage.${DEVICE_KEYS[key]}`) : key,
      count,
    }));

  return (
    <div className="*:mb-6 last:*:mb-0">
      <Panel title={title}>
        <div className="space-y-6">
          <StatGrid>
            <Stat label={t('dashboardPage.visitsPageViews')} value={totals.pageViews.toString()} />
            {/* До согласия на cookie ключ сессии не ставится (решение владельца,
                lib/siteEvents.ts), и такие посещения в сессии не попадают. Оговорка
                стоит у самого числа, а не в справке: иначе оно читается как «все». */}
            <Stat
              delta={t('dashboardPage.visitsSessionsNote')}
              label={t('dashboardPage.visitsSessions')}
              value={totals.sessions.toString()}
            />
            <Stat label={t('dashboardPage.visitsProductViews')} value={totals.productViews.toString()} />
            <Stat
              delta={marketplaceSplit || undefined}
              label={t('dashboardPage.visitsMarketplaceClicks')}
              value={totals.marketplaceClicks.toString()}
            />
            <Stat label={t('dashboardPage.visitsAddToCart')} value={totals.addToCart.toString()} />
            <Stat label={t('dashboardPage.visitsAddToFavourite')} value={totals.addToFavourite.toString()} />
          </StatGrid>

          <SeriesChart
            data={days.map((d) => ({date: d.date, count: d.pageViews}))}
            label={t('dashboardPage.visitsPageViews')}
            totalLabel={t('dashboardPage.totalForPeriod')}
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title={t('dashboardPage.visitsByDevice')}>
          <ShareList emptyText={t('dashboardPage.noPeriodData')} items={devices} />
        </Panel>
        <Panel title={t('dashboardPage.visitsTopPages')}>
          {pathsFailed ? (
            <PanelEmpty>{t('dashboardPage.visitsLoadFailed')}</PanelEmpty>
          ) : paths ? (
            <ShareList
              emptyText={t('dashboardPage.noPeriodData')}
              items={paths.map((p) => ({id: p.path, title: p.path, count: p.views}))}
            />
          ) : (
            <BrandLoader size={20} />
          )}
        </Panel>
      </div>
    </div>
  );
}
