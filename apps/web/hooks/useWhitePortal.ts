import {useEffect, useState} from 'react';

// Mount guard + body-scroll lock + background `inert` for the white showcase
// portals. The /white surfaces render through a portal that visually covers the
// gradient chrome, but that chrome stays in the DOM — so its links/buttons stay
// in the tab order and the accessibility tree behind the white overlay. While
// the portal is mounted, mark the focusable background `inert` (the standard
// modal pattern) so keyboard / screen-reader users only reach the white UI.
export function useWhitePortal(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // The portal's own root carries `wv-root`; everything else under <body>
    // that holds focusable content is the gradient chrome behind the overlay.
    const background = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        !el.classList.contains('wv-root') &&
        el.querySelector('a, button, input, select, textarea, [tabindex]') !== null,
    );
    background.forEach((el) => el.setAttribute('inert', ''));

    return () => {
      document.body.style.overflow = prevOverflow;
      background.forEach((el) => el.removeAttribute('inert'));
    };
  }, []);

  return mounted;
}
