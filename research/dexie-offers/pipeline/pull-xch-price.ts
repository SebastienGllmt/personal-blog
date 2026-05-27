// Authoring data pull: the TRUE external XCH/USD price history, daily.
//
// This is the independent counterpart to the offer-flow price *oracle*
// (`pull-dexie-xch-usdc.ts` / finding 03-price-oracle). That oracle is
// reconstructed from settled offers, only starts 2024-05-22, and is API-capped
// on the oldest offers of the busiest pairs. This pulls a real exchange-traded
// reference series so the post can (a) chart XCH's actual price and (b) join a
// trustworthy USD/XCH onto offers by date for USD-denominated analysis.
//
// Source: CryptoCompare's free daily-OHLC endpoint (no API key needed). It is
// the only free source we found with the FULL history — CoinGecko's public API
// caps historical queries at 365 days, Coinpaprika's id didn't resolve. XCH
// daily data begins 2021-06-30 (~$293), which fully covers the offers dataset
// span (2022-01-14 → 2026-05-23) with margin. Sanity cross-check vs. the
// offer-flow oracle: CryptoCompare close ≈ $2.91 (2026-05-25) vs oracle ≈ $2.79
// (May 2026), and ~$10.5 (2025-06) on both — they agree to a few percent.
//
// Run: bun research/dexie-offers/pipeline/pull-xch-price.ts > generated/xch-price-daily.json

const BASE = "https://min-api.cryptocompare.com/data/v2/histoday";
const FSYM = "XCH";
const TSYM = "USD";
const MAX_LIMIT = 2000; // CryptoCompare hard cap per request

interface Row {
  time: number; // unix seconds, UTC midnight
  open: number;
  high: number;
  low: number;
  close: number;
  volumefrom: number; // XCH traded
  volumeto: number; // USD traded
}

async function fetchChunk(toTs: number): Promise<Row[]> {
  const url = `${BASE}?fsym=${FSYM}&tsym=${TSYM}&limit=${MAX_LIMIT}&toTs=${toTs}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url);
    if (r.ok) {
      const j = (await r.json()) as { Response: string; Message?: string; Data?: { Data?: Row[] } };
      if (j.Response === "Success") return j.Data?.Data ?? [];
      process.stderr.write(`  toTs=${toTs}: ${j.Message ?? "non-success body"}\n`);
    } else {
      process.stderr.write(`  toTs=${toTs}: HTTP ${r.status}\n`);
    }
    await Bun.sleep(1500 * 2 ** attempt); // 1.5s,3s,6s,…
  }
  throw new Error(`failed chunk toTs=${toTs}`);
}

// Page BACKWARD through history: each request returns the 2000 days ending at
// `toTs`; we then ask for the days before the earliest we've seen, and stop once
// a chunk is entirely pre-listing (all-zero close) or stops advancing. This is
// future-proof — once XCH's life exceeds 2000 days, one request no longer covers
// it all.
const seen = new Map<number, Row>(); // dedup by day (chunks overlap by 1 at the seam)
let toTs = Math.floor(Date.now() / 1000);
let prevEarliest = Infinity;
for (let i = 0; i < 20; i++) {
  const rows = await fetchChunk(toTs);
  if (!rows.length) break;
  const real = rows.filter((r) => r.close > 0 || r.high > 0 || r.volumeto > 0);
  for (const r of real) seen.set(r.time, r);
  const earliest = rows[0].time; // CryptoCompare returns ascending
  process.stderr.write(
    `chunk ${i}: ${rows.length} rows (${real.length} real), earliest=${new Date(earliest * 1000).toISOString().slice(0, 10)}, kept=${seen.size}\n`,
  );
  // No real prices in this older chunk → we've passed the listing date.
  if (real.length === 0) break;
  if (earliest >= prevEarliest) break; // not advancing → stop
  prevEarliest = earliest;
  toTs = earliest - 86400; // request the day before the earliest we have
}

const days = [...seen.values()]
  .sort((a, b) => a.time - b.time)
  .map((r) => ({
    d: new Date(r.time * 1000).toISOString().slice(0, 10),
    o: r.open,
    h: r.high,
    l: r.low,
    c: r.close, // daily close — the field downstream analysis should use as USD/XCH
    v: Number(r.volumeto.toFixed(2)), // USD volume traded that day (across exchanges)
  }));

process.stderr.write(
  `${days.length} days, ${days[0]?.d} … ${days[days.length - 1]?.d}\n`,
);
process.stdout.write(
  JSON.stringify({
    source: "cryptocompare histoday (fsym=XCH, tsym=USD)",
    note: "True external XCH/USD daily OHLC+volume. Independent of the offer-flow oracle (finding 03).",
    pair: `${FSYM}/${TSYM}`,
    asOf: days[days.length - 1]?.d ?? null,
    days, // daily {d, o, h, l, c (USD/XCH close), v (USD volume)}
  }),
);
