import {describe, it, expect} from 'vitest';
import {buildRelease} from '../../scripts/release.mjs';

// Релиз в отчётах об ошибках (28.09: React #418 пришёл с release=unknown —
// не понять, какая сборка). sha12 — имя папки релиза на сервере.

describe('релиз сборки', () => {
  it('без явного значения — sha12 текущего коммита', () => {
    expect(buildRelease({})).toMatch(/^[0-9a-f]{12}$/);
  });

  it('явный NEXT_PUBLIC_RELEASE побеждает', () => {
    expect(buildRelease({NEXT_PUBLIC_RELEASE: ' v1.2.3 '})).toBe('v1.2.3');
  });

  it('вне git — пусто, а не выдумка', () => {
    const noGit = () => { throw new Error('not a git repository'); };
    expect(buildRelease({}, noGit)).toBe('');
  });

  it('странный ответ git — пусто', () => {
    expect(buildRelease({}, () => Buffer.from('fatal: something\n'))).toBe('');
  });
});
