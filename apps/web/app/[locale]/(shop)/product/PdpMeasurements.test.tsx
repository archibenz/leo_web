import {render, screen, cleanup, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, it, expect} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../../messages/ru.json';
import PdpMeasurements from './PdpMeasurements';

afterEach(cleanup);

function renderRu(props: Parameters<typeof PdpMeasurements>[0]) {
  return render(
    <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
      <PdpMeasurements {...props} />
    </NextIntlClientProvider>,
  );
}

describe('PdpMeasurements — замеры изделия на карточке', () => {
  it('нет мерок — нет ни кнопки, ни таблицы', () => {
    const {container} = renderRu({sizes: ['S', 'M'], measurements: undefined});
    expect(container).toBeEmptyDOMElement();
    cleanup();
    const again = renderRu({sizes: ['S', 'M'], measurements: []});
    expect(again.container).toBeEmptyDOMElement();
  });

  it('только заполненное: строки — размеры с мерками, столбцы — заполненные мерки', async () => {
    const user = userEvent.setup();
    renderRu({
      sizes: ['XS', 'S', 'M', 'L'],
      measurements: [
        {kind: 'length', values: {S: 110, M: 111}},
        {kind: 'chest', values: {S: 46, M: 48.5}},
      ],
    });

    await user.click(screen.getByRole('button', {name: 'Замеры изделия'}));
    const table = screen.getByRole('table', {name: 'Замеры изделия, см'});
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    // порядок столбцов — канонический (длина, грудь…), а не порядок в данных
    expect(headers).toEqual(['Размер', 'Длина изделия', 'Ширина по груди']);
    const rows = within(table).getAllByRole('rowheader').map((h) => h.textContent);
    expect(rows).toEqual(['S', 'M']); // XS и L без мерок — строк нет
    expect(within(table).getByText('48,5')).toBeInTheDocument();
  });

  it('пустая клетка — прочерк, а не ноль', async () => {
    const user = userEvent.setup();
    renderRu({sizes: ['S', 'M'], measurements: [{kind: 'chest', values: {S: 46}}, {kind: 'sleeve', values: {M: 60}}]});

    await user.click(screen.getByRole('button', {name: 'Замеры изделия'}));
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
