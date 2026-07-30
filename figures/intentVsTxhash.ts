// "Why an input can be an intent" figure for posts/offer-files.html
// (Appendix F, the binding-anatomy section). Contrasts how an input is
// authorized and bound on the two models, drawn as field-stack transactions:
//
//   Traditional: a transaction is a stack of fields (input, outputs, witness).
//     The WHOLE stack is hashed into a `tx hash`, that hash is signed into a
//     `witness`, and the witness is added back as the bottom row - so every
//     input has to be fixed before you can sign. (Two arrows leave the whole box
//     for the hash; a connector loops the witness back into its row.)
//
//   Midnight: each independent piece authorizes itself together with the segment
//     it will occupy. Public intents do that with signatures; private zswap
//     spends do it inside spend.zkir. The authorized piece can then be slotted or
//     merged into a transaction without signing the transaction hash.
//
// Inline-SVG + GSAP: a fixed viewBox is responsive and height-invariant by
// construction (rule 16 is free). The SVG is authored in its COMPLETE state, so
// it doubles as the no-JS fallback; on init the module snaps it to frame 0 and
// plays forward once on view / narration. Build-once journey, no spawned nodes:
// reset() = pause(0) + explicit-state restore (never killTweensOf, rule 14).
// See client/figureAnimation.ts and the `figure-journey` skill.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

const NEUTRAL = "#c8c8d4";
const DONE = "#5bb87a";
// Seconds to dwell on the assembled final frame before the loop replays. Shared
// by the live free-run loop and the registered journey (baked in via
// buildLoopingJourney) so the page and the rendered video pause identically.
const LOOP_GAP = 2.4;
const FLOW_PARK = { x: -290, y: 0 };

const fig = document.getElementById("intent-vs-txhash-figure");
if (fig) initIntentVsTxhash(fig);

function initIntentVsTxhash(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (name: string) => figure.querySelector(`[data-el="${name}"]`) as SVGElement | null;

  const tradTx = el("trad-tx");
  const tradInput = el("trad-input");
  const tradHasharrows = el("trad-hasharrows");
  const tradHash = el("trad-hash");
  const tradSignop = el("trad-signop");
  const tradWitness = el("trad-witness");
  const tradConnector = el("trad-connector");
  const tradWitnessrow = el("trad-witnessrow");
  const midTx = el("mid-tx");
  const midPublic = el("mid-public");
  const midPrivate = el("mid-private");
  const midPublicResult = el("mid-public-result");
  const midPrivateResult = el("mid-private-result");
  if (!tradTx || !tradInput || !tradHasharrows || !tradHash || !tradSignop || !tradWitness ||
      !tradConnector || !tradWitnessrow || !midTx || !midPublic || !midPrivate ||
      !midPublicResult || !midPrivateResult) return;

  const fades = [tradInput, tradHasharrows, tradHash, tradSignop, tradWitness, tradConnector,
    tradWitnessrow, midPublic, midPrivate, midPublicResult, midPrivateResult];

  // A driver (video capture / narrator) takes exclusive control via reset();
  // `driven` stands the live triggers down (rule 7).
  let driven = false;

  // Frame 0: everything that animates is hidden; the Midnight chips are parked at
  // their local-build spot; both boxes read neutral. reset() restores this exactly.
  function showInitial(): void {
    gsap.set(fades, { opacity: 0 });
    gsap.set([midPublicResult, midPrivateResult], FLOW_PARK);
    gsap.set([tradTx, midTx], { attr: { stroke: NEUTRAL } });
  }

  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    const FADE = 0.45;

    // --- Traditional: the witness is downstream of the whole transaction ------
    tl.addLabel("trad-input", 0);
    tl.fromTo(tradInput, { opacity: 0 }, { opacity: 1, duration: FADE, immediateRender: false });
    tl.to({}, { duration: 0.2 });

    tl.addLabel("trad-hash");
    tl.fromTo(tradHasharrows, { opacity: 0 }, { opacity: 1, duration: FADE, immediateRender: false });
    tl.fromTo(tradHash, { opacity: 0 }, { opacity: 1, duration: FADE, immediateRender: false }, "-=0.2");
    tl.to({}, { duration: 0.2 });

    tl.addLabel("trad-witness");
    tl.fromTo(tradSignop, { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false });
    tl.fromTo(tradWitness, { opacity: 0 }, { opacity: 1, duration: FADE, immediateRender: false }, "-=0.1");
    tl.to({}, { duration: 0.3 });

    tl.addLabel("trad-bound");
    tl.fromTo(tradConnector, { opacity: 0 }, { opacity: 1, duration: 0.5, immediateRender: false });
    tl.fromTo(tradWitnessrow, { opacity: 0 }, { opacity: 1, duration: 0.5, immediateRender: false }, "-=0.25");
    tl.fromTo(tradTx, { attr: { stroke: NEUTRAL } }, { attr: { stroke: DONE }, duration: 0.4, immediateRender: false }, "<");
    tl.to({}, { duration: 0.5 });

    // --- Midnight: each piece authorizes itself with its segment --------------
    tl.addLabel("mid-public");
    tl.fromTo(midPublic, { opacity: 0 }, { opacity: 1, duration: FADE, immediateRender: false });
    tl.to({}, { duration: 0.35 });

    tl.addLabel("mid-public-slot");
    tl.fromTo(midPublicResult, { opacity: 0, ...FLOW_PARK }, {
      opacity: 1,
      x: 0,
      y: 0,
      duration: 0.75,
      ease: "power2.inOut",
      immediateRender: false,
    });
    tl.to({}, { duration: 0.25 });

    tl.addLabel("mid-private");
    tl.fromTo(midPrivate, { opacity: 0 }, { opacity: 1, duration: FADE, immediateRender: false });
    tl.to({}, { duration: 0.35 });

    tl.addLabel("mid-private-merge");
    tl.fromTo(midPrivateResult, { opacity: 0, ...FLOW_PARK }, {
      opacity: 1,
      x: 0,
      y: 0,
      duration: 0.75,
      ease: "power2.inOut",
      immediateRender: false,
    });
    tl.fromTo(midTx, { attr: { stroke: NEUTRAL } }, { attr: { stroke: DONE }, duration: 0.4, immediateRender: false }, "-=0.25");
    tl.to({}, { duration: 0.6 });

    return tl;
  }

  const tour = buildTour();

  // ----- self-play drives the SAME tour the journey exposes (rules 1 & 7) ------
  // Looping build-up: reset to frame 0, play, then replay after LOOP_GAP. The
  // explicit showInitial() each loop re-hides the not-yet-started reveals (a bare
  // play(0) would leave them showing from the previous pass).
  let loopTimer: gsap.core.Tween | null = null;
  function playLive(): void {
    if (driven) return; // a driver owns the figure; stay out of its way
    if (reduced) { tour.progress(1); return; } // settled (assembled) state, no motion
    showInitial();
    loopTimer?.kill();
    tour.eventCallback("onComplete", () => {
      loopTimer = gsap.delayedCall(LOOP_GAP, playLive);
    });
    tour.play(0);
  }

  showInitial();

  // Silent reader: play once when scrolled into view.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
  }, { threshold: 0.3 });
  io.observe(figure);

  // Replay when narration reaches the paired mark.
  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active && !driven) { showInitial(); playLive(); }
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  registerFigureJourney("intent-vs-txhash-figure", buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill();
      loopTimer = null;
      tour.pause(0);
      showInitial();
    },
  }));
}
