// Interactive "offer merge" figure for posts/offer-files.html.
//
// Teaches the conceptual heart of a zSwap-based offer: an offer is an *imbalanced*
// partial transaction, described by a signed per-token delta map. A maker's
// posted offer and a taker's matching half MERGE (set-union of inputs/outputs,
// element-wise sum of deltas) into one transaction — which is only valid when
// every token's merged delta nets to zero. The reader drives the taker's half
// and watches the ledger snap to "balanced".
//
// Why an external module (not an inline <script>): production CSP is
// `script-src 'self'` with no 'unsafe-inline' (see shared/securityHeaders.ts).
// The post references this file with <script type="module" src="…">, which
// Bun's bundler emits as a hashed same-origin asset — CSP-clean. GSAP only
// writes element.style (CSSOM), which CSP does not govern.
//
// Same enhancement contract as client/figures/hashAvalanche.ts:
//   - progressive enhancement over a static SVG fallback (adds `.merge-enhanced`)
//   - narration-synced via the `narration-active` class the player toggles
//   - IntersectionObserver intro for the silent reader
//   - reduced-motion aware
//
// It ALSO registers a FigureJourney (engine contract): a self-
// playing "tour" (balanced → break it → rebalance) on one paused, scrubbable
// GSAP timeline, so the narrator can play/loop it on cue and the video renderer
// can capture it frame-accurately. See engine client/figureAnimation.ts.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

// Seconds to dwell on the final frame before the loop replays. Shared by the
// in-page free-run loop and the registered journey (baked in via
// buildLoopingJourney) so the page and the rendered video pause identically.
const LOOP_GAP = 2.5;

// Alice's posted offer is fixed: she puts 5 NIGHT into the pot and pulls 3 ROCK
// out. Expressed as the offer's net contribution per token (its delta):
const MAKER_NIGHT = 5; // +5 NIGHT contributed
const MAKER_ROCK = 3; // −3 ROCK withdrawn
const MAX = 9;

const BALANCED_VERDICT =
  "&check; <b>Balanced.</b> The two halves merge into one transaction that settles atomically on Midnight. <b>Press the &minus;/+ buttons</b> to unbalance it and watch it break.";
const IMBALANCED_VERDICT =
  "&times; <b>Imbalanced.</b> A non-zero &Delta; can't be submitted &mdash; mirror Alice's offer exactly to fix it.";

const fig = document.getElementById("merge-figure");
if (fig) initMergeFigure(fig);

