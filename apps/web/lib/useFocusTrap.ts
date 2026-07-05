import {useEffect, RefObject} from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  {returnFocus = true}: {returnFocus?: boolean} = {},
): void {
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    // Focus the dialog itself, not its first link — a programmatic focus on a
    // link paints the platform focus ring (iOS draws a heavy rounded box) on
    // every open. Containers without tabindex fall back to the first control.
    container.focus({preventScroll: true});
    if (document.activeElement !== container) {
      getFocusableElements(container)[0]?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const current = containerRef.current;
      if (!current) return;
      const items = getFocusableElements(current);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // preventScroll: the opener may sit in a sticky header whose static
      // position is the document top — a plain focus() would yank the page there.
      if (returnFocus) previousFocus?.focus?.({preventScroll: true});
    };
  }, [isOpen, containerRef]);
}
