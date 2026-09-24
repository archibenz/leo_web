'use client';

import {useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {HAIR, INK, MUTED} from '../../wv-palette';
import {MEASUREMENT_KINDS, type ProductMeasurement} from '../../../../lib/catalogue/types';

// Замеры ИЗДЕЛИЯ по размерам модели (п. 15, решение 24.09): длина, ширина по
// груди и т. д. — то, что владелец меряет на самой вещи. Прежняя таблица была
// одна на все вещи и выдумана («Demo measurements») — её сняли в #86. Здесь
// только то, что владелец заполнил: нет мерок — нет ни кнопки, ни таблицы;
// строки — размеры, у которых есть хоть одна мерка; столбцы — заполненные мерки.

export default function PdpMeasurements({
  sizes,
  measurements,
}: {
  sizes: readonly string[];
  measurements: readonly ProductMeasurement[] | undefined;
}) {
  const t = useTranslations('white.pdp');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const rows = MEASUREMENT_KINDS.map((kind) => measurements?.find((m) => m.kind === kind)).filter(
    (m): m is ProductMeasurement => Boolean(m && Object.keys(m.values).length),
  );
  const shownSizes = sizes.filter((size) => rows.some((m) => m.values[size] != null));
  if (!rows.length || !shownSizes.length) return null;

  const format = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {maximumFractionDigits: 1});

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="wv-measurements"
        className="-my-3.5 py-3.5 text-[11px] uppercase tracking-[0.16em]"
        style={{color: MUTED}}
      >
        {t('measurements')}
      </button>
      <div id="wv-measurements" hidden={!open} className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <caption className="caption-bottom pt-2 text-left text-[11px]" style={{color: MUTED}}>
            {t('measurementsCaption')}
          </caption>
          <thead>
            <tr style={{color: MUTED}}>
              <th scope="col" className="border-b py-2 pr-3 text-left font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>
                {t('size')}
              </th>
              {rows.map((m) => (
                <th key={m.kind} scope="col" className="border-b px-2 py-2 text-right font-normal" style={{borderColor: HAIR}}>
                  {t(`measurementKinds.${m.kind}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownSizes.map((size) => (
              <tr key={size}>
                <th scope="row" className="border-b py-2 pr-3 text-left font-medium" style={{borderColor: HAIR, color: INK}}>
                  {size}
                </th>
                {rows.map((m) => (
                  <td key={m.kind} className="border-b px-2 py-2 text-right tabular-nums" style={{borderColor: HAIR}}>
                    {m.values[size] != null ? format.format(m.values[size]!) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
