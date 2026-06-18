// "Transients are interactive" figure for posts/offer-files.html (the
// "Chaining needs a transient" section, alongside the merge-vs-transient list
// and the ZswapTransient struct figure).
//
// Shows the two chaining cases from the list as concrete chains: one party's
// swap makes the middle coin, the other party's offer folds it in. The catch
// the figure makes explicit: the unit that gets handed over is a whole
// `Transient` STRUCT (coin_com + nullifier + both proofs — see the
// ZswapTransient struct figure), not a bare nullifier, and only the coin's owner
// can build it (its nullifier is Hash(coin, sender-secret-key)). So the
// `Transient` chip travels from the owner's swap into the receiver's offer.
//   their coin → your offer : the Transient travels from their swap
//   your coin  → their offer: the Transient travels from your swap
// (Verified against midnight-ledger: zswap/src/structure.rs `Transient` /
// `Offer.transient`, construct.rs `Transient::new_from_*`, coin-structure
// coin.rs `nullifier`; `Offer::merge` is a disjoint union needing no handoff.)
//
// Same enhancement + FigureJourney contract as figures/mergeVsChain.ts. See
// engine client/figureAnimation.ts and the `figure-journey` skill.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

// Seconds to dwell on the final frame before the loop replays. Shared by the
// in-page free-run loop and the registered journey (baked in via
// buildLoopingJourney) so the page and the rendered video pause identically.
const LOOP_GAP = 2.2;

const THEIR_READOUT =
  "<b>Their coin</b> is in the middle, so they build the whole <b>Transient</b> - commitment, nullifier, and both proofs - and hand it over; you drop it straight into your offer.";
const YOUR_READOUT =
  "<b>Your coin</b> is in the middle now, so you build the <b>Transient</b> and hand it to them.";

const fig = document.getElementById("transient-interactive-figure");
if (fig) initTransientHandoff(fig);

function initTransientHandoff(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const row = (which: "their" | "yours") => {
    const ownerSwap = which === "their" ? "their swap" : "your swap";
    const recvOffer = which === "their" ? "your offer" : "their offer";
    const head =
      which === "their"
        ? `Chain <strong>their</strong> coin into your offer`
        : `Chain <strong>your</strong> coin into their offer`;
    return `
      <div class="th-row" data-row="${which}">
        <div class="th-row-head"><span class="th-tag">Chain</span> ${head}</div>
        <div class="th-flow">
          <div class="th-party owner">${ownerSwap}<span class="th-sub">builds the transient</span></div>
          <div class="th-track">
            <span class="th-path" data-contrast="exempt" aria-hidden="true"></span>
            <span class="th-tx" data-tx="${which}">
              <span class="th-tx-name">Transient</span><span class="th-tx-fields">coin_com &middot; nullifier</span>
            </span>
          </div>
          <div class="th-party recv">${recvOffer}</div>
        </div>
      </div>`;
  };

  const stage = document.createElement("div");
  stage.className = "th-fig";
  stage.innerHTML = `
    ${row("their")}
    ${row("yours")}
    <div class="th-readout-wrap">
      <p class="th-readout-sizer" aria-hidden="true">${THEIR_READOUT}</p>
      <p class="th-readout" data-readout></p>
    </div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("th-enhanced");

  const q = <T extends Element>(sel: string) => stage.querySelector(sel) as T;
  const rowTheir = q<HTMLElement>('[data-row="their"]');
  const rowYours = q<HTMLElement>('[data-row="yours"]');
  const txTheir = q<HTMLElement>('[data-tx="their"]');
  const txYours = q<HTMLElement>('[data-tx="yours"]');
  const readout = q<HTMLElement>("[data-readout]");

  // A driver (video capture / narrator) takes exclusive control via reset();
  // `driven` stands the live triggers down. Build-once journey, no spawned nodes,
  // so reset() is pause(0) + explicit-value restore (never killTweensOf).
  let driven = false;

  /** Discrete state for a step: which row is active + the readout copy. */
  function setActive(which: "their" | "yours"): void {
    const theirActive = which === "their";
    rowTheir.classList.toggle("is-active", theirActive);
    rowYours.classList.toggle("is-active", !theirActive);
    readout.innerHTML = theirActive ? THEIR_READOUT : YOUR_READOUT;
  }

  /** Snap to the journey's first frame: their-coin active, both Transient chips
   *  parked at their owner swap (left: 0%). */
  function showInitial(): void {
    setActive("their");
    gsap.set([txTheir, txYours], { left: "0%" });
  }

  // ----- self-playing tour: their coin → your coin ----------------------------
  // The Transient chip slides (left %) from the owner's swap into the receiver's
  // offer, making the handoff explicit. Position only — never opacity — so the
  // load-bearing chip is legible at every held state (rule 17).
  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    tl.addLabel("their", 0);
    tl.call(() => setActive("their"));
    tl.fromTo(txTheir, { left: "0%" }, { left: "100%", duration: 1.2, ease: "power1.inOut", immediateRender: false });
    tl.to({}, { duration: 1.1 }); // dwell on their-coin
    tl.addLabel("yours");
    tl.call(() => setActive("yours"));
    tl.fromTo(txYours, { left: "0%" }, { left: "100%", duration: 1.2, ease: "power1.inOut", immediateRender: false });
    tl.to({}, { duration: 1.3 }); // dwell on your-coin
    return tl;
  }

  // ----- self-play drives the SAME tour the journey exposes (rules 1 & 7) ------
  let loopTimer: gsap.core.Tween | null = null;
  function playLive(): void {
    if (driven) return; // a driver owns the figure; stay out of its way
    if (reduced) {
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

  // Silent reader: play the tour once when scrolled into view.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
  }, { threshold: 0.3 });
  io.observe(figure);

  // Replay the tour when narration reaches the paired mark.
  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  const tour = buildTour();
  registerFigureJourney("transient-interactive-figure", buildLoopingJourney({
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
