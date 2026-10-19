import {test, expect, type Locator, type Page} from '@playwright/test';
import {acknowledgeCookies, COLD_COMPILE} from '../fixtures/white';

const USER = {id: '00000000-0000-4000-8000-000000000001', name: 'Контраст', email: 'contrast@example.test', role: 'admin'};

async function account(page: Page, status: number) {
  await acknowledgeCookies(page);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({json: USER});
    if (path === '/api/auth/me/telegram-link/status') return route.fulfill({json: {
      schema_version: 1, site_user_id: USER.id, linked: true, verified: true,
      verified_until: new Date(Date.now() + 3_600_000).toISOString(),
    }});
    return route.fulfill({json: []});
  });
  await page.route('**/account/analytics-access', route => route.fulfill({status, body: ''}));
  await page.route('**/metrika/**', route => route.abort());
  await page.goto('/ru/account', {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  const control = status === 204
    ? page.getByRole('link', {name: 'Аналитика', exact: true})
    : page.getByRole('button', {name: 'Проверить доступ снова', exact: true});
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  return control;
}

// Read the element that actually paints the label, including a bare text node.
// Checking only the button's color misses child-label color transitions.
async function labelColor(control: Locator) {
  return control.evaluate(element => {
    const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = text.nextNode())) {
      if (node.textContent?.trim()) return getComputedStyle(node.parentElement!).color;
    }
    throw new Error('Control label is empty');
  });
}

for (const status of [204, 503]) {
  test(`Analytics ${status === 204 ? 'link' : 'retry'} stays readable through desktop hover, keyboard focus and press`, async ({page}, info) => {
    await page.setViewportSize({width: 1440, height: 1000});
    const control = await account(page, status);
    expect(await labelColor(control)).toBe('rgb(28, 23, 20)');
    await control.hover();
    await expect.poll(() => labelColor(control)).toBe('rgb(255, 255, 255)');
    await expect.poll(() => control.evaluate(element => getComputedStyle(element, '::before').transform)).toBe('none');
    await control.screenshot({path: info.outputPath('analytics-hover.png')});
    await page.mouse.move(0, 0);
    await expect.poll(() => labelColor(control)).toBe('rgb(28, 23, 20)');
    // Enter keyboard modality, then focus the exact target. macOS WebKit may
    // skip links during Tab traversal according to its native tab preference.
    await page.keyboard.press('Tab');
    await control.focus();
    await expect(control).toBeFocused();
    await expect.poll(() => control.evaluate(element => element.matches(':focus-visible'))).toBe(true);
    await expect.poll(() => labelColor(control)).toBe('rgb(255, 255, 255)');
    await control.hover();
    await page.mouse.down();
    await expect.poll(() => labelColor(control)).toBe('rgb(255, 255, 255)');
    // Release outside the control: this test never follows Analytics or retries.
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });
}

test.describe('touch account controls', () => {
  test.use({hasTouch: true, viewport: {width: 390, height: 844}});
  for (const status of [204, 503]) {
    test(`Analytics ${status === 204 ? 'link' : 'retry'} retains readable text after touch`, async ({page}) => {
      const control = await account(page, status);
      expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
      expect(await labelColor(control)).toBe('rgb(28, 23, 20)');
      // Avoid navigation/retry while retaining native pointer/focus feedback.
      await control.evaluate(element => element.addEventListener('click', event => {
        event.preventDefault(); event.stopImmediatePropagation();
      }, {capture: true}));
      await control.tap();
      expect(await labelColor(control)).toBe('rgb(28, 23, 20)');
      expect(await control.evaluate(element => getComputedStyle(element, '::before').opacity)).toBe('0.06');
    });
  }
});
