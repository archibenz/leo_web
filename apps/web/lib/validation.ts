export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// The backend only ever mints "https://t.me/<botUsername>?start=auth_<token>"
// (see BotAuthService.initAuth on the API side) — this is the sole scheme/host
// a legitimate Telegram deep link can arrive as. Server-supplied navigation
// targets are otherwise unvalidated: gate them here before window.location.href
// so a future backend bug / cache poisoning can't turn this into an open redirect.
export function isValidTelegramDeepLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 't.me';
  } catch {
    return false;
  }
}
