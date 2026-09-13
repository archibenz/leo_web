import {test, expect, type Page} from '@playwright/test';
import {skipUnlessFixtureCatalogue} from '../fixtures/catalogue';
import {openWhite} from '../fixtures/white';
import {copy} from '../fixtures/messages';

// Собственный сбор поведения витрины (lib/siteEvents.ts). Сеть проверяется
// перехватом запросов, а не чтением кода — так требует приёмка задачи:
// doNotTrack=1 обязан оставить /api/events без единого запроса, и это
// единственный способ доказать это по-настоящему, а не по тексту функции.

test.beforeEach(async ({request}) => {
  await skipUnlessFixtureCatalogue(request);
});

// domcontentloaded fires on the server HTML; the page_view effect only runs
// once React hydrates. WhiteCookieNotice mounts from an effect and nothing
// else (see hydrateViaCookieNotice in fixtures/white.ts) — its appearance is
// the same "effects have run" proof reused here, without clicking it away
// (accepting cookies is not what this spec is about).
async function waitForHydration(page: Page): Promise<void> {
  await expect(page.getByRole('region', {name: copy('footer', 'cookieText')})).toBeVisible();
}

// A real visibilitychange cannot be staged in Playwright (no API to back a
// tab out programmatically) — the event is faked the same way
// lib/__tests__/siteEvents.test.ts does it: override document.visibilityState
// and dispatch by hand. The browser is real; the handler that catches it is
// the exact one a real tab-hide would run.
async function hideTab(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function trackEventsRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/events')) seen.push(req.url());
  });
  return seen;
}

test.describe('site events — doNotTrack', () => {
  test('doNotTrack=1: ни одного запроса к /api/events, даже после ухода со страницы', async ({page}) => {
    // Before the first navigation — doNotTrack must be visible to the page's
    // very first executed script, not patched in afterwards.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'doNotTrack', {value: '1', configurable: true});
    });
    const requests = trackEventsRequests(page);

    await openWhite(page, '/ru');
    await waitForHydration(page);
    await hideTab(page);
    await page.waitForTimeout(500);

    expect(requests).toHaveLength(0);
  });
});

test.describe('site events — timing and delivery (control group for the doNotTrack mutation)', () => {
  // The acceptance mutation ("remove the doNotTrack check") must redden
  // exactly the case above: without the check, page_view queues even with
  // doNotTrack=1 too. Neither test below sets doNotTrack, so the mutation
  // leaves both of them green.
  test('без doNotTrack ничего не уходит до visibilitychange...', async ({page}) => {
    const requests = trackEventsRequests(page);

    await openWhite(page, '/ru');
    await waitForHydration(page);

    expect(requests).toHaveLength(0);
  });

  test('...и уходит запрос сразу после того, как вкладка скрылась', async ({page}) => {
    const requests = trackEventsRequests(page);

    await openWhite(page, '/ru');
    await waitForHydration(page);
    await hideTab(page);
    await page.waitForTimeout(500);

    expect(requests.length).toBeGreaterThan(0);
  });
});
