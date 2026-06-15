// Interactive latency figure for posts/offer-files.html (Performance → Latency).
// A swap's wall-clock = proof generation + a Celestia block wait + a Midnight
// block wait. Each block wait ranges from ~0 (you catch a block the instant it
// is produced — best case) to a full block (you just missed one — worst case),
// averaging about half. A 3-stop slider (best · average · worst) scales the two
// block segments so the reader can see how much of the latency is the avoidable
// block wait. Proof generation is fixed at a native-prover ~1s baseline.
//
// External module for the production CSP (it only sets SVG geometry attributes
// and textContent). Progressive enhancement: the static SVG is baked at the
// worst case, which is also the slider's default, so there is no load-time jump.

const PPS = 38;     // px per second
const X0 = 110;     // axis origin x
const PROOF_S = 1;  // proof seconds (native prover)

const root = document.getElementById("latency-figure");
if (root) initLatency(root);

function initLatency(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>("[data-latency-slider]");
  const label = root.querySelector<HTMLElement>("[data-latency-label]");
  if (!slider) return;

  const el = (id: string) => root.querySelector<SVGElement>("#" + id);
  const cel = el("lat-cel"), mid1 = el("lat-mid1"), mid2 = el("lat-mid2");
  const celLbl = el("lat-cel-lbl"), mid1Lbl = el("lat-mid1-lbl"), mid2Lbl = el("lat-mid2-lbl");
  const total1 = el("lat-total1"), total2 = el("lat-total2");

  const STATES = ["best case", "average", "worst case"];
  const fmt = (s: number) => "~" + (Number.isInteger(s) ? String(s) : s.toFixed(1)) + "s";

  function seg(rect: SVGElement | null, lbl: SVGElement | null, x: number, w: number): void {
    if (rect) { rect.setAttribute("x", String(x)); rect.setAttribute("width", String(Math.max(0, w))); }
    if (lbl) { lbl.setAttribute("x", String(x + w / 2)); lbl.style.display = w > 42 ? "" : "none"; }
  }

  function render(): void {
    const v = parseInt(slider!.value, 10);   // 0 best, 1 average, 2 worst
    const f = v / 2;                          // block-wait fraction
    if (label) label.textContent = STATES[v] ?? "";
    const proofW = PROOF_S * PPS;
    // bar 1: proof + Celestia (3s) + Midnight (6s)
    const celX = X0 + proofW, celW = 3 * PPS * f;
    const mid1X = celX + celW, mid1W = 6 * PPS * f;
    seg(cel, celLbl, celX, celW);
    seg(mid1, mid1Lbl, mid1X, mid1W);
    if (total1) { total1.setAttribute("x", String(mid1X + mid1W + 4)); total1.textContent = fmt(PROOF_S + 9 * f); }
    // bar 2: proof + Midnight (6s)
    const m2X = X0 + proofW, m2W = 6 * PPS * f;
    seg(mid2, mid2Lbl, m2X, m2W);
    if (total2) { total2.setAttribute("x", String(m2X + m2W + 4)); total2.textContent = fmt(PROOF_S + 6 * f); }
  }

  slider.addEventListener("input", render);
  render();
}
