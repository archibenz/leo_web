import {describe, it, expect} from 'vitest';
import {isValidEmail} from '../validation';

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    for (const ok of ['a@b.co', 'user.name+tag@sub.example.com', 'x_y%z@d-e.io']) {
      expect(isValidEmail(ok)).toBe(true);
    }
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'plainstring', 'no@tld', 'a@b', '@example.com', 'a b@example.com', 'a@@b.com']) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});
