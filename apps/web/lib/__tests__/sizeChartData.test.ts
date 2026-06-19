import {describe, it, expect} from 'vitest';
import {getSizeChart, type MeasurementKey} from '../sizeChartData';

describe('getSizeChart', () => {
  it('maps known categories to their measurement rows', () => {
    expect(getSizeChart('dresses').measurementOrder).toEqual(['bust', 'waist', 'hips', 'length']);
    expect(getSizeChart('outerwear').measurementOrder).toEqual([
      'bust', 'waist', 'hips', 'length', 'shoulder', 'sleeve',
    ]);
    expect(getSizeChart('bottoms').measurementOrder).toEqual(['waist', 'hips', 'length']);
  });

  it('falls back to the default rows for null / unknown / empty category', () => {
    const def: MeasurementKey[] = ['bust', 'waist', 'hips', 'length'];
    expect(getSizeChart(null).measurementOrder).toEqual(def);
    expect(getSizeChart('does-not-exist').measurementOrder).toEqual(def);
    expect(getSizeChart('').measurementOrder).toEqual(def);
  });

  it('always exposes the 6 base sizes (intl + ru) regardless of category', () => {
    for (const cat of ['dresses', 'bottoms', null, 'unknown']) {
      const chart = getSizeChart(cat);
      expect(chart.sizes).toHaveLength(6);
      expect(chart.sizes[0]).toEqual({intl: 'XS', ru: '42'});
      expect(chart.sizes.at(-1)).toEqual({intl: 'XXL', ru: '52'});
    }
  });

  it('has a values row aligned to the size count for every measurement shown', () => {
    const chart = getSizeChart('outerwear');
    for (const key of chart.measurementOrder) {
      expect(chart.values[key]).toHaveLength(chart.sizes.length);
    }
  });

  it('keeps body measurements non-decreasing as size grows (data integrity)', () => {
    const {values} = getSizeChart('outerwear');
    for (const key of ['bust', 'waist', 'hips'] as const) {
      const row = values[key];
      for (let i = 1; i < row.length; i++) {
        expect(row[i]).toBeGreaterThanOrEqual(row[i - 1]!);
      }
    }
  });
});
