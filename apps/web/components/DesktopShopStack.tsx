'use client';

import DesktopStackedSheet, {type StackedSheetItem} from './DesktopStackedSheet';

interface DesktopShopStackProps {
  items: StackedSheetItem[];
  total: number;
  locale: string;
}

export default function DesktopShopStack({
  items,
  total,
  locale,
}: DesktopShopStackProps) {
  if (items.length === 0) return null;

  return (
    <div className="relative mb-16 w-full" aria-label="Featured pieces">
      {items.map((item, i) => (
        <DesktopStackedSheet
          key={item.id}
          item={item}
          index={i}
          total={total}
          locale={locale}
          isFirst={i === 0}
        />
      ))}
    </div>
  );
}
