// "Merge vs. chain" figure for posts/offer-files.html (the #chaining-lead ¶).
//
// Teaches the distinction the chaining section opens with: combining two swaps
// by MERGE vs by CHAINING them through a transient. Same two swaps either way —
//   swap 1:  5 🌙 NIGHT → 3 🪨 ROCK
//   swap 2:  3 🪨 ROCK  → 7 💎 GEM
// but the middle 3 ROCK behaves differently:
//   - MERGE  is a *disjoint* set-union: the two offers may share no coin, so the
//     3 ROCK swap 1 *creates* is NOT the 3 ROCK swap 2 *spends*. Both inputs are
//     coins that already settled on-chain (leaves of the global commitment tree),
//     and the freshly-made 3 ROCK just sits as a new coin — it can't feed swap 2.
//   - CHAIN  fuses them with a transient: the 3 ROCK swap 1 makes IS the coin
//     swap 2 spends, created and consumed inside one transaction via an ephemeral
//     one-leaf tree. It never settles on-chain.
// See the article's "Offers merge into one" and "Chaining needs a transient"
// sections, which this figure visualizes.
//
// Why an external module (not an inline <script>): production CSP is
// `script-src 'self'` with no 'unsafe-inline' (see shared/securityHeaders.ts).
// Same enhancement contract as figures/offerMerge.ts:
//   - progressive enhancement over a static SVG fallback (adds `.mc-enhanced`)
//   - narration-synced via the `narration-active` class the player toggles
//   - IntersectionObserver intro for the silent reader
//   - reduced-motion aware
// It registers a FigureJourney (engine contract): a build-once, paused,
// forward-seekable GSAP tour (merge → chain) the narrator can play/loop and the
// video renderer can capture frame-accurately. See engine client/figureAnimation.ts
// and the `figure-journey` skill.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

// Seconds to dwell on the final frame before the loop replays. Shared by the
// in-page free-run loop and the registered journey (baked in via
// buildLoopingJourney) so the page and the rendered video pause identically.
const LOOP_GAP = 2.2;

const MERGE_READOUT =
  "<b>Merge</b> is a <b>disjoint union</b>: the two offers may share no coin. So both inputs are coins that already <b>settled on-chain</b> &mdash; the two <b>3&nbsp;🪨</b> are <em>different</em> coins. The 3&nbsp;🪨 swap&nbsp;1 makes just sits as a new coin; it can't feed swap&nbsp;2.";
const CHAIN_READOUT =
  "<b>Chaining</b> fuses them with a <b>transient</b>: the <b>3&nbsp;🪨</b> swap&nbsp;1 makes <em>is</em> the coin swap&nbsp;2 spends &mdash; created and consumed in <b>one transaction</b> via an ephemeral one-leaf tree. It <b>never settles on-chain</b>.";

const fig = document.getElementById("mergechain-figure");
if (fig) initMergeVsChain(fig);

