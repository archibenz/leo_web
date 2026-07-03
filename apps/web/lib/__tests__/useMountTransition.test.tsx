import {renderHook, waitFor} from '@testing-library/react';
import {describe, it, expect} from 'vitest';
import {useMountTransition} from '../useMountTransition';

// The framer-motion-free <AnimatePresence> stand-in used by the account modals
// (lw-1dxx): mount on open, keep mounted through the CSS exit transition, flip
// `entered` a frame later so an enter transition runs.
describe('useMountTransition', () => {
  it('is unmounted and not entered while closed', () => {
    const {result} = renderHook(({open}) => useMountTransition(open, 30), {
      initialProps: {open: false},
    });

    expect(result.current).toEqual({mounted: false, entered: false});
  });

  it('mounts immediately on open and flips to entered on the next frame', async () => {
    const {result, rerender} = renderHook(({open}) => useMountTransition(open, 30), {
      initialProps: {open: false},
    });

    rerender({open: true});
    // Mounted synchronously so the node exists to animate from its "from" state.
    expect(result.current.mounted).toBe(true);
    // entered flips a frame later so the enter transition actually runs.
    await waitFor(() => expect(result.current.entered).toBe(true));
  });

  it('keeps the node mounted through the exit window, then unmounts', async () => {
    const {result, rerender} = renderHook(({open}) => useMountTransition(open, 30), {
      initialProps: {open: false},
    });

    rerender({open: true});
    await waitFor(() => expect(result.current.entered).toBe(true));

    rerender({open: false});
    // entered flips off at once so the exit transition plays...
    expect(result.current.entered).toBe(false);
    // ...while the node stays mounted until the duration elapses.
    expect(result.current.mounted).toBe(true);
    await waitFor(() => expect(result.current.mounted).toBe(false));
  });
});
