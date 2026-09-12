import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

// The bot's own site link falls back to this exact address (see the comment
// at app/[locale]/WhiteTelegramLogin.tsx:14) — it is the last live route still
// dressed in the pre-July gradient look. auth.tg.expired sits outside the
// `white.*` namespace e2e/fixtures/messages.ts serves, so this reads the same
// ru.json by hand rather than pin the Russian copy here.
type Catalogue = {auth: {tg: {expired: {title: string; description: string; cta: string}}}};
const ru = JSON.parse(
  readFileSync(new URL('../../messages/ru.json', import.meta.url), 'utf8'),
) as Catalogue;
const expired = ru.auth.tg.expired;

// Shorter than the 20-char floor page.tsx checks client-side (see
// page.test.tsx), so it never reaches the exchange endpoint — no backend
// needed for this spec.
const BAD_TOKEN = 'negodnyy';

test.describe('Telegram landing — white error state', () => {
  test('a stale/malformed token shows the white card, and its button reaches the account page', async ({page}) => {
    await page.goto(`/ru/auth/tg?token=${BAD_TOKEN}`, {waitUntil: 'domcontentloaded'});

    await expect(page.getByText(expired.title)).toBeVisible();
    await expect(page.getByText(expired.description)).toBeVisible();
    const cta = page.getByRole('button', {name: expired.cta});
    await expect(cta).toBeVisible();

    // The old gradient card never reaches this markup.
    await expect(page.locator('.paper-card')).toHaveCount(0);
    await expect(page.locator('.lux-btn-primary')).toHaveCount(0);
    await expect(page.locator('.text-ink-soft')).toHaveCount(0);

    await cta.click();
    await expect(page).toHaveURL(/\/ru\/account$/);
  });
});
