"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";

interface SlideData {
  title: string;
  button: string;
  src: string;
  href?: string;
}

interface CarouselProps {
  slides: SlideData[];
}

export function Carousel({ slides }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const len = slides.length;

  // Refs for use inside event handlers (avoid stale closures without re-binding listeners)
  const currentRef = useRef(current);
  const slidesRef = useRef(slides);
  useEffect(() => {
    currentRef.current = current;
    slidesRef.current = slides;
  }, [current, slides]);

  const goTo = useCallback(
    (dir: -1 | 1) => {
      setCurrent((prev) => (prev + dir + len) % len);
    },
    [len],
  );

  // Prefetch active slide's product page for instant navigation
  useEffect(() => {
    const active = slides[current];
    if (active?.href) router.prefetch(active.href);
  }, [current, slides, router]);

  // Handle slide interaction: inactive → preview, active → navigate
  const handleSlideClick = useCallback(
    (index: number, isActive: boolean, href?: string) => {
      if (!isActive) {
        setCurrent(index);
        return;
      }
      if (href) router.push(href);
    },
    [router],
  );

  // Wrap-aware offset
  const getOffset = (index: number) => {
    let diff = index - current;
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    return diff;
  };

  // ── Input handlers ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Trackpad / wheel
    let wheelLocked = false;
    let wheelGesture = false; // true while a horizontal gesture is active
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (e: WheelEvent) => {
      // Once a horizontal gesture starts, block ALL wheel events (including diagonal)
      // until the gesture fully stops — prevents vertical scroll bleed
      if (wheelGesture) {
        e.preventDefault();
      }

      const isHorizontal = Math.abs(e.deltaX) >= Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1;
      if (isHorizontal) {
        e.preventDefault();
        wheelGesture = true;
      }

      // Reset idle timer — gesture ends after 300ms of silence
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelLocked = false;
        wheelGesture = false;
      }, 150);

      if (!isHorizontal || Math.abs(e.deltaX) < 4) return;

      if (wheelLocked) return;
      wheelLocked = true;
      goTo(e.deltaX > 0 ? 1 : -1);
    };

    // Touch swipe
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDeltaX = 0;
    let touchDir: "h" | "v" | null = null;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchDeltaX = 0;
      touchDir = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (!touchDir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        touchDir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (touchDir === "h") {
        e.preventDefault();
        touchDeltaX = dx;
      }
    };
    const onTouchEnd = () => {
      if (touchDeltaX > 40) goTo(-1);
      else if (touchDeltaX < -40) goTo(1);
      touchDeltaX = 0;
      touchDir = null;
    };

    // Mouse drag
    let dragStartX = 0;
    let dragDelta = 0;
    let dragging = false;

    const onMouseDown = (e: MouseEvent) => {
      dragStartX = e.clientX;
      dragDelta = 0;
      dragging = true;
      el.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      dragDelta = e.clientX - dragStartX;
    };
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "";
      if (dragDelta > 40) goTo(-1);
      else if (dragDelta < -40) goTo(1);
      dragDelta = 0;
    };

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(-1);
      if (e.key === "ArrowRight") goTo(1);
      if (e.key === "Enter" || e.key === " ") {
        const active = slidesRef.current[currentRef.current];
        if (active?.href) {
          e.preventDefault();
          router.push(active.href);
        }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    el.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseUp);
      el.removeEventListener("keydown", onKeyDown);
    };
  }, [goTo]);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      tabIndex={0}
      style={{ cursor: "grab", overflowX: "clip", overflowY: "visible" }}
    >
      {/* Slides track */}
      <div className="flex items-center justify-center" style={{ minHeight: "clamp(340px, 50vw, 540px)" }}>
        {slides.map((slide, index) => {
          const offset = getOffset(index);
          const isActive = offset === 0;
          const isVisible = Math.abs(offset) <= 2;

          if (!isVisible) return null;

          return (
            <div
              key={index}
              className="absolute transition-all duration-500 ease-out"
              style={{
                width: "clamp(260px, 38vw, 420px)",
                aspectRatio: "3 / 4",
                transform: `translateX(${offset * 105}%) scale(${isActive ? 1 : 0.82})`,
                zIndex: isActive ? 10 : 5 - Math.abs(offset),
                opacity: Math.abs(offset) > 1 ? 0.3 : 1,
                filter: isActive ? "none" : "brightness(0.5)",
              }}
              onClick={() => handleSlideClick(index, isActive, slide.href)}
              role="button"
              tabIndex={isActive ? 0 : -1}
              aria-label={isActive ? `Open ${slide.title}` : `Show ${slide.title}`}
            >
              <div
                className="relative w-full h-full rounded-xl overflow-hidden cursor-pointer group"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* Image */}
                <Image
                  src={slide.src}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  width={800}
                  height={800}
                  loading="lazy"
                  sizes="clamp(260px, 38vw, 420px)"
                  draggable={false}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Content — only on active */}
                <div
                  className="absolute inset-x-0 bottom-0 p-5 sm:p-7 transition-opacity duration-500"
                  style={{ opacity: isActive ? 1 : 0 }}
                >
                  <h3 className="font-display text-base sm:text-lg md:text-xl lg:text-2xl uppercase tracking-[0.06em] text-[#F2E6D8] leading-tight">
                    {slide.title}
                  </h3>
                  <span className="inline-flex items-center gap-2 mt-3 px-4 py-2 text-[12px] sm:text-[14px] uppercase tracking-[0.1em] text-[#F2E6D8]/90 bg-white/10 backdrop-blur-sm border border-[#D4A574]/30 rounded-full transition-all duration-300 group-hover:bg-white/15 group-hover:border-[#D4A574]/50 group-active:scale-95">
                    {slide.button}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots — fixed-width hit areas, animated inner pill, zero layout shift */}
      <div className="mt-5 flex items-center justify-center gap-0 sm:mt-7" role="tablist" aria-label="Carousel navigation">
        {slides.map((_, i) => {
          const isActive = i === current;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              onClick={() => setCurrent(i)}
              className="group/dot flex h-10 w-7 cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none transition-transform duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A574]/70 focus-visible:rounded-md"
              style={{ WebkitTapHighlightColor: "transparent", appearance: "none" }}
              aria-label={`Slide ${i + 1} of ${slides.length}`}
              aria-selected={isActive}
              aria-current={isActive ? "true" : undefined}
            >
              <span
                className={`block h-[7px] rounded-full transition-[width,background-color] duration-[350ms] ease-out ${
                  isActive
                    ? "w-6 bg-[#D4A574] shadow-[0_0_8px_rgba(212,165,116,0.35)]"
                    : "w-[7px] bg-[#F2E6D8]/30 group-hover/dot:bg-[#F2E6D8]/55"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Arrow buttons — WCAG AA touch targets (44x44 mobile), tactile feedback */}
      <button
        type="button"
        onClick={() => goTo(-1)}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-[#F2E6D8]/85 backdrop-blur-md transition-all duration-200 hover:bg-black/65 hover:text-[#F2E6D8] active:scale-90 focus-visible:outline-2 focus-visible:outline-[#D4A574]/70"
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={() => goTo(1)}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-[#F2E6D8]/85 backdrop-blur-md transition-all duration-200 hover:bg-black/65 hover:text-[#F2E6D8] active:scale-90 focus-visible:outline-2 focus-visible:outline-[#D4A574]/70"
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2.25} />
      </button>
    </div>
  );
}
