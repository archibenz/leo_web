'use client';

import {useEffect, type RefObject} from 'react';

export function useVisibleVideo(ref: RefObject<HTMLVideoElement | null>, source: string, poster: string) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let near = false;
    let visible = false;
    let prepared = false;
    let disposed = false;

    const showPoster = () => {
      if (video.getAttribute('poster') !== poster) video.setAttribute('poster', poster);
    };
    const prepare = () => {
      showPoster();
      if (prepared || motion.matches) return;
      prepared = true;
      video.preload = 'auto';
      video.load();
    };
    const canPlay = () => !disposed && visible && !motion.matches && document.visibilityState === 'visible';
    const updatePlayback = () => {
      if (!canPlay()) {
        video.pause();
        return;
      }
      prepare();
      if (video.paused) {
        void video.play()?.then(() => {
          // A pending play can finish after a scroll, tab switch or unmount.
          if (!canPlay()) video.pause();
        }).catch(() => {});
      }
    };
    const updateMotion = () => {
      if (motion.matches) showPoster();
      if (near) prepare();
      updatePlayback();
    };

    if (motion.matches) showPoster();
    // Without a visibility signal the still image is the safe fallback.
    if (typeof IntersectionObserver === 'undefined') {
      showPoster();
      return;
    }
    const preloadObserver = new IntersectionObserver((entries) => {
      near = entries.some((entry) => entry.isIntersecting);
      if (near) prepare();
    }, {rootMargin: '50% 0px'});
    const playbackObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.15);
      updatePlayback();
    }, {threshold: [0, 0.15]});

    preloadObserver.observe(video);
    playbackObserver.observe(video);
    document.addEventListener('visibilitychange', updatePlayback);
    motion.addEventListener('change', updateMotion);
    return () => {
      disposed = true;
      preloadObserver.disconnect();
      playbackObserver.disconnect();
      document.removeEventListener('visibilitychange', updatePlayback);
      motion.removeEventListener('change', updateMotion);
      video.pause();
    };
  }, [ref, source, poster]);
}
