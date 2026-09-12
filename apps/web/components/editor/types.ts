import type {StorefrontSection, WhiteColor, WhiteProduct} from '../../lib/catalogue/types';

// Что сейчас правится. Панель одна, форм две: у блока витрины тексты и медиа,
// у цветового варианта — цена, скидка, наличие и галерея.
//
// Вариант несёт `modelId`: черновик варианта живёт ВНУТРИ черновика своей
// модели, публикуется вместе с карточкой одной кнопкой, и отменяется тоже
// вместе с ней.
export type EditorTarget =
  | {kind: 'section'; id: string; label: string; section: StorefrontSection}
  | {kind: 'variant'; id: string; label: string; modelId: string; product: WhiteProduct; colour: WhiteColor};

// Чему принадлежит строка в списке черновиков и в маркерах — те же три вида,
// что знает бэкенд.
export type DraftKind = 'section' | 'model' | 'set';
