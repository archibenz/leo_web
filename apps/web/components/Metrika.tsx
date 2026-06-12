const YM_ID = process.env.NEXT_PUBLIC_YM_ID?.trim();

// Yandex.Metrika bootstrap. Renders nothing unless NEXT_PUBLIC_YM_ID is set.
// The inline snippet carries the per-request CSP nonce; tag.js itself is then
// allowed via 'strict-dynamic' (see middleware.ts buildCsp).
export default function Metrika({nonce}: {nonce?: string}) {
  if (!YM_ID || !/^\d+$/.test(YM_ID)) return null;

  const init =
    '(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};' +
    'm[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,' +
    'a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");' +
    `ym(${YM_ID},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});`;

  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{__html: init}} />
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${YM_ID}`}
            style={{position: 'absolute', left: '-9999px'}}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
