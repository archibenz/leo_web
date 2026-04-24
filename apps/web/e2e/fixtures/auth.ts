import {test as base, expect} from '@playwright/test';

type AdminCreds = {email: string; password: string} | null;

function getAdminCreds(): AdminCreds {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return {email, password};
}

type Fixtures = {
  adminCreds: AdminCreds;
};

export const test = base.extend<Fixtures>({
  adminCreds: async ({}, use) => {
    await use(getAdminCreds());
  },
});

export {expect};

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}@example.test`;
}
