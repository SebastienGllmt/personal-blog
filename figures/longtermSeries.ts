// "long-term refresh series" figure for posts/offer-files.html — a listing
// that outlives any single offer file.
//
// The listing is a long bar (months–years); offer files are short tiles tiling
// it. Each tile lives for the two-week TTL, then expires as the wallet mints
// the next one — same terms, new expiry, same untouched coin. Only the newest
// tile is live. The alternative (pattern two) is the request-for-quote flow:
// keep no live offer, mint at the moment of agreement.
//
// Two-beat tour (labels are the narration step join-points):
//   series — tiles pop in live and expire in sequence along the listing bar.
//   rfq    — the request-for-quote alternative reveals.
//
// Build-once (rule 10): every tile exists from frame 0 (opacity 0); the
// live→expired flips are discrete [data-state] swaps via timeline .call()s
// (rule 3 makes them seek-safe); everything else is opacity/transform, so the
// figure box height is invariant across the driven frames (rule 16).
//
// Same enhancement contract as the other offer-files figures (see
// deltasVanish.ts): progressive enhancement over a static SVG,
// narration-synced, IntersectionObserver intro, reduced-motion aware. External
// module for the production CSP; GSAP only writes CSSOM. Registers a
// FigureJourney so the narrator and the offline video renderer drive the same
// animation.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

const LOOP_GAP = 2.5;

type Step = "series" | "rfq";

const READOUT: Record<Step, string> = {
  series:
    "A <b>refresh series</b> tiles the listing's life: before the current file expires, the wallet mints a fresh one &mdash; same terms, new expiry, same untouched coin. Free off-chain; one proof per refresh. Only the newest file is live.",
  rfq:
    "Pattern two: keep <b>no live offer at all</b>. Publish the terms as an ordinary listing, and mint the offer file at the moment of agreement &mdash; a request-for-quote flow.",
};

const fig = document.getElementById("longterm-figure");
if (fig) initLongtermSeries(fig);

function initLongtermSeries(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tile = (n: number) =>
    `<div class="lt-tile" data-tile data-state="live"><span class="lt-tile-n">offer #${n}</span><span class="lt-tile-s" data-ts>live &check;</span></div>`;

  const stage = document.createElement("div");
  stage.className = "lt-fig";
  stage.dataset.step = "series";
  stage.innerHTML = `
    <div class="lt-bar-row">
      <span class="lt-h">the listing &mdash; months to years</span>
      <div class="lt-bar" data-bar></div>
    </div>
    <div class="lt-track">
      ${tile(1)}${tile(2)}${tile(3)}
      <span class="lt-more" data-more>&rarr; minted again before each expiry&hellip;</span>
    </div>
    <div class="lt-rfq" data-rfq><b>pattern 2 &middot; request-for-quote:</b> no live offer &mdash; publish the terms, mint the file when a real buyer appears</div>
    <p class="lt-readout" data-readout></p>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("lt-enhanced");

  const q = <T extends Element>(sel: string) => stage.querySelector(sel) as T;
  const bar = q<HTMLElement>("[data-bar]");
  const tiles = Array.from(stage.querySelectorAll<HTMLElement>("[data-tile]"));
  const more = q<HTMLElement>("[data-more]");
  const rfq = q<HTMLElement>("[data-rfq]");
  const readout = q<HTMLElement>("[data-readout]");

  // A driver (video capture / narrator) takes exclusive control via reset();
  // `driven` stands the live self-play down (rule 7).
  let driven = false;

  /** Discrete state: per-step readout/data-step, and each tile's live/expired
   *  flip (text + data-state the CSS keys off) — set via timeline .call()s. */
  function applyStep(step: Step): void {
    stage.dataset.step = step;
    readout.innerHTML = READOUT[step];
  }
  function setTile(i: number, state: "live" | "expired"): void {
    const t = tiles[i]!;
    t.dataset.state = state;
    (t.querySelector("[data-ts]") as HTMLElement).innerHTML = state === "live" ? "live &check;" : "expired";
  }

  applyStep("series");

  const popTile = (tl: gsap.core.Timeline, i: number): void => {
    tl.call(() => setTile(i, "live"));
    tl.fromTo(tiles[i]!, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.35, ease: "back.out(2)", immediateRender: false });
  };

  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });

    tl.addLabel("series", 0);
    tl.call(() => applyStep("series"));
    // Frame-zero state-set ON the timeline, so the free-run loop replays from
    // a clean slate: fromTo reveals only apply as they're reached, so without
    // this, late elements linger from the previous cycle (e.g. tile #3 sitting
    // visibly "live" while tile #1 replays).
    tl.call(() => { setTile(0, "live"); setTile(1, "live"); setTile(2, "live"); });
    tl.set(tiles, { opacity: 0, y: -8, immediateRender: false }, 0);
    tl.set(more, { opacity: 0, immediateRender: false }, 0);
    tl.set(rfq, { opacity: 0, y: 6, immediateRender: false }, 0);
    tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power1.inOut", immediateRender: false });
    popTile(tl, 0);
    tl.to({}, { duration: 0.8 });
    tl.call(() => setTile(0, "expired"));
    popTile(tl, 1);
    tl.to({}, { duration: 0.8 });
    tl.call(() => setTile(1, "expired"));
    popTile(tl, 2);
    tl.fromTo(more, { opacity: 0 }, { opacity: 1, duration: 0.35, immediateRender: false });
    tl.to({}, { duration: 1.8 });

    tl.addLabel("rfq");
    tl.call(() => applyStep("rfq"));
    tl.fromTo(rfq, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false });
    tl.to({}, { duration: 1.9 });

    return tl;
  }

  const tour = buildTour();

  let loopTimer: gsap.core.Tween | null = null;
  function playLive(): void {
    if (driven) return; // a driver owns the figure; stay out of its way
    if (reduced) {
      // Reduced motion: the settled (final) state.
      tour.pause(0);
      applyStep("rfq");
      setTile(0, "expired");
      setTile(1, "expired");
      setTile(2, "live");
      gsap.set(bar, { scaleX: 1 });
      gsap.set(tiles, { opacity: 1, y: 0 });
      gsap.set(more, { opacity: 1 });
      gsap.set(rfq, { opacity: 1, y: 0 });
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

  // Bake the free-run LOOP_GAP dwell into the journey (rule 15).
  registerFigureJourney("longterm-figure", buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill();
      loopTimer = null;
      tour.pause(0);
      applyStep("series");
      // Explicit resting values (rule 12: no clearProps).
      setTile(0, "live");
      setTile(1, "live");
      setTile(2, "live");
      gsap.set(bar, { scaleX: 0 });
      gsap.set(tiles, { opacity: 0, y: -8 });
      gsap.set(more, { opacity: 0 });
      gsap.set(rfq, { opacity: 0, y: 6 });
    },
  }));
}