function initMergeVsChain(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "mc-fig";
  stage.innerHTML = `
    <div class="mc-row" data-row="merge">
      <div class="mc-glow" data-contrast="exempt" aria-hidden="true"></div>
      <div class="mc-row-head"><span class="mc-tag merge">Merge</span> two independent swaps, unioned</div>
      <div class="mc-flow">
        <div class="mc-pool" data-contrast="exempt">on-chain<br><span class="mc-pool-sub">commitment set</span></div>
        <div class="mc-feeds">
          <div class="mc-swap">
            <span class="mc-from" data-contrast="exempt" aria-hidden="true"></span>
            <span class="mc-coin night">5&nbsp;🌙</span>
            <span class="mc-to">&rarr;</span>
            <span class="mc-box">swap&nbsp;1</span>
            <span class="mc-to">&rarr;</span>
            <span class="mc-coin rock rock-a">3&nbsp;🪨</span>
            <span class="mc-note settles">settles as a new coin</span>
          </div>
          <div class="mc-swap">
            <span class="mc-from" data-contrast="exempt" aria-hidden="true"></span>
            <span class="mc-coin rock rock-b">3&nbsp;🪨</span>
            <span class="mc-to">&rarr;</span>
            <span class="mc-box">swap&nbsp;2</span>
            <span class="mc-to">&rarr;</span>
            <span class="mc-coin gem">7&nbsp;💎</span>
          </div>
        </div>
      </div>
    </div>
    <div class="mc-row" data-row="chain">
      <div class="mc-glow" data-contrast="exempt" aria-hidden="true"></div>
      <div class="mc-row-head"><span class="mc-tag chain">Chain</span> one swap feeds the next</div>
      <div class="mc-flow">
        <div class="mc-pool" data-contrast="exempt">on-chain<br><span class="mc-pool-sub">commitment set</span></div>
        <div class="mc-swap chain-swap">
          <span class="mc-from" data-contrast="exempt" aria-hidden="true"></span>
          <span class="mc-coin night">5&nbsp;🌙</span>
          <span class="mc-to">&rarr;</span>
          <span class="mc-box">swap&nbsp;1</span>
          <span class="mc-to">&rarr;</span>
          <span class="mc-transient" data-contrast="exempt">
            <span class="mc-transient-tag">transient &middot; ephemeral</span>
            <span class="mc-coin rock">3&nbsp;🪨</span>
          </span>
          <span class="mc-to">&rarr;</span>
          <span class="mc-box">swap&nbsp;2</span>
          <span class="mc-to">&rarr;</span>
          <span class="mc-coin gem">7&nbsp;💎</span>
        </div>
      </div>
    </div>
    <div class="mc-readout-wrap">
      <p class="mc-readout-sizer" aria-hidden="true">${MERGE_READOUT}</p>
      <p class="mc-readout" data-readout></p>
    </div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("mc-enhanced");

  const q = <T extends Element>(sel: string) => stage.querySelector(sel) as T;
  const rowMerge = q<HTMLElement>('[data-row="merge"]');
  const rowChain = q<HTMLElement>('[data-row="chain"]');
  const glowMerge = rowMerge.querySelector(".mc-glow") as HTMLElement;
  const glowChain = rowChain.querySelector(".mc-glow") as HTMLElement;
  const readout = q<HTMLElement>("[data-readout]");

  // A driver (video capture / narrator) takes exclusive control via reset();
  // `driven` stands the live triggers down. This is a build-once journey with no
  // spawned nodes, so reset() is pause(0) + explicit-value restore (never
  // killTweensOf — that would reach into the paused tour and freeze it).
  let driven = false;

  /** Discrete state for a step: which row is active + the readout copy. Driven by
   *  both the live path and the tour timeline's keyframe callbacks. */
  function setActive(which: "merge" | "chain"): void {
    const mergeActive = which === "merge";
    rowMerge.classList.toggle("is-active", mergeActive);
    rowChain.classList.toggle("is-active", !mergeActive);
    readout.innerHTML = mergeActive ? MERGE_READOUT : CHAIN_READOUT;
  }

  /** Snap to the journey's first frame (merge active, only its glow lit). */
  function showInitial(): void {
    setActive("merge");
    gsap.set(glowMerge, { opacity: 1 });
    gsap.set(glowChain, { opacity: 0 });
  }

  // ----- self-playing tour: merge → chain (one paused, scrubbable timeline) ----
  // Glows are decorative emphasis (opacity is fine on a non-load-bearing element,
  // rule 17); the active-row accent and readout copy are discrete .call() state.
  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    tl.addLabel("merge", 0);
    tl.call(() => setActive("merge"));
    tl.set(glowMerge, { opacity: 1 });
    tl.set(glowChain, { opacity: 0 });
    tl.to({}, { duration: 2.0 }); // dwell on merge
    tl.addLabel("chain");
    tl.call(() => setActive("chain"));
    tl.to(glowChain, { opacity: 1, duration: 0.5, ease: "power2.out" });
    tl.to(glowMerge, { opacity: 0, duration: 0.5, ease: "power2.out" }, "<");
    tl.to({}, { duration: 2.0 }); // dwell on chain
    return tl;
  }

  // ----- self-play drives the SAME tour the journey exposes (rules 1 & 7) ------
  let loopTimer: gsap.core.Tween | null = null;
  function playLive(): void {
    if (driven) return; // a driver owns the figure; stay out of its way
    if (reduced) {
      // Reduced motion: show the settled tour state (merge), no real-time motion.
      tour.pause(0);
      showInitial();
      return;
    }
    loopTimer?.kill();
    tour.eventCallback("onComplete", () => {
      loopTimer = gsap.delayedCall(LOOP_GAP, playLive);
    });
    tour.play(0);
  }

  showInitial();

  // Silent reader: play the tour once when scrolled into view (autoplay option A).
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
  }, { threshold: 0.3 });
  io.observe(figure);

  // Replay the tour when narration reaches the paired mark. playLive() no-ops
  // once a driver claims the figure (`driven`), so it can't fight the driver.
  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  // Register the journey (always — registration ≠ playback). Forward-seek
  // contract; transport lives in engine drivers, not here. Bake the LOOP_GAP
  // dwell in so the video compositor and narration's continuous loop pause on the
  // final frame before looping instead of restarting the instant motion ends.
  const tour = buildTour();
  registerFigureJourney("mergechain-figure", buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill(); // stop the self-play loop scheduler
      loopTimer = null;
      tour.pause(0);
      showInitial();
    },
  }));
}
