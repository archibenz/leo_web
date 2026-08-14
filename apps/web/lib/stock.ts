import {readFile} from 'node:fs/promises';

// Where each garment can actually be bought, taken from the marketplaces
// themselves rather than assumed. Until this existed the site inferred
// availability from the presence of an article number, which only proved the
// piece had once been listed — a sold-out card kept its nm and kept a "buy on
// Wildberries" button pointing at nothing.
//
// The site does not call the marketplaces. Wildberries rate-limits its
// warehouse report to a few calls a minute and answers 429 to anything more, so
// a page that asked per render would spend its time being refused. A timer on
// the server writes a snapshot (scripts/stock-sync.mjs, every half hour) and
// this reads the file — a few milliseconds, no rate limit, no failure mode that
// takes the shop down with it.
//
// Server-only by construction: called from server components, reads the disk.

const SNAPSHOT_PATH = process.env.STOCK_FILE ?? '/var/lib/reinasleo/stock.json';
const CACHE_MS = 60_000;
// Past this the snapshot is treated as unknown rather than as truth: a timer
// that died a week ago must not keep hiding buttons for stock that has returned.
const STALE_MS = 6 * 60 * 60 * 1000;

export interface StockSnapshot {
  wb: Set<number>;
  ozon: Set<string>;
  /** False when the marketplace could not be read — silence is not "sold out". */
  wbKnown: boolean;
  ozonKnown: boolean;
  updatedAt: string | null;
}

const UNKNOWN: StockSnapshot = {
  wb: new Set(),
  ozon: new Set(),
  wbKnown: false,
  ozonKnown: false,
  updatedAt: null,
};

let cached: {at: number; value: StockSnapshot} | null = null;

interface RawSnapshot {
  updatedAt?: string;
  wb?: {known?: boolean; inStock?: number[]};
  ozon?: {known?: boolean; inStock?: string[]};
}

export async function getStockSnapshot(): Promise<StockSnapshot> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.value;

  let raw: RawSnapshot;
  try {
    raw = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8')) as RawSnapshot;
  } catch {
    // No file yet (a fresh machine, or the timer has never run). Unknown, which
    // leaves every marketplace button where it was.
    cached = {at: now, value: UNKNOWN};
    return UNKNOWN;
  }

  const age = raw.updatedAt ? now - Date.parse(raw.updatedAt) : Number.POSITIVE_INFINITY;
  const fresh = Number.isFinite(age) && age < STALE_MS;

  const value: StockSnapshot = {
    wb: new Set(raw.wb?.inStock ?? []),
    ozon: new Set(raw.ozon?.inStock ?? []),
    wbKnown: Boolean(raw.wb?.known) && fresh,
    ozonKnown: Boolean(raw.ozon?.known) && fresh,
    updatedAt: raw.updatedAt ?? null,
  };
  cached = {at: now, value};
  return value;
}

// The question a page asks: can this article be bought on Wildberries right now?
// An unreadable or stale snapshot answers `true` — with the marketplace silent,
// keeping the button that has always worked beats telling a shopper the piece is
// gone on a guess.
export function wbHasStock(snapshot: StockSnapshot, nm: number | undefined): boolean {
  if (!nm) return false;
  if (!snapshot.wbKnown) return true;
  return snapshot.wb.has(nm);
}
