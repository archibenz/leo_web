import {describe, expect, it} from 'vitest';
import {safeNextPath} from '../safeNext';

const ORIGIN = 'https://reinasleo.com';

describe('safeNextPath', () => {
  it('пускает путь своего сайта', () => {
    expect(safeNextPath('/analytics', ORIGIN)).toBe('/analytics');
    expect(safeNextPath('/analytics/finance?period=7d#top', ORIGIN)).toBe('/analytics/finance?period=7d#top');
  });

  it('без next — никуда', () => {
    expect(safeNextPath(null, ORIGIN)).toBeNull();
    expect(safeNextPath('', ORIGIN)).toBeNull();
  });

  it('не пускает на чужой хост', () => {
    for (const raw of [
      'https://evil.com',
      '//evil.com',
      '//evil.com/analytics',
      '/\\evil.com',
      '\\\\evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      'javascript:alert(1)',
      'analytics',
    ]) {
      expect(safeNextPath(raw, ORIGIN), raw).toBeNull();
    }
  });
});
