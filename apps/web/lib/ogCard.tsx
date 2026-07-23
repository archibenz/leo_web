import type {ReactElement} from 'react';

// One 1200x630 share-card, rendered by both the root /opengraph-image and the
// per-locale /[locale]/opengraph-image so the favicon, app icon and link card
// all carry the same dark brand identity. Only the tagline changes with locale.
export const OG_SIZE = {width: 1200, height: 630} as const;
export const OG_CONTENT_TYPE = 'image/png';

const TAGLINE: Record<string, string> = {
  en: 'Premium womenswear',
  ru: 'Премиальная женская одежда',
};

export function ogTagline(locale: string): string {
  return TAGLINE[locale] ?? TAGLINE.en;
}

export function ogAlt(locale: string): string {
  return `REINASLEO — ${ogTagline(locale)}`;
}

// The 4-point diamond mark, inlined as the same <path> the icon routes use.
const DIAMOND =
  'M592.68,255.5v42.19h42.19V255.5Zm33.57,29.73a39.89,39.89,0,0,1,8.51,12.38,41.81,41.81,0,0,1-21-21h0l0,0,0,0a41.83,41.83,0,0,1-21,21,41.83,41.83,0,0,1,21-21,41.76,41.76,0,0,1-21-21,41.76,41.76,0,0,1,21,21h0a41.73,41.73,0,0,1,21-21,41.8,41.8,0,0,1-20.91,21A40,40,0,0,1,626.25,285.23Z';

// Satori (ImageResponse) requires an explicit display on any element with more
// than one child, so every container below sets display: flex.
export function renderOgCard(locale: string): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#110a07',
        fontFamily: 'serif',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          right: 40,
          bottom: 40,
          border: '1px solid rgba(243,233,218,0.16)',
          display: 'flex',
        }}
      />
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42.18 42.18" width="116" height="116">
          <path fill="#aa000d" d={DIAMOND} transform="translate(-592.68 -255.5)" />
        </svg>
        <div
          style={{
            marginTop: 46,
            fontSize: 78,
            fontWeight: 300,
            color: '#f3e9da',
            letterSpacing: '0.18em',
            display: 'flex',
          }}
        >
          REINASLEO
        </div>
        <div style={{marginTop: 30, width: 70, height: 1, background: 'rgba(243,233,218,0.32)', display: 'flex'}} />
        <div
          style={{
            marginTop: 26,
            fontSize: 25,
            color: '#a99a8c',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          {ogTagline(locale)}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 70,
          fontSize: 17,
          color: '#6f645a',
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          display: 'flex',
        }}
      >
        reinasleo.com
      </div>
    </div>
  );
}
