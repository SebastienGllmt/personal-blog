// "auction flow" figure for posts/offer-files.html — the inverted flow: the
// BIDS are the offer files.
//
// Three bidders each send the seller an offer file; the seller settles exactly
// one — the best — in a single on-chain transaction; the losing bids never
// touch the chain (they expire, or their owners spend the coins behind them,
// which IS withdrawal). No escrow at any point.
//
// Three-beat loop (labels):
//   bids   — the bids arrive one at a time, in escalating order (95 → 100 →
//            120★), sliding toward the seller.
//   best   — the best bid highlights and GROWS ITS CONNECTOR: a → arrow
//            appears from the winning bid toward the seller (only the selected
//            bid is consumed, so only it gets an arrow). The seller and settle
//            boxes sit vertically aligned with this middle row.
//   settle — a second → connector plus the settle card (1 tx on Midnight);
//            the losers strike through as expired/withdrawn.
//
// Build-once (rule 10): every node exists from frame 0; all motion is
// opacity/transform; the loser strike-through is a [data-step] style swap (an
// opaque colour change, never an opacity dim — rule 17), so the figure box
// height is invariant across the driven frames (rule 16).
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

type Step = "bids" | "best" | "settle";

const NOTE: Record<Step, string> = {
  bids:
    "Each bid is an <b>offer file</b> sent to the seller &mdash; the bidder's funds never leave their own wallet, merely committed.",
  best:
    "The seller settles exactly <b>one</b>: the best. Nobody escrowed anything to get here.",
  settle:
    "One on-chain transaction settles it. The losing bids <b>never touch the chain</b> &mdash; they expire, or their owners withdraw by spending the coin behind them.",
};

const fig = document.getElementById("auction-figure");
if (fig) initAuctionFlow(fig);

function initAuctionFlow(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "auc-fig";
  stage.dataset.step = "bids";
  stage.innerHTML = `
    <div class="auc-grid">
      <div class="auc-col auc-bids">
        <div class="auc-bidrow" data-bidrow><div class="auc-bid">bid: 100 &#127769; &rarr; NFT</div><span class="auc-arr auc-arr-ghost" aria-hidden="true">&rarr;</span></div>
        <div class="auc-bidrow" data-bidrow><div class="auc-bid auc-bid-best" data-best>bid: 120 &#127769; &rarr; NFT &starf;</div><span class="auc-arr" data-arr1 aria-hidden="true">&rarr;</span></div>
        <div class="auc-bidrow" data-bidrow><div class="auc-bid">bid: 95 &#127769; &rarr; NFT</div><span class="auc-arr auc-arr-ghost" aria-hidden="true">&rarr;</span></div>
      </div>
      <div class="auc-col auc-seller"><b>seller</b><span>settles the best bid</span></div>
      <span class="auc-arr auc-arr2" data-arr2 aria-hidden="true">&rarr;</span>
      <div class="auc-col auc-settle" data-settle><b>1 tx</b><span>on Midnight &check;</span></div>
      <div class="auc-bids-h">each bid = an offer file</div>
    </div>
    <p class="auc-readout" data-readout></p>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("auc-enhanced");

  const q = <T extends Element>(sel: string) => stage.querySelector(sel) as T;
  const bidrows = Array.from(stage.querySelectorAll<HTMLElement>("[data-bidrow]"));
  const best = q<HTMLElement>("[data-best]");
  const arr1 = q<HTMLElement>("[data-arr1]");
  const arr2 = q<HTMLElement>("[data-arr2]");
  const settle = q<HTMLElement>("[data-settle]");
  const readout = q<HTMLElement>("[data-readout]");

  // A driver (video capture / narrator) takes exclusive control via reset();
  // `driven` stands the live self-play down (rule 7).
  let driven = false;

  /** Discrete state per step: the readout text and the data-step key the CSS
   *  accents hang off (best-bid highlight, loser strike-through). */
  function applyStep(step: Step): void {
    stage.dataset.step = step;
    readout.innerHTML = NOTE[step];
  }

  applyStep("bids");

  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });

    tl.addLabel("bids", 0);
    tl.call(() => applyStep("bids"));
    // Frame-zero state-set ON the timeline so the free-run loop replays from a
    // clean slate (see the comment in longtermSeries.ts).
    tl.set(bidrows, { opacity: 0, x: -22, immediateRender: false }, 0);
    tl.set([arr1, arr2], { opacity: 0, x: -6, immediateRender: false }, 0);
    tl.set(settle, { opacity: 0, scale: 0.75, immediateRender: false }, 0);
    tl.set(best, { scale: 1, immediateRender: false }, 0);
    // Bids arrive one at a time, in escalating order (95 → 100 → 120★), each
    // sliding rightward toward the seller — it should FEEL like an auction.
    for (const i of [2, 0, 1]) {
      tl.fromTo(bidrows[i]!, { opacity: 0, x: -22 }, { opacity: 1, x: 0, duration: 0.45, ease: "power2.out", immediateRender: false }, "+=0.35");
    }
    tl.to({}, { duration: 1.0 });

    tl.addLabel("best");
    tl.call(() => applyStep("best"));
    tl.fromTo(best, { scale: 1 }, { scale: 1.08, duration: 0.25, yoyo: true, repeat: 1, ease: "power1.inOut", immediateRender: false });
    // The connector materialises as part of the SELECTION — only the winning
    // bid grows an arrow toward the seller.
    tl.fromTo(arr1, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out", immediateRender: false }, "<0.2");
    tl.to({}, { duration: 1.4 });

    tl.addLabel("settle");
    tl.call(() => applyStep("settle"));
    tl.fromTo(arr2, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out", immediateRender: false });
    tl.fromTo(settle, { opacity: 0, scale: 0.75 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, "<0.1");
    tl.to({}, { duration: 2.0 });

    return tl;
  }

  const tour = buildTour();

  let loopTimer: gsap.core.Tween | null = null;
  function playLive(): void {
    if (driven) return; // a driver owns the figure; stay out of its way
    if (reduced) {
      // Reduced motion: the settled (final) state.
      tour.pause(0);
      applyStep("settle");
      gsap.set(bidrows, { opacity: 1, x: 0 });
      gsap.set(best, { scale: 1 });
      gsap.set([arr1, arr2], { opacity: 1, x: 0 });
      gsap.set(settle, { opacity: 1, scale: 1 });
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
  registerFigureJourney("auction-figure", buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill();
      loopTimer = null;
      tour.pause(0);
      applyStep("bids");
      // Explicit resting values (rule 12: no clearProps).
      gsap.set(bidrows, { opacity: 0, x: -22 });
      gsap.set(best, { scale: 1 });
      gsap.set([arr1, arr2], { opacity: 0, x: -6 });
      gsap.set(settle, { opacity: 0, scale: 0.75 });
    },
  }));
}
