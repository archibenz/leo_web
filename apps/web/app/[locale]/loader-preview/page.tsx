import BrandLoader from '../../../components/BrandLoader';

export default function LoaderPreviewPage() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-16 bg-paper/85 backdrop-blur-md">
      <BrandLoader size={192} />

      <div className="flex items-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <BrandLoader size={96} />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-soft/60">96 · splash</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <BrandLoader size={48} />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-soft/60">48 · lg</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <BrandLoader size={32} />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-soft/60">32 · md</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <BrandLoader size={20} />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-soft/60">20 · sm</span>
        </div>
      </div>

      <p className="text-xs uppercase tracking-[0.4em] text-ink-soft/40">brand loader · single tempo 1.8s</p>
    </div>
  );
}
