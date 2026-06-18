'use client';

import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import {useTranslations} from 'next-intl';
import 'yet-another-react-lightbox/styles.css';

import type {ProductImage} from './ProductGallery';

interface ProductGalleryLightboxProps {
  open: boolean;
  onClose: () => void;
  images: ProductImage[];
  activeIndex: number;
  onIndexChange: (i: number) => void;
}

export default function ProductGalleryLightbox({
  open,
  onClose,
  images,
  activeIndex,
  onIndexChange,
}: ProductGalleryLightboxProps) {
  const hasMultiple = images.length > 1;
  const t = useTranslations('product.gallery');

  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={images.map((img) => ({src: img.src, alt: img.alt}))}
      index={activeIndex}
      labels={{
        Close: t('close'),
        Previous: t('previous'),
        Next: t('next'),
        'Zoom in': t('zoomIn'),
        'Zoom out': t('zoomOut'),
      }}
      on={{view: ({index: i}) => onIndexChange(i)}}
      plugins={[Zoom]}
      zoom={{
        maxZoomPixelRatio: 3,
        scrollToZoom: true,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        zoomInMultiplier: 1.6,
        wheelZoomDistanceFactor: 80,
        pinchZoomDistanceFactor: 80,
      }}
      animation={{
        fade: 500,
        swipe: 450,
        easing: {
          fade: 'cubic-bezier(0.22, 1, 0.36, 1)',
          swipe: 'cubic-bezier(0.22, 1, 0.36, 1)',
          navigation: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      }}
      carousel={{
        padding: '32px',
        spacing: '32px',
        imageFit: 'contain',
        finite: images.length < 2,
        preload: 2,
      }}
      controller={{
        closeOnBackdropClick: true,
        closeOnPullUp: true,
        closeOnPullDown: true,
      }}
      toolbar={{buttons: []}}
      styles={{
        container: {
          backgroundColor: 'rgba(30, 18, 13, 0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
        },
        toolbar: {display: 'none'},
        button: {color: '#f3e9da', filter: 'none'},
        icon: {color: '#f3e9da', filter: 'none'},
        navigationPrev: {color: '#f3e9da', filter: 'none'},
        navigationNext: {color: '#f3e9da', filter: 'none'},
        slide: {padding: 0},
      }}
      render={{
        iconClose: () => (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ),
        iconPrev: () => (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        ),
        iconNext: () => (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        ),
        slideHeader: () =>
          hasMultiple ? (
            <div className="pointer-events-none absolute left-0 right-0 top-0 flex gap-1.5 px-6 pt-6 sm:px-10 sm:pt-8">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
                    i === activeIndex ? 'bg-[#D4A574]' : 'bg-[#f3e9da]/20'
                  }`}
                />
              ))}
            </div>
          ) : null,
        slideFooter: () =>
          hasMultiple ? (
            <div className="pointer-events-none absolute bottom-8 left-0 right-0 flex items-center justify-center text-[11px] font-medium uppercase tracking-[0.32em] text-[#f3e9da]/75 sm:bottom-10 sm:text-xs">
              <span className="tabular-nums">
                {String(activeIndex + 1).padStart(2, '0')}
              </span>
              <span className="mx-3 text-[#D4A574]">—</span>
              <span className="tabular-nums">
                {String(images.length).padStart(2, '0')}
              </span>
            </div>
          ) : null,
      }}
    />
  );
}
