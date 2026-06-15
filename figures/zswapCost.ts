// "zSwap cost = a count of coins" figure for posts/offer-files.html (Scaling, part 4).
//
// A zSwap offer is built from two main circuits — spend (one per UTXO consumed)
// and output (one per UTXO created). Each coin holds exactly one token, so the
// proving cost of a swap is simply a count of the coins moving in and out. This
// figure builds that up step by step: each part appears in turn (input 1, input
// 2, the zSwap, the output), and the `cost =` tally grows a pill alongside it — a
// spend pill per input, an output pill for the output. The zSwap step adds no
// pill (it isn't a per-coin circuit).
//
// The progressive reveal IS the explanation, so there's no prose readout.
//
// Same enhancement contract as the other offer-files figures (see offerMerge.ts /
// deltasVanish.ts): progressive enhancement over a static SVG, narration-synced,
// reduced-motion aware, external module for the production CSP (GSAP writes CSSOM
// only). Registers a FigureJourney so the narrator and the offline video renderer
// drive the same animation. No interactive controls, so a gentle loop is fine.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

const LOOP_GAP = 2.5;

type Step = "in1" | "in2" | "swap" | "output";

const fig = document.getElementById("zswapcost-figure");
if (fig) initZswapCost(fig);

function initZswapCost(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "zc-fig";
  stage.dataset.step = "in1";
  stage.innerHTML = `
    <div class="zc-cap">a swap's proving cost is just a count of coins in &amp; out</div>
    <div class="zc-flow">
      <div class="zc-col zc-in">
        <div class="zc-utxo" data-in1>
          <div class="zc-utxo-h">UTXO</div>
          <div class="zc-utxo-b">🌙 5 NIGHT</div>
          <div class="zc-circ spend">spend · k=15</div>
        </div>
        <div class="zc-utxo zc-in2" data-in2>
          <div class="zc-utxo-h">UTXO</div>
          <div class="zc-utxo-b">🪙 4 GOLD</div>
          <div class="zc-circ spend">spend · k=15</div>
        </div>
      </div>
      <div class="zc-arrow zc-a1" data-a1>&rarr;</div>
      <div class="zc-box" data-box>zSwap</div>
      <div class="zc-arrow zc-a2" data-a2>&rarr;</div>
      <div class="zc-col zc-out" data-out>
        <div class="zc-utxo">
          <div class="zc-utxo-h">UTXO</div>
          <div class="zc-utxo-b">🪨 3 ROCK</div>
          <div class="zc-circ output">output · k=14</div>
        </div>
      </div>
    </div>
    <div class="zc-cost">
      <span class="zc-cost-label">cost =</span>
      <span class="zc-pill spend zc-c1">spend k=15</span>
      <span class="zc-plus zc-c2">+</span>
      <span class="zc-pill spend zc-c2">spend k=15</span>
      <span class="zc-plus zc-c3">+</span>
      <span class="zc-pill output zc-c3">output k=14</span>
    </div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("zc-enhanced");

  const q = <T extends Element>(sel: string) => stage.querySelector(sel) as T;
  const qa = (sel: string) => Array.from(stage.querySelectorAll<HTMLElement>(sel));
  const in1 = q<HTMLElement>("[data-in1]");
  const in2 = q<HTMLElement>("[data-in2]");
  const a1 = q<HTMLElement>("[data-a1]");
  const box = q<HTMLElement>("[data-box]");
  const a2 = q<HTMLElement>("[data-a2]");
  const out = q<HTMLElement>("[data-out]");
  const costLabel = q<HTMLElement>(".zc-cost-label");
  const c1 = q<HTMLElement>(".zc-c1");
  const c2 = qa(".zc-c2"); // plus + 2nd spend pill
  const c3 = qa(".zc-c3"); // plus + output pill
  // Everything that carries an entrance flourish — reset() restores these to
  // explicit resting values (rule 12: no clearProps) so frame 0 is byte-stable.
  const allParts: HTMLElement[] = [in1, in2, a1, box, a2, out, costLabel, c1, ...c2, ...c3];

  // A driver (capture/narrator) takes exclusive control via reset(); `driven`
  // stands the live self-play down. Every tween lives on the paused tour
  // timeline (rule 9), so reset just stops the loop scheduler and snaps to 0.
  let driven = false;

  const setStep = (step: Step): void => { stage.dataset.step = step; };

  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    const pop = { opacity: 0, scale: 0.7 };
    const popTo = { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)", immediateRender: false } as const;

    tl.addLabel("in1", 0);
    tl.call(() => setStep("in1"));
    tl.fromTo(in1, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, ease: "power1.out", immediateRender: false });
    tl.fromTo([costLabel, c1], pop, popTo, "<0.1");
    tl.to({}, { duration: 1.3 });

    tl.addLabel("in2");
    tl.call(() => setStep("in2"));
    tl.fromTo(in2, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, ease: "power1.out", immediateRender: false });
    tl.fromTo(c2, pop, popTo, "<0.1");
    tl.to({}, { duration: 1.3 });

    tl.addLabel("swap");
    tl.call(() => setStep("swap"));
    tl.fromTo([a1, box], { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)", immediateRender: false });
    tl.to({}, { duration: 1.1 });

    tl.addLabel("output");
    tl.call(() => setStep("output"));
    tl.fromTo([a2, out], { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.4, ease: "power1.out", immediateRender: false });
    tl.fromTo(c3, pop, popTo, "<0.1");
    tl.to({}, { duration: 1.9 });

    return tl;
  }

  let loopTimer: gsap.core.Tween | null = null;
  function playLive(): void {
    if (driven) return;
    if (reduced) {
      tour.pause(0);
      setStep("output");
      gsap.set(allParts, { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }
    loopTimer?.kill();
    tour.eventCallback("onComplete", () => { loopTimer = gsap.delayedCall(LOOP_GAP, playLive); });
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

  const tour = buildTour();
  registerFigureJourney("zswapcost-figure", buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill();
      loopTimer = null;
      tour.pause(0);
      setStep("in1");
      gsap.set(allParts, { opacity: 1, x: 0, y: 0, scale: 1 });
    },
  }));
}
