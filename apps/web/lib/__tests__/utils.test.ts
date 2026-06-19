import {describe, it, expect} from 'vitest';
import {cn} from '../utils';

// cn = twMerge(clsx(...)) — used pervasively for className composition. The
// twMerge conflict-dedup (last wins) and clsx conditional/array/object handling
// are the behaviours worth pinning; a regression here is silent and widespread.
describe('cn', () => {
  it('joins plain class strings', () => {
    expect(cn('px-2', 'text-ink')).toBe('px-2 text-ink');
  });

  it('dedups conflicting tailwind utilities — last one wins', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-ink/40', 'text-ink/60')).toBe('text-ink/60');
  });

  it('drops falsy values (conditional classes)', () => {
    const active = false;
    const open = true;
    expect(cn('a', active && 'is-active', null, undefined, open && 'is-open', 'b')).toBe('a is-open b');
  });

  it('flattens arrays and objects (clsx semantics)', () => {
    expect(cn(['a', 'b'], {c: true, d: false})).toBe('a b c');
  });

  it('returns an empty string when given nothing actionable', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });
});
