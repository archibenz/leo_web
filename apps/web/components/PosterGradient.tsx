type PosterGradientProps = {
  animated?: boolean;
};

export default function PosterGradient({animated = false}: PosterGradientProps) {
  return (
    <div className="absolute inset-0 poster-gradient" aria-hidden="true">
      {/* Richer multi-layer gradient to mimic the shader at rest */}
      <div
        className={`absolute inset-0 ${animated ? 'poster-gradient-animated' : ''}`}
        style={{
          background: `
            radial-gradient(circle at 18% 75%, rgba(170, 0, 13, 0.36) 0%, transparent var(--pg-spot-1-size, 45%)),
            radial-gradient(circle at 78% 18%, rgba(12, 8, 6, 0.55) 0%, transparent var(--pg-spot-2-size, 42%)),
            radial-gradient(ellipse at 60% 55%, rgba(43, 23, 17, 0.5) 0%, transparent var(--pg-spot-3-size, 52%)),
            linear-gradient(135deg, #2B1711 0%, #1B0E0A 38%, #212121 82%, #0c0908 100%)
          `
        }}
      />
      {/* Animated color layer - only when animated prop is true */}
      {animated && (
        <div
          className="absolute inset-0 poster-gradient-color-shift"
          style={{
            background: `
              radial-gradient(circle at 30% 60%, rgba(170, 0, 13, 0.25) 0%, transparent var(--pg-shift-1-size, 50%)),
              radial-gradient(circle at 70% 40%, rgba(43, 23, 17, 0.3) 0%, transparent var(--pg-shift-2-size, 45%))
            `,
            mixBlendMode: 'overlay'
          }}
        />
      )}
      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.10] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Cfilter id=%22n%22 x=%220%22 y=%220%22 width=%22100%25%22 height=%22100%25%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%2240%22 height=%2240%22 filter=%22url(%23n)%22 opacity=%220.34%22/%3E%3C/svg%3E')`
        }}
      />
    </div>
  );
}
