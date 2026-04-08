// Hardcoded size chart data for women's clothing categories.
// Photos and per-category garment measurements will come later from production manager.
// Values are body measurements in centimeters (not finished-garment measurements).

export interface SizePair {
  intl: string;
  ru: string;
}

export type MeasurementKey =
  | 'bust'
  | 'waist'
  | 'hips'
  | 'length'
  | 'shoulder'
  | 'sleeve';

export interface SizeChartData {
  sizes: SizePair[];
  measurementOrder: MeasurementKey[];
  values: Record<MeasurementKey, number[]>;
}

const BASE_SIZES: SizePair[] = [
  {intl: 'XS', ru: '42'},
  {intl: 'S', ru: '44'},
  {intl: 'M', ru: '46'},
  {intl: 'L', ru: '48'},
  {intl: 'XL', ru: '50'},
  {intl: 'XXL', ru: '52'},
];

// Base body measurements — index aligned with BASE_SIZES (0 = XS/42 ... 5 = XXL/52).
const BASE_VALUES: Record<MeasurementKey, number[]> = {
  bust: [82, 86, 90, 94, 98, 102],
  waist: [62, 66, 70, 74, 78, 82],
  hips: [88, 92, 96, 100, 104, 108],
  length: [100, 100, 100, 102, 102, 104],
  shoulder: [36, 37, 38, 39, 40, 41],
  sleeve: [58, 59, 60, 61, 62, 63],
};

// Which measurement rows to show per category. Keys match `ApiProduct.category`
// values from the backend (`products.categories` in messages).
const CATEGORY_MEASUREMENTS: Record<string, MeasurementKey[]> = {
  dresses: ['bust', 'waist', 'hips', 'length'],
  outerwear: ['bust', 'waist', 'hips', 'length', 'shoulder', 'sleeve'],
  tops: ['bust', 'waist', 'length', 'shoulder', 'sleeve'],
  knitwear: ['bust', 'waist', 'length', 'shoulder', 'sleeve'],
  bottoms: ['waist', 'hips', 'length'],
};

const DEFAULT_MEASUREMENTS: MeasurementKey[] = ['bust', 'waist', 'hips', 'length'];

export function getSizeChart(category: string | null): SizeChartData {
  const order =
    category && CATEGORY_MEASUREMENTS[category]
      ? CATEGORY_MEASUREMENTS[category]
      : DEFAULT_MEASUREMENTS;

  return {
    sizes: BASE_SIZES,
    measurementOrder: order,
    values: BASE_VALUES,
  };
}
