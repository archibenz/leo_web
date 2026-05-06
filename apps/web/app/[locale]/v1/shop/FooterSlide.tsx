'use client';

import type {ReactNode} from 'react';

interface FooterSlideProps {
  zIndex: number;
  children: ReactNode;
}

export default function FooterSlide({zIndex, children}: FooterSlideProps) {
  return (
    <section
      className="relative w-full"
      style={{
        minHeight: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <div
        className="sticky top-0 flex min-h-[100dvh] w-full flex-col overflow-y-auto bg-[#1a0f0a]"
        style={{
          zIndex,
          boxShadow: '0 -18px 36px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div className="flex flex-1 flex-col justify-end">{children}</div>
      </div>
    </section>
  );
}
