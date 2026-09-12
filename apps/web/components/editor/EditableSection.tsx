'use client';

import type {ReactNode} from 'react';
import type {StorefrontSection} from '../../lib/catalogue/types';
import EditableBlock from './EditableBlock';

// Блок главной как точка правки. Блока может не быть вовсе (пустая таблица
// секций оставляет работающую страницу на встроенных текстах) — тогда править
// нечего, и обёртка исчезает.
export default function EditableSection({section, label, children}: {
  section?: StorefrontSection;
  label: string;
  children: ReactNode;
}) {
  if (!section) return <>{children}</>;
  return (
    <EditableBlock
      target={{kind: 'section', id: section.id, label, section}}
      owner={{kind: 'section', id: section.id}}
    >
      {children}
    </EditableBlock>
  );
}
