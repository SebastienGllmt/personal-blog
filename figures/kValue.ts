// "k value" figure for posts/offer-files.html (Scaling, part 4).
//
// The L2 controls its own cryptography, so it can keep the offer-file shape
// byte-for-byte identical while swapping the hash function the zSwap circuits
// use. SHA-256 is the dominant cost; switching to a ZK-friendly hash like
// Poseidon1 drops each circuit's `k` by two steps.
//
// The figure is a PLOT, not a bar chart, because the thing worth feeling is the
// EXPONENTIAL relationship: x-axis = k, y-axis = circuit size = 2^k rows (linear
// scale). The curve is therefore a hockey-stick — each +1 to k DOUBLES the
// height — which is exactly the intuition. Two markers ride the curve:
//   spend  — k=15 (SHA-256) → k=13 (Poseidon1); one circuit per UTXO consumed.
//   output — k=14 (SHA-256) → k=12 (Poseidon1); one circuit per UTXO created.
// Sliding two steps left visibly plunges down the curve to ~¼ the size (≈4×
// cheaper to prove), which a bar chart of k (or even of 2^k) couldn't convey.
//
// NOTE: the circuit names, k values, and the SHA-256→Poseidon1 drop are taken
// from the author's editorial notes on this post, not independently re-derived.
//
// Enhancement contract (see offerMerge.ts / offerVolume.ts): progressive
// enhancement over a static SVG, narration-synced, reduced-motion aware,
// external module for the production CSP (GSAP only writes CSSOM / SVG attrs).
// Registers a FigureJourney (sha256 → poseidon1) so the narrator and the offline
// video renderer drive the same animation. It does NOT loop: the live page plays
// the slide once on reveal and then holds, and any interaction freezes it.
import { gsap } from "gsap";
import { registerFigureJourney, stepsFromLabels } from "../engine/client/figureAnimation.ts";

const NS = "http://www.w3.org/2000/svg";

type Hash = "sha256" | "poseidon1";
const K: Record<Hash, { spend: number; output: number }> = {
  sha256: { spend: 15, output: 14 },
  poseidon1: { spend: 13, output: 12 },
};

// Plot geometry. x ∈ [KMIN, KMAX]; y ∈ [0, 2^KMAX] (linear, so 2^k is a curve).
// x starts at 0 (not a truncated axis): the flat-then-explode shape IS the point.
const KMIN = 0;
const KMAX = 16;
const MAXSIZE = Math.pow(2, KMAX);
const W = 520;
const H = 290;
const PAD = { l: 60, r: 18, t: 18, b: 46 };
const PLOTW = W - PAD.l - PAD.r;
const PLOTH = H - PAD.t - PAD.b;
const xFor = (k: number): number => PAD.l + ((k - KMIN) / (KMAX - KMIN)) * PLOTW;
const yFor = (size: number): number => PAD.t + (1 - size / MAXSIZE) * PLOTH;
const BASE_Y = PAD.t + PLOTH;

const SUP: Record<number, string> = { 12: "¹²", 13: "¹³", 14: "¹⁴", 15: "¹⁵", 16: "¹⁶" };

const READOUT: Record<Hash, string> = {
  sha256:
    "With <b>SHA-256</b> the two circuits sit high on the curve: <b>spend</b> at <code>k=15</code>, <b>output</b> at <code>k=14</code>. Because circuit size is <code>2^k</code>, every step right <b>doubles</b> the height - SHA-256 is the dominant cost in a zSwap.",
  poseidon1:
    "Swap in <b>Poseidon1</b> and each circuit slides <b>two steps left</b> - spend 15&rarr;13, output 14&rarr;12. On an exponential curve, two steps down is about <b>¼ the size</b>, i.e. roughly <b>4&times; cheaper</b> to prove. The offer-file format never changed.",
};

