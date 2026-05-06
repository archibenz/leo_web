import type {ReactNode} from 'react';

interface FooterSlideProps {
  zIndex: number;
  children: ReactNode;
}

// Restored to the original c53db4b sticky-stack pattern: inner div sticks at
// top:0 with z-index + box-shadow above the last slide, so the footer "lifts
// onto" the catalog the same way the product cards lift onto each other.
// With <Footer compact /> the editorial footer fits inside 100dvh on mobile,
// so overflow-y-auto stays inert and there's no nested scroll lag.
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
