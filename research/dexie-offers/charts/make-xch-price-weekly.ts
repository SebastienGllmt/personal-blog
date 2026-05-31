// Derive the TRUE XCH/USD weekly series, aligned to the offer-flow oracle's
// weeks, for overlaying onto the chart-oracle figure (make-charts.ts §5).
//
// Reads the true daily price (generated/xch-price-daily.json, from
// pull-xch-price.ts) and the oracle's committed weekly CSV (whose `week` column
// is the Monday week-start). For every oracle week it emits the true price as
// the MEDIAN of that week's daily closes — same robust statistic and identical
// week buckets, so the two lines align index-for-index in the chart.
//
// Run: bun research/dexie-offers/charts/make-xch-price-weekly.ts
//   → research/dexie-offers/findings/data/xch-price-weekly.csv (committed)

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
const DATA = join(ROOT, "research", "dexie-offers", "findings", "data");

interface Day { d: string; c: number }
const daily: Day[] = JSON.parse(
  readFileSync(join(ROOT, "generated", "xch-price-daily.json"), "utf8"),
).days;

// UTC Monday (ISO week-start) for a YYYY-MM-DD, matching the oracle CSV's `week`.
function monday(ymd: string): string {
  const t = new Date(ymd + "T00:00:00Z");
  const dow = (t.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  t.setUTCDate(t.getUTCDate() - dow);
  return t.toISOString().slice(0, 10);
}
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

const byWeek = new Map<string, number[]>();
for (const r of daily) {
  if (!(r.c > 0)) continue;
  const w = monday(r.d);
  (byWeek.get(w) ?? byWeek.set(w, []).get(w)!).push(r.c);
}

// Emit only the weeks the oracle CSV has, in its order → index-aligned overlay.
const oracleWeeks = readFileSync(join(DATA, "03-price-oracle-weekly.csv"), "utf8")
  .trim().split("\n").slice(1).map((l) => l.split(",")[0]!);

const out = ["week,usd_per_xch"];
let n = 0;
for (const w of oracleWeeks) {
  const xs = byWeek.get(w);
  out.push(`${w},${xs && xs.length ? median(xs).toFixed(4) : ""}`);
  if (xs && xs.length) n++;
}
writeFileSync(join(DATA, "xch-price-weekly.csv"), out.join("\n") + "\n");
console.log(`wrote xch-price-weekly.csv: ${oracleWeeks.length} weeks (${n} with data)`);
