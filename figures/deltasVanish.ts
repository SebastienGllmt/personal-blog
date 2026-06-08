// "deltas vanish" figure for posts/offer-files.html — the LOADING-DOCK metaphor.
//
// Each zSwap offer is a cardboard BOX, with its `deltas` printed on a package
// LABEL stuck to the outside — public, because the chain needs it to check the
// trade balances. A running Σ adds up the labels as boxes arrive (each box dims
// once it's been counted, and a "this offer adds …" line + an "n of 3" counter
// make the accumulation explicit). Stack offers that complete each other and the
// running sum lands on zero; then a validity proof certifies the bundle, the
// now-pointless all-zero labels PEEL OFF, the shipping-container doors slide
// open, and the boxes load in. Intuition: deltas are public so you know how to
// balance the transaction, but once a proof says it's balanced, you don't care
// about them — so they're dropped.
//
// Four-beat tour (labels are the narration step join-points):
//   box1 — first offer-box arrives; running Σ = its deltas (≠ 0).
//   box2 — second box; Σ updates (still ≠ 0); box 1 dims (counted).
//   box3 — third box completes the set; Σ nets to zero; box 2 dims.
//   load — proof certifies; labels peel off; doors slide open; boxes load in.
//
// Build-once (rule 10): all three boxes exist from frame 0 and are revealed /
// dimmed / moved with opacity + transform only (no appendChild mid-run, no
// reflow), so the figure box height is invariant across the driven frames
// (rule 16).
//
// Same enhancement contract as the other offer-files figures (see offerMerge.ts):
// progressive enhancement over a static SVG, narration-synced, IntersectionObserver
// intro, reduced-motion aware. External module for the production CSP; GSAP only
// writes CSSOM. Registers a FigureJourney so the narrator and the offline video
// renderer drive the same animation.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

const LOOP_GAP = 2.5;
const DIM = 0.4; // opacity of a box once it's been counted into the running Σ

type Step = "box1" | "box2" | "box3" | "load";

// Three offers whose deltas sum to zero, with non-zero intermediate sums.
//   B1 🌙+5 🪨−3 → Σ 🌙+5 🪨−3
//   B2 🌙−2 🪨+1 → Σ 🌙+3 🪨−2
//   B3 🌙−3 🪨+2 → Σ 🌙 0 🪨 0
const SUM: Record<Step, { night: string; rock: string; balanced: boolean }> = {
  box1: { night: "+5", rock: "−3", balanced: false },
  box2: { night: "+3", rock: "−2", balanced: false },
  box3: { night: "0", rock: "0", balanced: true },
  load: { night: "0", rock: "0", balanced: true },
};
const ADD: Record<Step, string> = {
  box1: "🌙 +5  🪨 −3",
  box2: "🌙 −2  🪨 +1",
  box3: "🌙 −3  🪨 +2",
  load: "all three counted",
};
const BADGE: Record<Step, string> = {
  box1: "1 of 3 · imbalanced",
  box2: "2 of 3 · imbalanced",
  box3: "3 of 3 · balanced",
  load: "balanced",
};

const READOUT: Record<Step, string> = {
  box1:
    "Each offer is a <b>box</b>, with its <code>deltas</code> on a label stuck to the outside &mdash; public, so the chain can read how the trade should balance. One box alone is <b>imbalanced</b>; that imbalance is the trade.",
  box2:
    "Bring in another offer. Its label adds into the <b>running &Sigma;</b> (the counted box dims) &mdash; still not zero.",
  box3:
    "And a third that completes the set. Now every token's running &Sigma; lands exactly on <b>zero</b> &mdash; together, these offers balance.",
  load:
    "Once the &Sigma; is zero and a <b>proof</b> certifies it, the all-zero labels say nothing the proof doesn't already guarantee. They <b>peel off</b>, the container opens, and the boxes load into one transaction. Public until proven; then the deltas are gone.",
};

const fig = document.getElementById("deltas-vanish-figure");
if (fig) initDeltasVanish(fig);

