import {describe, it, expect, afterEach} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DateField, SelectField, TextField} from '../EditorFields';

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