function initMergeFigure(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "merge-fig";
  stage.innerHTML = `
    <div class="offers">
      <div class="offer-card maker" data-maker>
        <div class="offer-head">Alice's offer <span class="badge">on the bulletin board</span></div>
        <ul class="legs">
          <li class="leg"><span class="dir give">gives</span><span class="amt">5</span><span class="tok night">🌙 NIGHT</span></li>
          <li class="leg"><span class="dir want">wants</span><span class="amt">3</span><span class="tok ROCK">🪨 ROCK</span></li>
        </ul>
      </div>
      <div class="merge-op" data-op>+</div>
      <div class="offer-card taker" data-taker>
        <div class="offer-head">Your matching half <span class="badge flip">Alice's offer, flipped</span></div>
        <div class="stepper-row">
          <span class="dir want">take</span>
          <button type="button" class="step" data-dec="night" aria-label="take one less NIGHT">−</button>
          <span class="amt" data-night>5</span>
          <button type="button" class="step" data-inc="night" aria-label="take one more NIGHT">+</button>
          <span class="tok night">🌙 NIGHT</span>
        </div>
        <div class="stepper-row">
          <span class="dir give">give</span>
          <button type="button" class="step" data-dec="ROCK" aria-label="give one less ROCK">−</button>
          <span class="amt" data-ROCK>3</span>
          <button type="button" class="step" data-inc="ROCK" aria-label="give one more ROCK">+</button>
          <span class="tok ROCK">🪨 ROCK</span>
        </div>
      </div>
    </div>
    <div class="ledger" data-ledger>
      <div class="ledger-title">merged transaction &mdash; every token's &Delta; must net to zero</div>
      <div class="delta-rows">
        <div class="delta-row"><span class="tok night">🌙 NIGHT</span><span class="bar"><span class="fill" data-bar-night></span></span><span class="delta" data-delta-night></span></div>
        <div class="delta-row"><span class="tok ROCK">🪨 ROCK</span><span class="bar"><span class="fill" data-bar-ROCK></span></span><span class="delta" data-delta-ROCK></span></div>
      </div>
      <div class="verdict-wrap">
        <p class="verdict-sizer" aria-hidden="true">${BALANCED_VERDICT}</p>
        <p class="verdict" data-verdict></p>
      </div>
    </div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("merge-enhanced");

  const q = <T extends Element>(sel: string) => stage.querySelector(sel) as T;
  const nightEl = q<HTMLElement>("[data-night]");
  const ROCKEl = q<HTMLElement>("[data-ROCK]");
  const dNight = q<HTMLElement>("[data-delta-night]");
  const dROCK = q<HTMLElement>("[data-delta-ROCK]");
  const barNight = q<HTMLElement>("[data-bar-night]");
  const barROCK = q<HTMLElement>("[data-bar-ROCK]");
  const verdict = q<HTMLElement>("[data-verdict]");
  const op = q<HTMLElement>("[data-op]");
  const ledger = q<HTMLElement>("[data-ledger]");

  // Taker's half: how much NIGHT it takes, how much ROCK it gives.
  let nightTake = MAKER_NIGHT;
  let ROCKGive = MAKER_ROCK;
  let wasBalanced = true;

  // A driver (video capture / narrator) takes exclusive control via reset();
  // `driven` stands the live triggers down and we kill the live tween instances
  // so they can't race the journey. We track instances rather than
  // `killTweensOf(bars)` because the journey tweens the SAME bars and
  // killTweensOf would reach into the paused tour and destroy it.
  let driven = false;
  const liveTweens: gsap.core.Tween[] = [];
  const track = (tw: gsap.core.Tween): gsap.core.Tween => {
    liveTweens.push(tw);
    return tw;
  };

  const clamp = (n: number) => Math.max(0, Math.min(MAX, n));
  const pct = (delta: number) => Math.min(100, (Math.abs(delta) / MAX) * 100);

  function setDeltaText(el: HTMLElement, delta: number): void {
    el.textContent = (delta > 0 ? "+" : "") + delta;
    el.classList.toggle("surplus", delta > 0);
    el.classList.toggle("deficit", delta < 0);
    el.classList.toggle("zero", delta === 0);
  }
  function setBarClass(bar: HTMLElement, delta: number): void {
    bar.classList.toggle("surplus", delta > 0);
    bar.classList.toggle("deficit", delta < 0);
    bar.classList.toggle("zero", delta === 0);
  }

  /** Everything that isn't a bar-width tween: amounts, deltas, verdict, op,
   *  balanced class. Driven discretely by both the interactive path and the
   *  tour timeline's keyframe callbacks. */
  function applyDiscrete(night: number, rock: number): void {
    nightTake = night;
    ROCKGive = rock;
    nightEl.textContent = String(night);
    ROCKEl.textContent = String(rock);
    const mergedNight = MAKER_NIGHT - night;
    const mergedROCK = rock - MAKER_ROCK;
    setDeltaText(dNight, mergedNight);
    setDeltaText(dROCK, mergedROCK);
    setBarClass(barNight, mergedNight);
    setBarClass(barROCK, mergedROCK);
    const balanced = mergedNight === 0 && mergedROCK === 0;
    figure.classList.toggle("is-balanced", balanced);
    op.textContent = balanced ? "=" : "+";
    verdict.innerHTML = balanced ? BALANCED_VERDICT : IMBALANCED_VERDICT;
  }

  // Interactive render: discrete state + animated bar widths (detached tweens).
  function render(animateBalance: boolean): void {
    const mergedNight = MAKER_NIGHT - nightTake;
    const mergedROCK = ROCKGive - MAKER_ROCK;
    applyDiscrete(nightTake, ROCKGive);
    const setBar = (bar: HTMLElement, delta: number) => {
      const w = pct(delta) + "%";
      if (reduced) bar.style.width = w;
      else track(gsap.to(bar, { width: w, duration: 0.35, ease: "power2.out" }));
    };
    setBar(barNight, mergedNight);
    setBar(barROCK, mergedROCK);
    const balanced = mergedNight === 0 && mergedROCK === 0;
    if (balanced && animateBalance && !wasBalanced && !reduced) {
      track(gsap.fromTo(ledger, { scale: 0.97 }, { scale: 1, duration: 0.4, ease: "back.out(2.2)" }));
      track(gsap.fromTo(op, { scale: 0.5, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(3)" }));
    }
    wasBalanced = balanced;
  }

  stage.querySelectorAll<HTMLButtonElement>(".step").forEach((btn) => {
    btn.addEventListener("click", () => {
      const inc = btn.dataset.inc;
      const dec = btn.dataset.dec;
      const tok = inc ?? dec;
      const sign = inc ? 1 : -1;
      if (tok === "night") nightTake = clamp(nightTake + sign);
      else ROCKGive = clamp(ROCKGive + sign);
      render(true);
    });
  });

  // ----- self-play drives the SAME tour the journey exposes ---------------
  // Proposal 43 rule 1 (and proposal 46 §4): the page animation must not
  // diverge from the journey. The old divergent `intro()` stagger is gone —
  // the page now plays the balanced → break → rebalance tour itself (looping),
  // exactly what the narrator and the video renderer drive via seek(). Stands
  // down once a driver claims the figure (`driven`), so the two never fight.
  let loopTimer: gsap.core.Tween | null = null;
  function playLive(): void {
    if (driven) return; // a driver owns the figure; stay out of its way
    if (reduced) {
      // Reduced motion: show the settled (balanced) state, no real-time motion.
      tour.pause(0);
      applyDiscrete(5, 3);
      gsap.set([barNight, barROCK], { width: "0%" });
      return;
    }
    loopTimer?.kill();
    tour.eventCallback("onComplete", () => {
      loopTimer = gsap.delayedCall(LOOP_GAP, playLive);
    });
    tour.play(0);
  }

  // ----- self-playing tour: balanced → break it → rebalance (one paused,
  // scrubbable timeline; bar widths are tweens, the rest are keyframe calls) ---
  // The journey's named steps become the `steps` map (via the timeline labels);
  // they're the future join-point for narration-driven stepping.
  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    tl.addLabel("balanced", 0);
    tl.call(() => applyDiscrete(5, 3));
    tl.set([barNight, barROCK], { width: "0%" });
    tl.to({}, { duration: 1.1 }); // dwell on balanced
    // break it: the taker takes 8 NIGHT instead of 5 → merged Δ = −3.
    tl.addLabel("broken");
    tl.call(() => applyDiscrete(8, 3));
    tl.to(barNight, { width: pct(-3) + "%", duration: 0.45, ease: "power2.out" });
    tl.fromTo(op, { scale: 0.6 }, { scale: 1, duration: 0.3, ease: "back.out(3)", immediateRender: false }, "<");
    tl.to({}, { duration: 1.5 }); // dwell on imbalanced
    // fix it: back to 5 → balanced again, with the settle pop.
    tl.addLabel("rebalanced");
    tl.call(() => applyDiscrete(5, 3));
    tl.to(barNight, { width: "0%", duration: 0.45, ease: "power2.out" });
    tl.fromTo(op, { scale: 0.5, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(3)", immediateRender: false }, "<");
    tl.fromTo(ledger, { scale: 0.97 }, { scale: 1, duration: 0.4, ease: "back.out(2.2)", immediateRender: false }, "<");
    tl.to({}, { duration: 1.2 }); // dwell on balanced
    return tl;
  }

  // Silent reader: play the tour once when scrolled into view (no-narration
  // case — proposal 46 §3 option A). A driver claiming the figure stands this
  // down via `driven`.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
  }, { threshold: 0.3 });
  io.observe(figure);

  // Listener: replay the tour when narration reaches the paired mark. Once a
  // driver claims the figure (`driven`), playLive() no-ops, so this can't fight
  // the driver — the guard the §7 e2e test exercises.
  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  render(false);

  // Register the journey (always — registration ≠ playback: the live page gates
  // animation on reduced-motion via its own triggers, the renderer always
  // captures). Forward-seek contract; transport lives in engine drivers, not here.
  const tour = buildTour();
  // Bake the free-run LOOP_GAP dwell into the journey so the video compositor
  // (and the narration driver's continuous loop) pause on the final frame
  // before looping instead of restarting the instant the motion ends.
  registerFigureJourney("merge-figure", buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill(); // stop the self-play loop scheduler
      loopTimer = null;
      liveTweens.forEach((t) => t.kill()); // stop in-flight live tweens (NOT killTweensOf — it'd nuke the tour)
      liveTweens.length = 0;
      tour.pause(0);
      applyDiscrete(5, 3);
      gsap.set([barNight, barROCK], { width: "0%" });
    },
  }));
}
