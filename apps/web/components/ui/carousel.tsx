"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
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
  const len = slides.length;

  const goTo = useCallback(
    (dir: -1 | 1) => {
      setCurrent((prev) => (prev + dir + len) % len);
    },
    [len],
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
              onClick={() => {
                if (!isActive) setCurrent(index);
              }}
            >
              <div className="relative w-full h-full rounded-xl overflow-hidden cursor-pointer group">
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
                  <span className="inline-block mt-3 px-4 py-2 text-[12px] sm:text-[14px] uppercase tracking-[0.1em] text-[#F2E6D8]/80 bg-white/10 backdrop-blur-sm border border-[#D4A574]/25 rounded-full">
                    {slide.button}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 bg-[#D4A574]"
                : "w-1.5 bg-[#F2E6D8]/25 hover:bg-[#F2E6D8]/40"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Arrow buttons */}
      <button
        onClick={() => goTo(-1)}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-[#F2E6D8]/70 hover:text-[#F2E6D8] hover:bg-black/50 transition-all duration-200"
        aria-label="Previous"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      <button
        onClick={() => goTo(1)}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-[#F2E6D8]/70 hover:text-[#F2E6D8] hover:bg-black/50 transition-all duration-200"
        aria-label="Next"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
}
