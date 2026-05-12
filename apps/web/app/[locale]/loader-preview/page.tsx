import BrandLoader from '../../../components/BrandLoader';

export default function LoaderPreviewPage() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-16 bg-paper/85 backdrop-blur-md">
      <BrandLoader size={192} speed="slow" />

      <div className="flex items-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <BrandLoader size={96} speed="slow" />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-soft/60">96 · slow</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <BrandLoader size={48} speed="fast" />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-soft/60">48 · fast</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <BrandLoader size={32} speed="fast" />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-soft/60">32 · fast</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <BrandLoader size={20} speed="fast" />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-soft/60">20 · fast</span>
        </div>
      </div>

      <p className="text-xs uppercase tracking-[0.4em] text-ink-soft/40">brand loader · square ⇄ petals</p>
    </div>
  );
}
