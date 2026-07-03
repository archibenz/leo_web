import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, it, expect} from 'vitest';
import WildberriesButton from '../WildberriesButton';

describe('WildberriesButton', () => {
  it('renders an external link with its children', () => {
    render(<WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>);

    const link = screen.getByRole('link', {name: 'Buy on WB'});
    expect(link).toHaveAttribute('href', 'https://wb.example/item');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('runs the ripple animation only while hovered (WCAG 2.2.2)', async () => {
    const user = userEvent.setup();
    const {container} = render(
      <WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>,
    );
    const link = screen.getByRole('link');
    const fill = container.querySelector<HTMLElement>('.wb-fill');
    expect(fill).not.toBeNull();

    // At rest nothing animates — no perpetual compositor work from mount.
    expect(container.querySelector('.wb-wave-front')).toBeNull();
    expect(container.querySelector('.wb-wave-back')).toBeNull();
    expect(fill?.style.transform).toContain('translateY(101%)');

    await user.hover(link);
    expect(container.querySelector('.wb-wave-front')).not.toBeNull();
    expect(container.querySelector('.wb-wave-back')).not.toBeNull();
    expect(fill?.style.transform).toContain('translateY(0%)');

    // Pointer leave (fires for lifted touch pointers too — no tap latch)
    // releases the state, so the ripple cannot run indefinitely.
    await user.unhover(link);
    expect(container.querySelector('.wb-wave-front')).toBeNull();
    expect(container.querySelector('.wb-wave-back')).toBeNull();
    expect(fill?.style.transform).toContain('translateY(101%)');
  });
});
