'use client';

import {type ReactNode} from 'react';

interface FooterSlideProps {
  zIndex: number;
  children: ReactNode;
}

// Footer behaves exactly like a product card: 100dvh snap target with
// scroll-snap-stop: 'always' so a swipe from the last product slide lands
// firmly on the footer, just like swiping between two slides.
export default function FooterSlide({zIndex, children}: FooterSlideProps) {
  return (
    <section
      className="relative w-full bg-[#1a0f0a]"
      style={{
        zIndex,
        minHeight: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      {children}
    </section>
  );
}
