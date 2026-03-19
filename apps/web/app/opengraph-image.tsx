import {ImageResponse} from 'next/og';

export const runtime = 'edge';
export const alt = 'REINASLEO — Premium Womenswear';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

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
          background: 'linear-gradient(135deg, #1e120d 0%, #2b1711 50%, #1e120d 100%)',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 300,
            color: '#f3e9da',
            letterSpacing: '0.15em',
            marginBottom: 16,
          }}
        >
          REINASLEO
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#D4A574',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          Regal Confidence · Sculpted Femininity
        </div>
      </div>
    ),
    {width: 1200, height: 630}
  );
}
