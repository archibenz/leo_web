'use client';

import {type ReactNode} from 'react';

interface FooterSlideProps {
  zIndex: number;
  children: ReactNode;
}

// Footer renders inline below the last product slide WITHOUT a scroll-snap
// target — the swipe glides directly from the last slide into the footer
// content without bouncing on the brand-band edge. zIndex kept so the
// editorial footer stays above the dark page background during transition.
export default function FooterSlide({zIndex, children}: FooterSlideProps) {
  return (
    <section className="relative w-full bg-[#1a0f0a]" style={{zIndex}}>
      {children}
    </section>
  );
}
