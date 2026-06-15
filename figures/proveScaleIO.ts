// Interactive "prove time vs UTXO count" table for posts/offer-files.html
// (Performance section). A swap spends some input UTXOs — one `spend` circuit
// each — and creates some output UTXOs — one `output` circuit each — so its
// total prove cost is N × spend + M × output. The reader drags two sliders
// (inputs 1..18, outputs 1..18) and each platform row recomputes its wall-clock
// total, recoloured on the same log heat-ramp as the reference table.
//
// Base per-circuit times come from the reference table (data-* on each row, in
// seconds): spend is k=15, output is k=14 (SHA-256 today — the cryptography swap
// is a separate, later section, so this widget shows the cost as it stands).
//
// External module for the production CSP (`script-src 'self'`); it only sets
// element.style (CSSOM), which CSP does not govern — same rule the figures rely
// on. Progressive enhancement: with no JS the table shows the 1-in/1-out case
// baked into the markup. The colour ramp matches proveBenchmark.css (log domain
// 10 ms … 100 s; green→yellow→orange→red); values past 100 s clamp to the red end.

const LOG_MIN = -2; // 10 ms
const LOG_MAX = 2;  // 100 s
const STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.0, c: [217, 240, 211] }, // #d9f0d3 green
  { t: 0.5, c: [245, 240, 184] }, // #f5f0b8 yellow
  { t: 0.75, c: [247, 220, 192] }, // #f7dcc0 orange
  { t: 1.0, c: [246, 206, 201] }, // #f6cec9 red
];

function colorAt(sec: number): string {
  const t = Math.min(1, Math.max(0, (Math.log10(sec) - LOG_MIN) / (LOG_MAX - LOG_MIN)));
  let i = 0;
  while (i < STOPS.length - 2 && t > STOPS[i + 1]!.t) i++;
  const a = STOPS[i]!, b = STOPS[i + 1]!;
  const u = (t - a.t) / (b.t - a.t);
  const c = a.c.map((av, k) => Math.round(av + (b.c[k]! - av) * u));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function fmt(sec: number): string {
  if (sec < 1) return `~${Math.round(sec * 1000)}<span class="u">ms</span>`;
  if (sec < 60) {
    const v = sec < 10 ? sec.toFixed(1) : String(Math.round(sec));
    return `~${v}<span class="u">s</span>`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `~${m}<span class="u">m</span>&#8201;${s}<span class="u">s</span>`;
}

const root = document.querySelector<HTMLElement>("[data-provescale-io]");
if (root) initProveScaleIO(root);

function initProveScaleIO(root: HTMLElement): void {
  const sliderIn = root.querySelector<HTMLInputElement>("[data-slider-in]");
  const sliderOut = root.querySelector<HTMLInputElement>("[data-slider-out]");
  const nInOut = root.querySelector<HTMLElement>("[data-n-in]");
  const nOutOut = root.querySelector<HTMLElement>("[data-n-out]");
  const formula = root.querySelector<HTMLElement>("[data-formula]");
  const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));
  if (!sliderIn || !sliderOut || !nInOut || !nOutOut || !formula) return;

  function render(): void {
    const N = parseInt(sliderIn!.value, 10);
    const M = parseInt(sliderOut!.value, 10);
    nInOut!.textContent = String(N);
    nOutOut!.textContent = String(M);
    formula!.innerHTML = `cost = ${N}&times;spend + ${M}&times;output`;
    for (const r of rows) {
      const k15 = Number(r.dataset.k15), k14 = Number(r.dataset.k14);
      const cost = N * k15 + M * k14;
      const costEl = r.querySelector<HTMLElement>("[data-cost]")!;
      // Drop the static bench-* class so the live (continuous) colour governs.
      costEl.className = "";
      costEl.innerHTML = fmt(cost);
      costEl.style.background = colorAt(cost);
    }
  }

  sliderIn.addEventListener("input", render);
  sliderOut.addEventListener("input", render);
  root.classList.add("provescale-on");
  render();
}
