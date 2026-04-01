'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import BlurReveal from './BlurReveal';
import {CareSymbolsRow} from './CareSymbols';

interface CareGuide {
  id: string;
  title: string;
  description: string | null;
  tips: string | null;
  image: string | null;
  careSymbols: string;
  sortOrder: number;
  active: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function CarePageClient({initialGuides}: {initialGuides?: unknown[]}) {
  const t = useTranslations('care');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';

  const [guides, setGuides] = useState<CareGuide[]>((initialGuides as CareGuide[]) ?? []);
  const [loading, setLoading] = useState(!initialGuides?.length);

  useEffect(() => {
    fetch(`${API_BASE}/api/care-guides`)
      .then(res => res.json())
      .then((data: CareGuide[]) => {
        setGuides(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const parseSymbols = (raw: string): string[] => {
    try { return JSON.parse(raw); } catch { return []; }
  };

  return (
    <main className="min-h-screen pt-28 pb-20">
      {/* Hero */}
      <BlurReveal>
        <section className="max-w-4xl mx-auto px-6 text-center mb-16">
          <p className="font-accent text-[13px] uppercase tracking-[0.25em] text-[#D4A574]/60 mb-4">
            {t('subtitle')}
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink mb-6">
            {t('title')}
          </h1>
          <p className="text-ink/50 text-[16px] leading-relaxed max-w-2xl mx-auto">
            {t('intro')}
          </p>
        </section>
      </BlurReveal>

      {/* Guides grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin" />
        </div>
      ) : guides.length === 0 ? (
        <BlurReveal>
          <p className="text-center text-ink/40 py-20">{t('empty')}</p>
        </BlurReveal>
      ) : (
        <section className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {guides.map((guide, i) => (
              <BlurReveal key={guide.id} delay={i * 80}>
                <article className="group relative rounded-2xl border border-[#D4A574]/[0.08] bg-gradient-to-b from-[#1a100c]/40 to-transparent p-8 transition-all duration-500 hover:border-[#D4A574]/20 hover:shadow-[0_8px_40px_rgba(212,165,116,0.06)]">
                  {guide.image && (
                    <div className="mb-6 aspect-[16/9] rounded-xl overflow-hidden">
                      <img
                        src={guide.image}
                        alt={guide.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}

                  <h2 className="font-display text-2xl tracking-tight text-ink mb-3">
                    {guide.title}
                  </h2>

                  {guide.description && (
                    <p className="text-ink/50 text-[15px] leading-relaxed mb-5">
                      {guide.description}
                    </p>
                  )}

                  {/* Care symbols */}
                  {parseSymbols(guide.careSymbols).length > 0 && (
                    <div className="mb-5 py-4 border-t border-b border-[#D4A574]/[0.06]">
                      <CareSymbolsRow
                        symbols={parseSymbols(guide.careSymbols)}
                        locale={locale}
                        size={28}
                        showLabels
                      />
                    </div>
                  )}

                  {guide.tips && (
                    <div className="mt-4">
                      <p className="text-[12px] uppercase tracking-[0.15em] text-[#D4A574]/50 mb-2 font-medium">
                        {t('tips')}
                      </p>
                      <p className="text-ink/40 text-[14px] leading-relaxed whitespace-pre-line">
                        {guide.tips}
                      </p>
                    </div>
                  )}
                </article>
              </BlurReveal>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 text-center mt-20">
        <div className="h-px bg-gradient-to-r from-transparent via-[#D4A574]/15 to-transparent mb-12" />
        <p className="text-ink/40 text-[15px] mb-6">{t('cta')}</p>
        <Link
          href={`/${locale}/shop`}
          className="inline-flex items-center gap-2 font-display text-[15px] uppercase tracking-[0.12em] text-[#D4A574] transition-colors hover:text-[#D4A574]/80"
        >
          {t('shopLink')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
        </Link>
      </section>
    </main>
  );
}
