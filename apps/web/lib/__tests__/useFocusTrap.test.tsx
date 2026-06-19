import {describe, it, expect, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import {useRef} from 'react';
import {useFocusTrap} from '../useFocusTrap';

function Trap({isOpen}: {isOpen: boolean}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isOpen);
  return (
    <div>
      <button data-testid="outside">outside</button>
      {isOpen && (
        <div ref={ref} data-testid="trap">
          <button>first</button>
          <button>mid</button>
          <button>last</button>
        </div>
      )}
    </div>
  );
}

afterEach(cleanup);

describe('useFocusTrap', () => {
  it('moves focus to the first focusable element when opened', () => {
    render(<Trap isOpen />);
    expect(document.activeElement).toBe(screen.getByText('first'));
  });

  it('wraps Tab from the last element back to the first', () => {
    render(<Trap isOpen />);
    screen.getByText('last').focus();
    fireEvent.keyDown(document, {key: 'Tab'});
    expect(document.activeElement).toBe(screen.getByText('first'));
  });

  it('wraps Shift+Tab from the first element back to the last', () => {
    render(<Trap isOpen />);
    screen.getByText('first').focus();
    fireEvent.keyDown(document, {key: 'Tab', shiftKey: true});
    expect(document.activeElement).toBe(screen.getByText('last'));
  });

  it('pulls focus back into the container when it has escaped', () => {
    render(<Trap isOpen />);
    screen.getByTestId('outside').focus();
    fireEvent.keyDown(document, {key: 'Tab'});
    expect(document.activeElement).toBe(screen.getByText('first'));
  });

  it('does not trap focus while closed', () => {
    render(<Trap isOpen={false} />);
    const outside = screen.getByTestId('outside');
    outside.focus();
    fireEvent.keyDown(document, {key: 'Tab'});
    expect(document.activeElement).toBe(outside);
  });

  it('restores focus to the previously focused element on close', () => {
    const {rerender} = render(<Trap isOpen={false} />);
    const outside = screen.getByTestId('outside');
    outside.focus();
    rerender(<Trap isOpen />);
    expect(document.activeElement).toBe(screen.getByText('first'));
    rerender(<Trap isOpen={false} />);
    expect(document.activeElement).toBe(outside);
  });
});
