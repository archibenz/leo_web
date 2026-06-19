import {describe, it, expect} from 'vitest';
import {formatPrice} from '../formatPrice';

describe('formatPrice', () => {
  it('renders roubles, never euro, with no fractional kopecks', () => {
    const ru = formatPrice('ru', 32900);
    expect(ru).toContain('₽');
    expect(ru).not.toContain('€');
    expect(ru).not.toContain(',00');
    expect(ru).not.toContain('.00');
    // ru-RU groups with a (narrow) space, not a comma
    expect(ru.replace(/\s/g, '')).toContain('32900');
  });

  it('uses the RUB currency for the en locale too (no euro leak)', () => {
    const en = formatPrice('en', 14900);
    expect(en).not.toContain('€');
    expect(en).toMatch(/RUB|₽/);
    expect(en).toContain('14,900');
  });

  it('handles zero', () => {
    expect(formatPrice('ru', 0)).not.toContain('€');
  });
});
