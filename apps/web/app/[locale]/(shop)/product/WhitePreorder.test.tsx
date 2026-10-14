import {render, screen, cleanup, fireEvent, act, waitFor} from '@testing-library/react';
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
  document.body.style.overflow = '';
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

  it.each(['Escape', 'backdrop', 'close button'])('keeps the pending request visible when dismissed with %s', async (dismissal) => {
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    await sendRequest();
    const dialog = screen.getByRole('dialog');

    if (dismissal === 'Escape') fireEvent.keyDown(document, {key: 'Escape'});
    else if (dismissal === 'backdrop') fireEvent.mouseDown(dialog.parentElement!);
    else fireEvent.click(screen.getByRole('button', {name: t.close}));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t.preorderSending})).toBeDisabled();
    await act(async () => finish(new Response(null, {status: 200})));
    expect(screen.getByText(t.preorderSent)).toBeInTheDocument();
  });

  it.each(['', 'clip'])('locks background scrolling and restores the previous overflow value %j', async (previousOverflow) => {
    document.body.style.overflow = previousOverflow;
    const user = userEvent.setup();
    const {unmount} = renderPreorder();
    const trigger = screen.getByRole('button', {name: t.preorder});
    await user.click(trigger);
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.overflow).toBe(previousOverflow));
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    unmount();
    expect(document.body.style.overflow).toBe(previousOverflow);
  });

  it('returns focus to the opener when a pointer click did not focus it', async () => {
    const user = userEvent.setup();
    render(<button>Previous control</button>);
    renderPreorder();
    screen.getByRole('button', {name: 'Previous control'}).focus();
    const trigger = screen.getByRole('button', {name: t.preorder});
    // Safari pointer clicks do not necessarily focus their button.
    fireEvent.click(trigger);
    expect(screen.getByRole('button', {name: t.close})).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it('keeps Shift+Tab inside the dialog immediately after opening', async () => {
    const user = userEvent.setup();
    renderPreorder();
    await user.click(screen.getByRole('button', {name: t.preorder}));

    await user.tab({shift: true});
    expect(screen.getByRole('button', {name: t.preorderSubmit})).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', {name: t.close})).toHaveFocus();
  });

  it('wraps between enabled fields while the request is sending', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    await sendRequest();
    const user = userEvent.setup();
    const email = screen.getByLabelText(t.preorderEmail);
    const note = screen.getByRole('textbox', {name: /M/});
    act(() => email.focus());

    await user.tab({shift: true});
    expect(note).toHaveFocus();
    await user.tab();
    expect(email).toHaveFocus();
    expect(screen.getByRole('button', {name: t.close})).toBeDisabled();
  });
});
