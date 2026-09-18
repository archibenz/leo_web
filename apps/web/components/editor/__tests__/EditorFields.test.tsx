import {describe, it, expect, afterEach, vi} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const uploadMedia = vi.fn();
vi.mock('../editorApi', () => ({uploadMedia: (...args: unknown[]) => uploadMedia(...args)}));

import {DateField, EditorButton, MediaField, MediaPairField, MediaThumb, SelectField, TextField} from '../EditorFields';

afterEach(cleanup);

describe('TextField — поле с ошибкой у самого себя, не общей плашкой', () => {
  it('без error — ничего лишнего не рисует', () => {
    render(<TextField label="Текст" value="" onChange={() => {}} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('с error — текст виден рядом с полем и помечен role=alert', () => {
    render(<TextField label="Текст" value="" onChange={() => {}} error="Заполните текст строки." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Заполните текст строки.');
    expect(screen.getByLabelText('Текст')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('DateField — дата по-русски, не трогая сам выбор даты', () => {
  it('пусто — читаемой подписи с датой нет вовсе', () => {
    render(<DateField label="Показывать до" value={null} onChange={() => {}} />);
    expect(screen.queryByText(/\d{4}/)).not.toBeInTheDocument();
  });

  it('заполненная дата выводится по-русски (родительный падеж месяца), а не «Sep 22, 2026»', () => {
    render(<DateField label="Показывать до" value="2026-09-22" onChange={() => {}} />);
    expect(screen.getByText('22 сентября 2026 г.')).toBeInTheDocument();
    expect(screen.queryByText(/Sep/)).not.toBeInTheDocument();
  });

  it('первое января — тоже по-русски (граница года, не только «типичный» месяц)', () => {
    render(<DateField label="Показывать до" value="2026-01-05" onChange={() => {}} />);
    expect(screen.getByText('5 января 2026 г.')).toBeInTheDocument();
  });

  it('с error — текст виден рядом с полем', () => {
    render(<DateField label="Показывать до" value={null} onChange={() => {}} error="Дата должна быть в формате ГГГГ-ММ-ДД." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Дата должна быть в формате ГГГГ-ММ-ДД.');
  });
});

describe('SelectField — новый примитив под «Куда ведёт»', () => {
  const OPTIONS = [
    {value: 'none', label: 'Без ссылки'},
    {value: 'shop', label: 'Магазин'},
  ];

  it('рисует подписанный select с переданными опциями и текущим значением', () => {
    render(<SelectField label="Куда ведёт" value="shop" onChange={() => {}} options={OPTIONS} />);
    const select = screen.getByLabelText('Куда ведёт') as HTMLSelectElement;
    expect(select).toHaveValue('shop');
    expect(screen.getByRole('option', {name: 'Без ссылки'})).toBeInTheDocument();
    expect(screen.getByRole('option', {name: 'Магазин'})).toBeInTheDocument();
  });

  it('выбор пальцем/мышью зовёт onChange с value выбранной опции', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<SelectField label="Куда ведёт" value="none" onChange={(v) => calls.push(v)} options={OPTIONS} />);

    await user.selectOptions(screen.getByLabelText('Куда ведёт'), 'shop');

    expect(calls).toEqual(['shop']);
  });

  it('зона нажатия не мельче 44×44 — тот самый список, который владелец не смог открыть пальцем', () => {
    render(<SelectField label="Куда ведёт" value="none" onChange={() => {}} options={OPTIONS} />);
    // min-h-11 = 2.75rem = 44px в Tailwind-шкале этого проекта (см. WhiteLocaleSwitch.tsx).
    expect(screen.getByLabelText('Куда ведёт').className).toMatch(/min-h-11/);
  });

  it('с error — текст виден рядом с полем', () => {
    render(<SelectField label="Куда ведёт" value="none" onChange={() => {}} options={OPTIONS} error="Выберите из списка." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Выберите из списка.');
  });
});

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

// Порог ищется по НАБОРУ написаний, а не по одному: 44px в этом проекте
// пишут и как min-h-11 (шкала Tailwind), и как min-h-[44px] (произвольное
// значение). Тест, приколотый к одному написанию, краснеет на переименовании
// и — хуже — ЗЕЛЕНЕЕТ на подмене смысла: пока здесь стоял
// not.toMatch(/min-h-\[44px\]/), проверка «кнопка по умолчанию маленькая»
// продолжала проходить и после того, как кнопка стала 44px.
const ПОРОГ_44 = /min-h-(11|12|\[44px\])/;

describe('EditorButton', () => {
  it('единственный размер — 44px и кегль 13, выбора «помельче» нет', () => {
    render(<EditorButton onClick={() => {}}>Сохранить</EditorButton>);

    // До 15.09 у кнопки было два размера, и по умолчанию она выходила 35px:
    // порог применили к кадрам галереи и не применили к соседним панелям.
    // Умолчание и есть то место, где правило либо держится, либо нет.
    const button = screen.getByRole('button', {name: 'Сохранить'});
    expect(button.className).toMatch(ПОРОГ_44);
    expect(button.className).toMatch(/text-\[13px\]/);
  });
});

describe('MediaField', () => {
  it('показывает кадр картинкой; адрес остаётся, но мелким и не вместо кадра', () => {
    render(<MediaField label="Главный снимок" value="/uploads/products/a.jpg" kind="image" onChange={() => {}} />);

    expect(screen.getByRole('img', {name: 'Главный снимок'})).toHaveAttribute('src', '/uploads/products/a.jpg');

    // Подпись собрана из двух частей — усыхающей папки и неприкосновенного
    // имени файла (см. MediaField: многоточие с конца съедало ровно имя, и
    // владелец не мог понять, какой файл стоит). Поэтому утверждаем ЦЕЛОЕ:
    // адрес обязан читаться полностью, как бы он ни был разбит на узлы.
    const caption = document.querySelector('[data-media-path]');
    expect(caption, 'подписи пути нет вовсе').not.toBeNull();
    expect(caption!.textContent).toBe('/uploads/products/a.jpg');
    expect(caption!.className).toMatch(/text-\[11px\]/);
    // Имя файла не имеет права ужиматься — на длинном имени иначе исчезнет
    // именно оно. Папке ужиматься можно и нужно.
    expect(caption!.lastElementChild?.className).toMatch(/shrink-0/);
    expect(caption!.firstElementChild?.className).toMatch(/truncate/);
  });

  it('«Заменить» и «Убрать» — зоны нажатия от 44px', () => {
    render(<MediaField label="Главный снимок" value="/uploads/products/a.jpg" kind="image" onChange={() => {}} />);

    expect(screen.getByRole('button', {name: 'Заменить'}).className).toMatch(ПОРОГ_44);
    expect(screen.getByRole('button', {name: 'Убрать'}).className).toMatch(ПОРОГ_44);
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
