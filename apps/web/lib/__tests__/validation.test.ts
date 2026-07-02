import {describe, it, expect} from 'vitest';
import {isValidEmail, isValidTelegramDeepLink} from '../validation';

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

// BotAuthService.initAuth (apps/api) only ever mints
// "https://t.me/<botUsername>?start=auth_<token>" — this guard is the
// frontend's last line of defense before window.location.href, so it must
// accept that exact shape and reject anything else, including
// lookalike hosts and non-https schemes.
describe('isValidTelegramDeepLink', () => {
  it('accepts real Telegram deep links', () => {
    for (const ok of [
      'https://t.me/reinasleo_bot?start=auth_abc123',
      'https://t.me/some_bot',
      'https://t.me/some_bot?start=auth_' + 'a'.repeat(32),
    ]) {
      expect(isValidTelegramDeepLink(ok)).toBe(true);
    }
  });

  it('rejects malformed or unexpected-host URLs', () => {
    for (const bad of [
      '',
      'not a url',
      'javascript:alert(1)',
      'http://t.me/some_bot',
      'https://telegram.me/some_bot',
      'https://t.me.evil.com/some_bot',
      'https://evil.com/t.me/some_bot',
      'https://evil.com/?redirect=https://t.me/some_bot',
      '//t.me/some_bot',
      'tg://resolve?domain=some_bot&start=auth_abc123',
    ]) {
      expect(isValidTelegramDeepLink(bad)).toBe(false);
    }
  });
});
