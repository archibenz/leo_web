'use client';

import {motion, useReducedMotion} from 'framer-motion';
import {useFavorites} from '../../../../contexts/FavoritesContext';

interface DiamondMarkProps {
  productId: string;
  productTitle: string;
  productImage?: string;
  locale: string;
}

const HEART_PATH =
  'M12 20.6 C 4.3 16.2, 1.8 11.4, 4.2 7.4 C 6.4 3.7, 9.6 4.0, 12 7.0 C 14.4 4.0, 17.6 3.7, 19.8 7.4 C 22.2 11.4, 19.7 16.2, 12 20.6 Z';

export default function DiamondMark({productId, productTitle, productImage, locale}: DiamondMarkProps) {
  const {isFavorite, toggleItem} = useFavorites();
  const reduceMotion = useReducedMotion();
  const active = isFavorite(productId);

  const isRu = locale === 'ru';
  const label = active
    ? (isRu ? 'Убрать из избранного' : 'Remove from favorites')
    : (isRu ? 'В избранное' : 'Add to favorites');

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={() => toggleItem({id: productId, title: productTitle, image: productImage})}
      className="grid h-11 w-11 place-items-center rounded-full bg-black/30 backdrop-blur-sm transition-colors duration-200 hover:bg-black/45 active:bg-black/55"
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="h-[22px] w-[22px]"
        whileTap={reduceMotion ? undefined : {scale: 0.78}}
        transition={{duration: 0.35, ease: [0.22, 1, 0.36, 1]}}
      >
        <motion.path
          d={HEART_PATH}
          initial={false}
          animate={{
            fill: active ? '#D4A574' : 'rgba(212,165,116,0)',
          }}
          transition={{duration: 0.3, ease: 'easeOut'}}
          stroke="#D4A574"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <motion.circle
          cx="12"
          cy="11"
          r="0.95"
          initial={false}
          animate={{
            fill: active ? '#1E120D' : '#D4A574',
            scale: active ? 1 : 0.85,
          }}
          transition={{duration: 0.3, ease: 'easeOut'}}
          style={{transformOrigin: '12px 11px'}}
        />
      </motion.svg>
    </button>
  );
}
