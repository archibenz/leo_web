'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import {ArrowUpRight, Check, Loader2} from 'lucide-react';
import {Button, type ButtonProps} from './button';

type DynamicButtonProps = Omit<ButtonProps, 'asChild' | 'children'> & {
  children: string;
  state: 'idle' | 'pending' | 'success';
};

export function DynamicButton({children, state, disabled, type = 'button', ...props}: DynamicButtonProps) {
  const content = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () => {
      const next = element.getBoundingClientRect().width;
      if (next > 0) setWidth(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children, state]);

  const Icon = state === 'pending' ? Loader2 : state === 'success' ? Check : ArrowUpRight;
  return (
    <Button variant="owner" size="owner" {...props} type={type} disabled={disabled || state === 'pending'} aria-busy={state === 'pending'}>
      <span className="wv-dynamic-width" style={{width}}>
        <span key={state} ref={content} className="wv-dynamic-content">
          <span>{children}</span>
          <Icon aria-hidden="true" className={state === 'pending' ? 'wv-dynamic-spinner' : state === 'idle' ? 'wv-owner-arrow' : undefined} />
        </span>
      </span>
    </Button>
  );
}
