import Image from 'next/image';
import type {CSSProperties} from 'react';

interface IconProps {
  /** Number to render inside the filled icon. If provided and > 0, forces filled variant + shows number. */
  count?: number;
  /** Force filled variant without showing count (e.g. product-page favourite toggle). */
  filled?: boolean;
  /** Pixel size; the icon and the count overlay are square. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

interface SourcedIconProps extends IconProps {
  outlineSrc: string;
  filledSrc: string;
  /** Vertical pixel offset to optically center the count digit inside the icon's body. */
  countOffsetY?: number;
}

function SourcedIcon({
  outlineSrc,
  filledSrc,
  count = 0,
  filled = false,
  size = 18,
  className = '',
  style,
  countOffsetY = 0,
}: SourcedIconProps) {
  const showFilled = filled || count > 0;
  const showCount = count > 0;
  const fontSize = Math.max(8, Math.floor(size * 0.42));
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{width: size, height: size, ...style}}
    >
      <Image
        src={showFilled ? filledSrc : outlineSrc}
        alt=""
        width={size}
        height={size}
        className="h-full w-full"
        draggable={false}
        unoptimized
      />
      {showCount ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-semibold leading-none text-paper"
          style={{fontSize, paddingTop: countOffsetY}}
        >
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </span>
  );
}

export function BrandHeart(props: IconProps) {
  return (
    <SourcedIcon
      {...props}
      outlineSrc="/icons/heart.svg"
      filledSrc="/icons/heart-filled.svg"
      countOffsetY={1}
    />
  );
}

export function BrandCart(props: IconProps) {
  return (
    <SourcedIcon
      {...props}
      outlineSrc="/icons/cart.svg"
      filledSrc="/icons/cart-filled.svg"
      countOffsetY={2}
    />
  );
}
