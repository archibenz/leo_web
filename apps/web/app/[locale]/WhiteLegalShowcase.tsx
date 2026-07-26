import {MUTED, HAIR} from './wv-palette';

// Variant 2 "White" — shared legal-page surface (privacy, terms, offer). The
// same calm shape as the info pages: an editorial statement column and a
// hairline-ruled list of numbered sections. Replaces the retired gradient
// paper-card layout, whose dark cards and cream ink were unreadable on the
// white ground.

export type LegalSection = {heading: string; body: string};

export default function WhiteLegalShowcase({
  tag,
  title,
  lastUpdated,
  sections,
}: {
  tag: string;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-14 sm:px-10 sm:py-28">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="wv-rise">
          <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{tag}</p>
          <h1 className="font-display text-[clamp(36px,calc(2.8vw_+_24px),60px)] font-light leading-[1.02] tracking-[-0.01em]">{title}</h1>
          <p className="mt-8 text-[13px]" style={{color: MUTED}}>{lastUpdated}</p>
        </div>

        <div className="wv-rise wv-delay-1 border-t" style={{borderColor: HAIR}}>
          {sections.map((s) => (
            <section key={s.heading} className="border-b py-7" style={{borderColor: HAIR}}>
              <h2 className="text-[13px] uppercase tracking-[0.18em]">{s.heading}</h2>
              <p className="mt-3 text-[14px] leading-relaxed" style={{color: MUTED}}>{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
