import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', {open: 'never'}]],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
    {
      // Scoped to the hero-media spec on purpose: that spec exists to guard the
      // Safari-only `media`-on-`<source>` quirk (lw-smu6), and a browser that
      // never runs it isn't guarding anything. The other specs never asserted
      // anything Safari-specific, so running the whole suite twice would only
      // add time without adding coverage.
      name: 'webkit',
      use: {...devices['Desktop Safari']},
      testMatch: /08-hero-media-per-viewport\.spec\.ts/,
    },
  ],

  webServer: process.env.E2E_SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // The storefront comes from the API now, and these specs do not run one.
        // The fixture is the catalogue they assert against, so the dev server has
        // to be told before it serves its first page.
        env: {...process.env, CATALOGUE_SOURCE: 'fixture'} as Record<string, string>,
      },
});
