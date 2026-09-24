import {render, screen} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../../../messages/ru.json';
import HomepageSettingsPage from '../homepage/page';

// «Главная» в админке сохраняет выбор товаров, коллекций и сезона, но белая
// витрина этого не читает: её «Подборка» собирается по порядку у самих
// моделей. Раздел, который молча сохраняет в пустоту, врёт — у «Коллекций» и
// «Ухода» об этом уже сказано, здесь не было (решение 24.09).

vi.mock('../../../../../lib/api', () => ({
  apiFetch: () => new Promise(() => {}),
}));

describe('admin homepage settings', () => {
  it('says up front that these settings are not on the site yet', () => {
    render(
      <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
        <HomepageSettingsPage />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(ruMessages.admin.homepageNotOnSiteNotice)).toBeInTheDocument();
  });
});
