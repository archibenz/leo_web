import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-jwt';
});

describe('auth utilities', () => {
  it('hashPassword returns a hash different from input', async () => {
    const { hashPassword } = await import('../auth');
    const hash = await hashPassword('mypassword');
    expect(hash).not.toBe('mypassword');
    expect(hash).toBeTruthy();
  });

  it('comparePassword returns true for matching password/hash', async () => {
    const { hashPassword, comparePassword } = await import('../auth');
    const hash = await hashPassword('mypassword');
    const result = await comparePassword('mypassword', hash);
    expect(result).toBe(true);
  });

  it('comparePassword returns false for wrong password', async () => {
    const { hashPassword, comparePassword } = await import('../auth');
    const hash = await hashPassword('mypassword');
    const result = await comparePassword('wrongpassword', hash);
    expect(result).toBe(false);
  });

  it('generateVerificationToken returns a 64-char hex string', async () => {
    const { generateVerificationToken } = await import('../auth');
    const token = generateVerificationToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});
