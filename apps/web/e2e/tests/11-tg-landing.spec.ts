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

  // The owner's actual complaint was the chrome, not the card: the old dark
  // Header/Footer used to wrap this page no matter how the card itself was
  // styled (app/[locale]/layout.tsx used to route /auth/* through the same
  // gradient branch as /admin/*). Proving the card is white is not proof the
  // *page* is white — this proves the frame is too, by comparing it against
  // the one on the storefront root.
  test('the header and footer are the White storefront chrome, same as /ru — not the dark gradient one', async ({page}) => {
    await page.goto('/ru', {waitUntil: 'domcontentloaded'});
    const homeHeader = page.locator('header').first();
    const homeFooter = page.locator('footer').first();
    const [homeHeaderBg, homeFooterBg] = await Promise.all([
      homeHeader.evaluate((el) => getComputedStyle(el).backgroundColor),
      homeFooter.evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);

    await page.goto(`/ru/auth/tg?token=${BAD_TOKEN}`, {waitUntil: 'domcontentloaded'});

    // The gradient wrapper is the only place the dark Header/Footer/Providers
    // trio can render (app/[locale]/layout.tsx) — it must not exist on this
    // route at all now that the branch is admin-only.
    await expect(page.locator('.gradient-chrome')).toHaveCount(0);

    // WhiteHeader's own skip-link targets #wv-main; the gradient layout's
    // targets #main-content. Different hrefs, so this cannot pass by accident
    // even though the ru copy for both happens to read the same sentence.
    await expect(page.locator('a[href="#wv-main"]')).toBeVisible();
    await expect(page.locator('a[href="#main-content"]')).toHaveCount(0);

    const header = page.locator('header').first();
    const footer = page.locator('footer').first();
    await expect(header).toHaveCount(1);
    await expect(footer).toHaveCount(1);
    // The old Footer is a solid near-black #1a0f0a (components/Footer.tsx) —
    // confirm it is not just hidden but genuinely not the element in play.
    await expect(footer).not.toHaveCSS('background-color', 'rgb(26, 15, 10)');

    const [tgHeaderBg, tgFooterBg] = await Promise.all([
      header.evaluate((el) => getComputedStyle(el).backgroundColor),
      footer.evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);
    expect(tgHeaderBg).toBe(homeHeaderBg);
    expect(tgFooterBg).toBe(homeFooterBg);
  });
});