function initDeltasVanish(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tag = (n: string) =>
    `<div class="dv-tag" data-tag><span class="dv-bars" aria-hidden="true"></span><span class="dv-tag-t">${n}</span></div>`;

  const stage = document.createElement("div");
  stage.className = "dv-fig";
  stage.dataset.step = "box1";
  stage.innerHTML = `
    <div class="dv-cap">offers are boxes; their deltas are a shipping label on the outside</div>
    <div class="dv-sum">
      <div class="dv-sum-line">
        <span class="dv-sum-h">running &Sigma; deltas</span>
        <span class="dv-sum-vals">🌙 <b class="dv-val" data-vn>+5</b>  🪨 <b class="dv-val" data-vr>&minus;3</b></span>
        <span class="dv-sum-badge" data-badge>1 of 3 · imbalanced</span>
      </div>
      <div class="dv-add">
        <span class="dv-add-h">＋ this offer adds</span>
        <span class="dv-add-vals" data-add-vals>🌙 +5  🪨 &minus;3</span>
      </div>
    </div>
    <div class="dv-yard">
      <div class="dv-darkband" aria-hidden="true"></div>
      <div class="dv-boxes">
        <div class="dv-box" data-box><div class="dv-box-body">zSwap<small>offer</small></div>${tag("🌙+5 🪨&minus;3")}</div>
        <div class="dv-box" data-box><div class="dv-box-body">zSwap<small>offer</small></div>${tag("🌙&minus;2 🪨+1")}</div>
        <div class="dv-box" data-box><div class="dv-box-body">zSwap<small>offer</small></div>${tag("🌙&minus;3 🪨+2")}</div>
      </div>
      <div class="dv-container">
        <span class="dv-bin-t">transaction</span>
        <span class="dv-proof" data-proof>&check; proof &mdash; balances</span>
      </div>
      <div class="dv-lid dv-lid-l" data-lid-l aria-hidden="true"></div>
      <div class="dv-lid dv-lid-r" data-lid-r aria-hidden="true"></div>
    </div>
    <p class="dv-readout" data-readout></p>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("dv-enhanced");

  const q = <T extends Element>(sel: string) => stage.querySelector(sel) as T;
  const boxes = Array.from(stage.querySelectorAll<HTMLElement>("[data-box]"));
  const tags = Array.from(stage.querySelectorAll<HTMLElement>("[data-tag]"));
  const lidL = q<HTMLElement>("[data-lid-l]");
  const lidR = q<HTMLElement>("[data-lid-r]");
  const proof = q<HTMLElement>("[data-proof]");
  const vn = q<HTMLElement>("[data-vn]");
  const vr = q<HTMLElement>("[data-vr]");
  const addVals = q<HTMLElement>("[data-add-vals]");
  const badge = q<HTMLElement>("[data-badge]");
  const readout = q<HTMLElement>("[data-readout]");

  // A driver (video capture / narrator) takes exclusive control via reset();
  // `driven` stands the live self-play down. Every tween lives on the paused
  // tour timeline (rule 9), so reset just stops the loop scheduler + snaps to 0.
  let driven = false;

  /** Discrete (non-tweened) state for a step: running Σ values, the "this offer
   *  adds …" line, the "n of 3 · state" badge, and the data-step class CSS keys
   *  off. Box reveal/dim, label peel, door slide and the load are tweened on the
   *  timeline, not here. */
  function applyStep(step: Step): void {
    stage.dataset.step = step;
    vn.textContent = SUM[step].night;
    vr.textContent = SUM[step].rock;
    addVals.textContent = ADD[step];
    badge.textContent = BADGE[step];
    readout.innerHTML = READOUT[step];
  }

  applyStep("box1");

  const revealBox = (tl: gsap.core.Timeline, i: number): void => {
    tl.fromTo(boxes[i]!, { opacity: 0, y: -14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(2)", immediateRender: false });
  };
  const dimBox = (tl: gsap.core.Timeline, i: number): void => {
    tl.to(boxes[i]!, { opacity: DIM, duration: 0.35, ease: "power1.out" }, "<");
  };
  const bumpAdd = (tl: gsap.core.Timeline): void => {
    tl.fromTo(addVals, { scale: 0.5, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(3)", immediateRender: false }, "<");
  };
  const bumpSum = (tl: gsap.core.Timeline): void => {
    tl.fromTo([vn, vr], { scale: 0.6 }, { scale: 1, duration: 0.32, ease: "back.out(3)", immediateRender: false }, "<");
  };

  // ----- self-playing tour: one paused, scrubbable timeline. Discrete state via
  // keyframe .call()s; tweens (rule 8: immediateRender:false; rule 9: all on the
  // timeline) are the box reveals/dims, the label peel, the door slide and load. -
  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });

    tl.addLabel("box1", 0);
    tl.call(() => applyStep("box1"));
    revealBox(tl, 0);
    bumpAdd(tl);
    tl.to({}, { duration: 1.3 });

    tl.addLabel("box2");
    tl.call(() => applyStep("box2"));
    revealBox(tl, 1);
    dimBox(tl, 0);
    bumpAdd(tl);
    bumpSum(tl);
    tl.to({}, { duration: 1.3 });

    tl.addLabel("box3");
    tl.call(() => applyStep("box3"));
    revealBox(tl, 2);
    dimBox(tl, 1);
    bumpAdd(tl);
    bumpSum(tl);
    tl.to({}, { duration: 1.5 });

    tl.addLabel("load");
    tl.call(() => applyStep("load"));
    // Un-dim every box so they read clearly as they load.
    tl.to(boxes, { opacity: 1, duration: 0.3 });
    // Peel every label off (rotate + slide + fade), staggered.
    tl.fromTo(tags, { rotation: 0, x: 0, y: 0, opacity: 1 }, { rotation: 12, x: 10, y: 28, opacity: 0, duration: 0.5, stagger: 0.07, ease: "power1.in", immediateRender: false }, "<");
    // The proof seal pops in.
    tl.fromTo(proof, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, "<0.1");
    // Beat: let the peel register before anything else moves.
    tl.to({}, { duration: 0.7 });
    // The container doors SLIDE apart (translate only — they stay opaque and
    // leave the dark interior opening behind, reading as a gate opening).
    tl.fromTo(lidL, { xPercent: 0 }, { xPercent: -100, duration: 0.45, ease: "power2.inOut", immediateRender: false });
    tl.fromTo(lidR, { xPercent: 0 }, { xPercent: 100, duration: 0.45, ease: "power2.inOut", immediateRender: false }, "<");
    // Short beat with the gate open before the boxes drop.
    tl.to({}, { duration: 0.3 });
    // Boxes load in: drop behind the container (only their tops stay above the
    // rim), converge, shrink to fit. Pure transform.
    tl.to(boxes[0]!, { y: 78, x: 55, scale: 0.5, duration: 0.8, ease: "power2.in", immediateRender: false });
    tl.to(boxes[1]!, { y: 78, x: 0, scale: 0.5, duration: 0.8, ease: "power2.in", immediateRender: false }, "<0.1");
    tl.to(boxes[2]!, { y: 78, x: -55, scale: 0.5, duration: 0.8, ease: "power2.in", immediateRender: false }, "<0.1");
    tl.to({}, { duration: 1.7 });

    return tl;
  }

  let loopTimer: gsap.core.Tween | null = null;
  function playLive(): void {
    if (driven) return; // a driver owns the figure; stay out of its way
    if (reduced) {
      // Reduced motion: show the settled (final) state — sum zero, boxes loaded.
      tour.pause(0);
      applyStep("load");
      gsap.set(tags, { opacity: 0, rotation: 12, x: 10, y: 28 });
      gsap.set(proof, { opacity: 1, scale: 1 });
      gsap.set(lidL, { xPercent: -100 });
      gsap.set(lidR, { xPercent: 100 });
      boxes.forEach((b, i) => gsap.set(b, { opacity: 1, y: 78, x: [55, 0, -55][i]!, scale: 0.5 }));
      return;
    }
    loopTimer?.kill();
    tour.eventCallback("onComplete", () => { loopTimer = gsap.delayedCall(LOOP_GAP, playLive); });
    tour.play(0);
  }

  // Silent reader: play once when scrolled into view; loops with the dwell gap.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
  }, { threshold: 0.3 });
  io.observe(figure);

  // Narration: replay when the player toggles narration-active on this figure.
  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  const tour = buildTour();
  // Bake the free-run LOOP_GAP dwell into the journey (rule 15) so the video
  // compositor and the narration continuous loop hold the final frame before
  // replaying, matching the live page.
  registerFigureJourney("deltas-vanish-figure", buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill();
      loopTimer = null;
      tour.pause(0);
      applyStep("box1");
      // Reset tweened props to explicit resting values (rule 12: no clearProps)
      // so frame 0 is byte-identical across passes.
      gsap.set(boxes, { opacity: 0, x: 0, y: 0, scale: 1 });
      gsap.set(tags, { opacity: 1, rotation: 0, x: 0, y: 0 });
      gsap.set([lidL, lidR], { xPercent: 0 });
      gsap.set(proof, { opacity: 0, scale: 1 });
      gsap.set([vn, vr], { scale: 1 });
      gsap.set(addVals, { opacity: 1, scale: 1 });
    },
  }));
}
