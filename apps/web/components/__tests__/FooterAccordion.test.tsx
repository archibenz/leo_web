import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import FooterAccordion from '../FooterAccordion';

// FooterAccordion used to rely on framer-motion (AnimatePresence + motion.div)
// for the collapse/expand animation. It was rewritten to a CSS-only
// grid-template-rows transition to keep framer-motion off the global critical
// path (see lw-ur6) — these tests cover the resulting open/close contract.
describe('FooterAccordion', () => {
  it('starts collapsed and marks the panel inert', () => {
    render(<FooterAccordion title="Shipping">Ships in 3 days</FooterAccordion>);

    const trigger = screen.getByRole('button', { name: 'Shipping' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    const panel = screen.getByText('Ships in 3 days').closest('[role="region"]');
    expect(panel).toHaveAttribute('inert');
    expect(panel).not.toHaveClass('is-open');
  });

  it('respects defaultOpen', () => {
    render(
      <FooterAccordion title="Contact" defaultOpen>
        Reach us anytime
      </FooterAccordion>,
    );

    expect(screen.getByRole('button', { name: 'Contact' })).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByText('Reach us anytime').closest('[role="region"]');
    expect(panel).not.toHaveAttribute('inert');
    expect(panel).toHaveClass('is-open');
  });

  it('toggles open state on click without framer-motion', async () => {
    const user = userEvent.setup();
    render(<FooterAccordion title="Returns">30 day policy</FooterAccordion>);

    const trigger = screen.getByRole('button', { name: 'Returns' });
    const panel = screen.getByText('30 day policy').closest('[role="region"]');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveClass('is-open');
    expect(panel).not.toHaveAttribute('inert');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).not.toHaveClass('is-open');
    expect(panel).toHaveAttribute('inert');
  });

  it('links trigger and panel via aria-controls / id', () => {
    render(<FooterAccordion title="Size Guide">Fits true to size</FooterAccordion>);

    const trigger = screen.getByRole('button', { name: 'Size Guide' });
    const panel = screen.getByText('Fits true to size').closest('[role="region"]');
    expect(panel?.id).toBeTruthy();
    expect(trigger.getAttribute('aria-controls')).toBe(panel?.id);
  });

  it('names the region after its trigger via aria-labelledby', () => {
    render(
      <FooterAccordion title="Care" defaultOpen>
        Wash cold
      </FooterAccordion>,
    );

    // role="region" needs an accessible name — it comes from the trigger button.
    const region = screen.getByRole('region', { name: 'Care' });
    const trigger = screen.getByRole('button', { name: 'Care' });
    expect(trigger.id).toBeTruthy();
    expect(region).toHaveAttribute('aria-labelledby', trigger.id);
  });

  it('keeps ids unique for localized titles that share no latin characters', () => {
    render(
      <>
        <FooterAccordion title="Магазин">RU shop links</FooterAccordion>
        <FooterAccordion title="Уход">RU care links</FooterAccordion>
      </>,
    );

    const shop = screen.getByText('RU shop links').closest('[role="region"]');
    const care = screen.getByText('RU care links').closest('[role="region"]');
    expect(shop?.id).toBeTruthy();
    expect(shop?.id).not.toBe(care?.id);
  });
});
