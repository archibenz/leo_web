import type {MobileBadge} from './types';

interface CollectionBadgeProps {
  variant: MobileBadge;
  locale: string;
}

const LABELS: Record<MobileBadge, {ru: string; en: string}> = {
  new: {ru: 'Новое', en: 'New'},
  popular: {ru: 'Популярное', en: 'Popular'},
};

export default function CollectionBadge({variant, locale}: CollectionBadgeProps) {
  const labels = LABELS[variant];
  const text = locale === 'ru' ? labels.ru : labels.en;

  return (
    <span className="inline-flex w-fit items-center rounded-full border border-[var(--accent)]/65 bg-black/15 px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] backdrop-blur-sm">
      {text}
    </span>
  );
}
