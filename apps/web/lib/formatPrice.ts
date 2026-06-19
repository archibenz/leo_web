// Canonical price formatter. Prices are stored as integer roubles and the
// Product JSON-LD declares `priceCurrency: 'RUB'`, so every visible price must
// render as ₽ — not the € symbol that several views hard-coded by mistake.
export function formatPrice(locale: string, price: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price);
}
