// Interactive "prove time vs number of inputs" table for posts/offer-files.html
// (Scaling part 4). A swap spends some input UTXOs — one `spend` circuit each —
// and makes one output (one `output` circuit), so its total prove cost is
// N × spend + 1 × output. The reader drags a slider for N (1..18) and each
// platform row recomputes its SHA-256 and Poseidon1 wall-clock totals, recoloured
// on the same log heat-ramp as the reference table.
//
// Base per-circuit times come from the reference table (data-* on each row, in
// seconds): SHA-256 uses spend k=15 / output k=14; Poseidon1 uses k=13 / k=12.
//
// External module for the production CSP (`script-src 'self'`); it only sets
// element.style (CSSOM), which CSP does not govern — same rule the figures rely
// on. Progressive enhancement: with no JS the table shows the 2-input case baked
// into the markup. The colour ramp matches proveBenchmark.css (log domain
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

const root = document.querySelector<HTMLElement>("[data-provescale]");
if (root) initProveScale(root);

function initProveScale(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>("[data-slider]");
  const nOut = root.querySelector<HTMLElement>("[data-n]");
  const formula = root.querySelector<HTMLElement>("[data-formula]");
  const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));
  if (!slider || !nOut || !formula) return;

  function render(): void {
    const N = parseInt(slider!.value, 10);
    nOut!.textContent = String(N);
    formula!.innerHTML = `cost = ${N}&times;spend + 1&times;output`;
    for (const r of rows) {
      const k15 = Number(r.dataset.k15), k14 = Number(r.dataset.k14);
      const k13 = Number(r.dataset.k13), k12 = Number(r.dataset.k12);
      const sha = N * k15 + k14;
      const pos = N * k13 + k12;
      const shaEl = r.querySelector<HTMLElement>("[data-sha]")!;
      const posEl = r.querySelector<HTMLElement>("[data-pos]")!;
      const spEl = r.querySelector<HTMLElement>("[data-sp]")!;
      // Drop the static bench-* class so the live (continuous) colour governs.
      shaEl.className = "";
      posEl.className = "";
      shaEl.innerHTML = fmt(sha);
      posEl.innerHTML = fmt(pos);
      shaEl.style.background = colorAt(sha);
      posEl.style.background = colorAt(pos);
      spEl.innerHTML = `${(sha / pos).toFixed(1)}&times;`;
    }
  }

  slider.addEventListener("input", render);
  root.classList.add("provescale-on");
  render();
}
