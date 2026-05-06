'use client';

import {type ReactNode} from 'react';

interface FooterSlideProps {
  zIndex: number;
  children: ReactNode;
}

// Footer renders inline below the last product slide. Same scroll-snap target
// as the slides, but with snap-stop 'normal' so the swipe glides through into
// the footer without bouncing on it.
export default function FooterSlide({zIndex, children}: FooterSlideProps) {
  return (
    <section
      className="relative w-full bg-[#1a0f0a]"
      style={{
        zIndex,
        scrollSnapAlign: 'start',
        scrollSnapStop: 'normal',
      }}
    >
      {children}
    </section>
  );
}
