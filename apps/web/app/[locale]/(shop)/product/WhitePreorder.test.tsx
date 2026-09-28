import {render, screen, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../../messages/ru.json';
import WhitePreorder from './WhitePreorder';

// Принятая заявка на предзаказ — событие сайта preorder (28.09): воронка
// аналитики видит заявки, которые раньше уходили только письмом. Событие —
// только на успех: отказ заявкой не стал.

const trackSiteEvent = vi.fn();
vi.mock('../../../../lib/siteEvents', () => ({trackSiteEvent: (...args: unknown[]) => trackSiteEvent(...args)}));

const t = ruMessages.white.pdp;

function renderPreorder() {
  return render(
    <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
      <WhitePreorder product="Пальто-пиджак приталенное" productId="wb-795522033-grey" size="M" />
    </NextIntlClientProvider>,
  );
}

async function sendRequest() {
  const user = userEvent.setup();
  renderPreorder();
  await user.click(screen.getByRole('button', {name: t.preorder}));
  await user.type(screen.getByLabelText(t.preorderEmail), 'buyer@example.com');
  await user.click(screen.getByRole('button', {name: t.preorderSubmit}));
}

beforeEach(() => trackSiteEvent.mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('предзаказ — событие сайта', () => {
  it('принятая заявка шлёт одно событие preorder с вариантом товара', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, {status: 200})));
    await sendRequest();
    expect(await screen.findByText(t.preorderSent)).toBeInTheDocument();
    expect(trackSiteEvent).toHaveBeenCalledTimes(1);
    expect(trackSiteEvent).toHaveBeenCalledWith('preorder', {productId: 'wb-795522033-grey'});
  });

  it('отказ (400) заявкой не стал — события нет', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, {status: 400})));
    await sendRequest();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(trackSiteEvent).not.toHaveBeenCalled();
  });

  it('сеть упала — события нет', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    await sendRequest();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(trackSiteEvent).not.toHaveBeenCalled();
  });
});