function el(name: string, attrs: Record<string, string | number> = {}): SVGElement {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

const fig = document.getElementById("kvalue-figure");
if (fig) initKValue(fig);

function initKValue(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "kv-fig";
  stage.dataset.hash = "sha256";
  stage.innerHTML = `
    <div class="kv-cap">same offer-file shape, cheaper cryptography underneath</div>
    <div class="kv-switch" role="group" aria-label="hash function">
      <button type="button" data-hash="sha256" aria-pressed="true">SHA-256 (today)</button>
      <button type="button" data-hash="poseidon1" aria-pressed="false">Poseidon1</button>
    </div>
    <div class="kv-plot" data-plot></div>
    <p class="kv-readout" data-readout></p>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("kv-enhanced");

  const plotBox = stage.querySelector<HTMLElement>("[data-plot]")!;
  const readout = stage.querySelector<HTMLElement>("[data-readout]")!;
  const btns = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-hash]"));

  // ---- build the static chrome (axes, gridlines, curve) once -----------------
  const svg = el("svg", {
    viewBox: `0 0 ${W} ${H}`,
    class: "kv-svg",
    role: "img",
  });
  svg.setAttribute(
    "aria-label",
    "Circuit size grows as 2 to the power k, an exponential curve. With SHA-256 the spend circuit is k=15 and output is k=14, high on the curve; switching to Poseidon1 slides them two steps left to k=13 and k=12, about a quarter of the size and roughly four times cheaper to prove.",
  );

  // y gridlines at powers of two — their linear spacing (each half the previous)
  // is itself the "doubling" lesson.
  for (const p of [14, 15, 16]) {
    const yy = yFor(Math.pow(2, p));
    svg.appendChild(el("line", { x1: PAD.l, y1: yy, x2: W - PAD.r, y2: yy, class: "kv-grid" }));
    const t = el("text", { x: PAD.l - 8, y: yy + 4, class: "kv-ytick", "text-anchor": "end" });
    t.textContent = `2${SUP[p]}`;
    svg.appendChild(t);
  }
  // axes
  svg.appendChild(el("line", { x1: PAD.l, y1: PAD.t, x2: PAD.l, y2: BASE_Y, class: "kv-axis" }));
  svg.appendChild(el("line", { x1: PAD.l, y1: BASE_Y, x2: W - PAD.r, y2: BASE_Y, class: "kv-axis" }));
  // x ticks + labels (every 2, so 0..16 isn't crowded)
  for (let k = 0; k <= KMAX; k += 2) {
    const px = xFor(k);
    svg.appendChild(el("line", { x1: px, y1: BASE_Y, x2: px, y2: BASE_Y + 5, class: "kv-axis" }));
    const t = el("text", { x: px, y: BASE_Y + 19, class: "kv-xtick", "text-anchor": "middle" });
    t.textContent = String(k);
    svg.appendChild(t);
  }
  // axis titles
  const yTitle = el("text", { x: PAD.l - 2, y: PAD.t - 6, class: "kv-axtitle", "text-anchor": "start" });
  yTitle.textContent = "circuit size (rows)";
  svg.appendChild(yTitle);
  const xTitle = el("text", { x: PAD.l + PLOTW / 2, y: H - 6, class: "kv-axtitle", "text-anchor": "middle" });
  xTitle.textContent = "k  (circuit size = 2ᵏ rows)";
  svg.appendChild(xTitle);

  // the exponential curve y = 2^k, sampled finely
  let d = "";
  for (let k = KMIN; k <= KMAX + 0.0001; k += 0.05) {
    const kk = Math.min(k, KMAX);
    d += `${d ? "L" : "M"}${xFor(kk).toFixed(2)},${yFor(Math.pow(2, kk)).toFixed(2)}`;
  }
  svg.appendChild(el("path", { d, class: "kv-curve", fill: "none" }));

  // two markers (dot + drop-guide + tag) that ride the curve. Tags are
  // right-aligned to the LEFT of the dot: with x starting at 0 the markers sit
  // in the steep right region, so a left-anchored tag would overflow the plot.
  function marker(cls: string): { dot: SVGElement; guide: SVGElement; tag: SVGElement } {
    const guide = el("line", { class: `kv-guide ${cls}` });
    const dot = el("circle", { r: 6, class: `kv-dot ${cls}` });
    const tag = el("text", { class: `kv-tag ${cls}`, "text-anchor": "end" });
    svg.appendChild(guide);
    svg.appendChild(dot);
    svg.appendChild(tag);
    return { dot, guide, tag };
  }
  const spend = marker("spend");
  const output = marker("output");
  plotBox.appendChild(svg);

  // proxies the journey/interactive tweens animate; placeMarkers projects them
  // onto the curve. Animating k (not raw x/y) keeps the dots ON the curve.
  const spendK = { k: K.sha256.spend };
  const outputK = { k: K.sha256.output };

  function place(m: { dot: SVGElement; guide: SVGElement; tag: SVGElement }, k: number): void {
    const px = xFor(k);
    const py = yFor(Math.pow(2, k));
    m.dot.setAttribute("cx", String(px));
    m.dot.setAttribute("cy", String(py));
    m.guide.setAttribute("x1", String(px));
    m.guide.setAttribute("x2", String(px));
    m.guide.setAttribute("y1", String(py));
    m.guide.setAttribute("y2", String(BASE_Y));
    m.tag.setAttribute("x", String(px - 9));
    m.tag.setAttribute("y", String(py - 9));
  }
  function placeMarkers(): void {
    place(spend, spendK.k);
    place(output, outputK.k);
  }

  // ---- state & drivers -------------------------------------------------------
  let driven = false; // a driver (capture/narrator) owns the figure
  let interacted = false; // the reader has clicked — stop autoplay for good
  const liveTweens: gsap.core.Tween[] = [];
  const track = (tw: gsap.core.Tween): gsap.core.Tween => { liveTweens.push(tw); return tw; };

  function applyDiscrete(hash: Hash): void {
    stage.dataset.hash = hash;
    readout.innerHTML = READOUT[hash];
    btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.hash === hash)));
    spend.tag.textContent = `spend k=${K[hash].spend}`;
    output.tag.textContent = `output k=${K[hash].output}`;
  }

  // Interactive render: discrete state + slide the markers (tracked tweens).
  function render(hash: Hash, animate: boolean): void {
    applyDiscrete(hash);
    if (animate && !reduced) {
      track(gsap.to(spendK, { k: K[hash].spend, duration: 0.6, ease: "power2.inOut", onUpdate: placeMarkers }));
      track(gsap.to(outputK, { k: K[hash].output, duration: 0.6, ease: "power2.inOut", onUpdate: placeMarkers }));
    } else {
      spendK.k = K[hash].spend;
      outputK.k = K[hash].output;
      placeMarkers();
    }
  }

  applyDiscrete("sha256");
  placeMarkers();

  btns.forEach((b) => b.addEventListener("click", () => {
    interacted = true;        // reader took over — no more autoplay
    driven = false;
    tour.pause();             // freeze any in-flight intro (don't reset to 0)
    render(b.dataset.hash as Hash, true);
  }));

  // ---- the journey: SHA-256 → Poseidon1, one paused scrubbable timeline ------
  const tour = gsap.timeline({ paused: true });
  tour.addLabel("sha256", 0);
  tour.call(() => { applyDiscrete("sha256"); spendK.k = K.sha256.spend; outputK.k = K.sha256.output; placeMarkers(); });
  tour.to({}, { duration: 1.7 });
  tour.addLabel("poseidon1");
  tour.call(() => applyDiscrete("poseidon1"));
  tour.to(spendK, { k: K.poseidon1.spend, duration: 0.75, ease: "power2.inOut", onUpdate: placeMarkers, immediateRender: false });
  tour.to(outputK, { k: K.poseidon1.output, duration: 0.75, ease: "power2.inOut", onUpdate: placeMarkers, immediateRender: false }, "<");
  tour.to({}, { duration: 1.9 });

  // Silent reader: play the slide ONCE when scrolled into view, then hold the
  // final frame. No loop (rule: this isn't a looping concept), and interaction
  // or a driver stands it down.
  function playLive(): void {
    if (driven || interacted) return;
    if (reduced) { applyDiscrete("poseidon1"); spendK.k = K.poseidon1.spend; outputK.k = K.poseidon1.output; placeMarkers(); return; }
    tour.play(0);
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
  }, { threshold: 0.3 });
  io.observe(figure);

  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  registerFigureJourney("kvalue-figure", {
    durationMs: tour.duration() * 1000,
    steps: stepsFromLabels(tour.labels, tour.duration()),
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      liveTweens.forEach((t) => t.kill()); // kill live tween INSTANCES, never killTweensOf (rule 14)
      liveTweens.length = 0;
      tour.pause(0);
      applyDiscrete("sha256");
      spendK.k = K.sha256.spend;
      outputK.k = K.sha256.output;
      placeMarkers();
    },
  });
}
