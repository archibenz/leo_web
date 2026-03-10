'use client';

import {useEffect, useState, useRef, useCallback, type ReactNode} from 'react';

type SmartHeaderProps = {
  children: ReactNode;
};

export default function SmartHeader({children}: SmartHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateHeader = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Determine if scrolled past threshold for background blur
    setIsScrolled(currentScrollY > 12);
    
    // At the very top, always show
    if (currentScrollY <= 20) {
      setIsVisible(true);
      lastScrollY.current = currentScrollY;
      ticking.current = false;
      return;
    }
    
    // Scrolling down - hide header
    if (currentScrollY > lastScrollY.current + 5) {
      setIsVisible(false);
    }
    // Scrolling up - show header
    else if (currentScrollY < lastScrollY.current - 2) {
      setIsVisible(true);
    }
    
    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, []);

  const onScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(updateHeader);
      ticking.current = true;
    }
  }, [updateHeader]);

  useEffect(() => {
    // Initialize with current scroll position
    lastScrollY.current = window.scrollY;
    setIsScrolled(window.scrollY > 12);
    
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300 ease-out
        ${isVisible 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0 pointer-events-none'
        }
        ${isScrolled 
          ? 'bg-black/25 backdrop-blur-md border-b border-white/10' 
          : 'bg-transparent backdrop-blur-[2px] supports-[backdrop-filter]:bg-black/5'
        }
      `}
    >
      {children}
    </div>
  );
}
