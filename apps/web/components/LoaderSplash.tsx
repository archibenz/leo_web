import BrandLoader from './BrandLoader';

type LoaderSplashProps = {
  size?: number;
};

export default function LoaderSplash({size = 128}: LoaderSplashProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center bg-paper"
      style={{height: '100dvh', minHeight: '100dvh'}}
    >
      {/* Ambient radial glow — warm red echo from loader + golden ambience */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(170, 0, 13, 0.10) 0%, transparent 45%), ' +
            'radial-gradient(ellipse at center, rgba(212, 165, 116, 0.06) 15%, transparent 65%)',
        }}
      />

      {/* Vignette — gentle darkening at edges for focus */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(8, 4, 2, 0.45) 100%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-12">
        <BrandLoader size={size} />

        <div className="flex flex-col items-center gap-3">
          <span aria-hidden className="block h-px w-16 bg-accent/40" />
          <span className="font-display uppercase text-sm tracking-[0.55em] text-ink/70">
            REINASLEO
          </span>
        </div>
      </div>
    </div>
  );
}
