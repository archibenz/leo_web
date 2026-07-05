import Image from 'next/image';

// The error code set large, its zero replaced by the brand diamond — the same
// stone that lives in the wordmark's O, turning slowly. One quiet flourish.

export default function WhiteErrorFigure({left, right}: {left: string; right: string}) {
  return (
    <span aria-hidden="true" className="flex items-center justify-center gap-3 sm:gap-4">
      <span className="font-display text-[clamp(88px,20vw,150px)] font-light leading-none tracking-[-0.02em]">{left}</span>
      <Image
        src="/logos/logo-square.svg"
        alt=""
        width={42}
        height={42}
        className="wv-gem h-[clamp(44px,9vw,74px)] w-auto"
      />
      <span className="font-display text-[clamp(88px,20vw,150px)] font-light leading-none tracking-[-0.02em]">{right}</span>
    </span>
  );
}
