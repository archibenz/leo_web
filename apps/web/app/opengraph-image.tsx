import {ImageResponse} from 'next/og';

export const runtime = 'edge';
export const alt = 'REINASLEO — Премиальная женская одежда';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

// The shared share-card: a dark ground, the brand diamond, and the wordmark
// with a quiet line under it — the same identity the favicon and the analytics
// card carry, so every link off the site previews in one voice.
export default async function OGImage() {
  return new ImageResponse(
    (
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
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42.18 42.18" width="120" height="120">
          <path
            fill="#aa000d"
            d="M592.68,255.5v42.19h42.19V255.5Zm33.57,29.73a39.89,39.89,0,0,1,8.51,12.38,41.81,41.81,0,0,1-21-21h0l0,0,0,0a41.83,41.83,0,0,1-21,21,41.83,41.83,0,0,1,21-21,41.76,41.76,0,0,1-21-21,41.76,41.76,0,0,1,21,21h0a41.73,41.73,0,0,1,21-21,41.8,41.8,0,0,1-20.91,21A40,40,0,0,1,626.25,285.23Z"
            transform="translate(-592.68 -255.5)"
          />
        </svg>
        <div
          style={{
            marginTop: 44,
            fontSize: 76,
            fontWeight: 300,
            color: '#f3e9da',
            letterSpacing: '0.16em',
          }}
        >
          REINASLEO
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 26,
            color: '#a99a8c',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
          }}
        >
          Премиальная женская одежда
        </div>
      </div>
    ),
    {width: 1200, height: 630}
  );
}
