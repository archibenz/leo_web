'use client';

import {useEffect, useRef} from 'react';
import {safeJsonLd} from '../../lib/jsonLd';

export default function WhiteHeroVideo({source, desktopSource, nonce}: {
  source: string;
  desktopSource: string;
  nonce?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const selected = window.matchMedia('(min-width: 1024px)').matches ? desktopSource : source;
    let visible = false;
    let disposed = false;
    let revealing = false;
    let revealed = false;
    let pendingPlay = false;
    let resumeRequested = false;

    const prepare = () => {
      if (motion.matches) return;
      video.preload = 'auto';
      // Keep the parser's request; assigning the same source reloads it.
      if (video.getAttribute('src') !== selected) {
        video.src = selected;
        video.load();
      }
    };
    const canPlay = () => !disposed && visible && !motion.matches && !revealing && document.visibilityState === 'visible';
    const updatePlayback = () => {
      if (!canPlay()) {
        video.pause();
        return;
      }
      // IntersectionObserver reports geometry, including during an opacity fade.
      if (!revealed) {
        const page = video.closest('.page-enter');
        const animations = page?.getAnimations?.().filter((animation) =>
          'animationName' in animation && animation.animationName === 'pageEnter' && animation.playState !== 'finished',
        ) ?? [];
        if (animations.length) {
          revealing = true;
          void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
            revealing = false;
            revealed = true;
            updatePlayback();
          });
          return;
        }
        revealed = true;
      }
      prepare();
      if (video.paused) {
        if (pendingPlay) {
          resumeRequested = true;
          return;
        }
        resumeRequested = false;
        const playback = video.play();
        pendingPlay = !!playback;
        void playback?.then(() => {
          pendingPlay = false;
          if (!canPlay()) video.pause();
        }).catch((error) => {
          pendingPlay = false;
          // A pause may reject after the next visibility event requested play.
          if (error?.name === 'AbortError' && resumeRequested && canPlay()) updatePlayback();
        });
      }
    };
    prepare();
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.15);
      updatePlayback();
    }, {threshold: [0, 0.15]});
    observer.observe(video);
    document.addEventListener('visibilitychange', updatePlayback);
    motion.addEventListener('change', updatePlayback);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', updatePlayback);
      motion.removeEventListener('change', updatePlayback);
      video.pause();
    };
  }, [source, desktopSource]);

  return <>
    <video
      id="wv-hero-video"
      ref={ref}
      // The nonce script prepares src/preload before hydration.
      suppressHydrationWarning
      muted
      loop
      playsInline
      preload="none"
      className="absolute inset-0 h-full w-full object-cover object-[50%_22%]"
    />
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{__html:
        '(function(){var a=' + safeJsonLd([source, desktopSource]) +
        ',v=document.getElementById("wv-hero-video");' +
        'if(!v||!window.matchMedia)return;' +
        'if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;' +
        'v.src=matchMedia("(min-width: 1024px)").matches?a[1]:a[0];' +
        'v.preload="auto";v.load();})();',
      }}
    />
  </>;
}
