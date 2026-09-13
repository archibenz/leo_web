import {describe, it, expect, afterEach, vi} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const uploadMedia = vi.fn();
vi.mock('../editorApi', () => ({uploadMedia: (...args: unknown[]) => uploadMedia(...args)}));

import {EditorButton, MediaField, MediaPairField, MediaThumb} from '../EditorFields';

afterEach(cleanup);

// Владелец увидел галерею строками адресов и сказал «сделай просто» — эти
// тесты держат ровно то место, где адрес мог бы снова стать главным, что
// видно: кадр обязан быть картинкой, адрес — мелкой подписью под ней.

describe('MediaThumb', () => {
  it('картинка рисуется <img>, а не текстом адреса', () => {
    render(<MediaThumb src="/uploads/products/a.jpg" kind="image" alt="Главный снимок" />);
    const img = screen.getByRole('img', {name: 'Главный снимок'});
    expect(img).toHaveAttribute('src', '/uploads/products/a.jpg');
  });

  it('без адреса — заметная заглушка, а не пустое место и не img с пустым src', () => {
    render(<MediaThumb src="" kind="image" alt="Главный снимок" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/нет кадра/i)).toBeInTheDocument();
  });
});

describe('EditorButton', () => {
  it('по умолчанию — прежний размер, ничего не выросло у существующих кнопок', () => {
    render(<EditorButton onClick={() => {}}>Сохранить</EditorButton>);
    expect(screen.getByRole('button', {name: 'Сохранить'}).className).not.toMatch(/min-h-\[44px\]/);
  });

  it('size="touch" — зона нажатия от 44px и кегль от 13px, как того требует правка с телефона', () => {
    render(
      <EditorButton onClick={() => {}} size="touch">
        Вверх
      </EditorButton>,
    );
    const button = screen.getByRole('button', {name: 'Вверх'});
    expect(button.className).toMatch(/min-h-\[44px\]/);
    expect(button.className).toMatch(/text-\[13px\]/);
  });
});

describe('MediaField', () => {
  it('показывает кадр картинкой; адрес остаётся, но мелким и не вместо кадра', () => {
    render(<MediaField label="Главный снимок" value="/uploads/products/a.jpg" kind="image" onChange={() => {}} />);

    expect(screen.getByRole('img', {name: 'Главный снимок'})).toHaveAttribute('src', '/uploads/products/a.jpg');
    const caption = screen.getByText('/uploads/products/a.jpg');
    expect(caption.className).toMatch(/text-\[11px\]/);
  });

  it('«Заменить» и «Убрать» — зоны нажатия от 44px', () => {
    render(<MediaField label="Главный снимок" value="/uploads/products/a.jpg" kind="image" onChange={() => {}} />);

    expect(screen.getByRole('button', {name: 'Заменить'}).className).toMatch(/min-h-\[44px\]/);
    expect(screen.getByRole('button', {name: 'Убрать'}).className).toMatch(/min-h-\[44px\]/);
  });

  it('без значения — «Убрать» не показан, заглушка вместо кадра', () => {
    render(<MediaField label="Главный снимок" value={undefined} kind="image" onChange={() => {}} />);

    expect(screen.queryByRole('button', {name: 'Убрать'})).not.toBeInTheDocument();
    expect(screen.getByText(/нет кадра/i)).toBeInTheDocument();
  });

  it('замена файла всё ещё идёт через uploadMedia и зовёт onChange с новым адресом', async () => {
    uploadMedia.mockResolvedValue('/uploads/products/new.jpg');
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MediaField label="Главный снимок" value="/uploads/products/a.jpg" kind="image" onChange={onChange} />);

    const file = new File(['x'], 'a.jpg', {type: 'image/jpeg'});
    await user.upload(screen.getByLabelText('Главный снимок'), file);

    expect(uploadMedia).toHaveBeenCalledWith(file, 'image');
    expect(onChange).toHaveBeenCalledWith('/uploads/products/new.jpg');
  });
});

describe('MediaPairField', () => {
  it('телефон и десктоп — рядом и подписаны, а не два одинаковых поля без объяснения', () => {
    render(
      <MediaPairField
        label="Кадр"
        kind="image"
        phone={{value: '/images/white/hero-m.jpg', onChange: () => {}}}
        desktop={{value: '/images/white/hero-d.jpg', onChange: () => {}}}
      />,
    );

    expect(screen.getByRole('img', {name: 'Телефон'})).toHaveAttribute('src', '/images/white/hero-m.jpg');
    expect(screen.getByRole('img', {name: 'Десктоп'})).toHaveAttribute('src', '/images/white/hero-d.jpg');
  });

  it('каждая половина пары зовёт свой onChange, не путая телефон с десктопом', async () => {
    uploadMedia.mockResolvedValue('/images/white/hero-d2.jpg');
    const user = userEvent.setup();
    const onPhoneChange = vi.fn();
    const onDesktopChange = vi.fn();
    render(
      <MediaPairField
        label="Кадр"
        kind="image"
        phone={{value: '/images/white/hero-m.jpg', onChange: onPhoneChange}}
        desktop={{value: '/images/white/hero-d.jpg', onChange: onDesktopChange}}
      />,
    );

    const file = new File(['x'], 'd2.jpg', {type: 'image/jpeg'});
    await user.upload(screen.getByLabelText('Десктоп'), file);

    expect(onDesktopChange).toHaveBeenCalledWith('/images/white/hero-d2.jpg');
    expect(onPhoneChange).not.toHaveBeenCalled();
  });
});
