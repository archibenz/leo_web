import {describe, it, expect, beforeEach} from 'vitest';
import {readEditCookie, writeEditCookie} from '../editCookie';

// jsdom даёт vitest настоящий http://localhost:3000 (не about:blank), так
// что Secure-кука в этих тестах ставится и читается по-настоящему, а не
// через мок document.cookie.
beforeEach(() => {
  document.cookie = 'rl_edit=; Path=/; Max-Age=0';
});

describe('readEditCookie', () => {
  it('нет куки — false', () => {
    expect(readEditCookie()).toBe(false);
  });

  it('чужая кука с тем же хвостом не считается — сравнение точное, не по подстроке', () => {
    document.cookie = 'some_rl_edit=1; Path=/';
    expect(readEditCookie()).toBe(false);
  });

  it('ровно rl_edit=1 — true', () => {
    document.cookie = 'rl_edit=1; Path=/; SameSite=Lax; Secure';
    expect(readEditCookie()).toBe(true);
  });
});

describe('writeEditCookie', () => {
  it('true — ставит куку', () => {
    writeEditCookie(true);
    expect(readEditCookie()).toBe(true);
  });

  it('false — снимает уже стоящую куку', () => {
    document.cookie = 'rl_edit=1; Path=/; SameSite=Lax; Secure';
    writeEditCookie(false);
    expect(readEditCookie()).toBe(false);
  });
});
