// "pledge capital" figure for posts/offer-files.html — what pledges fix about
// launchpad capital flow.
//
// Top panel, the OLD model: your $300 goes into a lock-up contract and sits as
// dead capital for weeks before it can chase the next sale — the pressure that
// drove markets toward ever-shorter (pump.fun-style) launches. Bottom panel,
// the PLEDGE model: the same $300 is pledged to several sales as they appear;
// the first to close takes it and the other pledges die automatically —
// nothing was ever locked.
//
// Two-beat tour (labels):
//   old — coin → lock → weeks of dead capital → the shortness pressure.
//   new — sales pop in staggered as the coin pledges to each; sale B closes
//         first and takes it; A and C flip to "dies ✗".
//
// Build-once (rule 10): every node exists from frame 0 (opacity 0); the sale
// cards' state flips are discrete [data-state]/text swaps via timeline
// .call()s inside fixed-size cards (rule 3 makes them seek-safe); everything
// else is opacity/transform, so the figure box height is invariant across the
// driven frames (rule 16).
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

type SaleState = "pledged" | "won" | "dead";
const SALE_TEXT: Record<SaleState, string> = {
  pledged: "&middot; pledged",
  won: "&middot; closes first &check; takes it",
  dead: "&middot; dies &cross;",
};

const fig = document.getElementById("pledge-capital-figure");
if (fig) initPledgeCapital(fig);

function initPledgeCapital(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "pc-fig";
  stage.innerHTML = `
    <div class="pc-panel pc-old">
      <div class="pc-t pc-t-old">the old launchpad: lock &amp; wait</div>
      <div class="pc-row">
        <span class="pc-coin" data-old-coin>&#128176; $300</span>
        <span class="pc-arr" data-old-arr>&rarr;</span>
        <span class="pc-lock" data-lock>&#128274; locked in contract</span>
        <span class="pc-wait" data-wait>&#8987; weeks of dead capital &rarr; only then re-invest</span>
      </div>
      <div class="pc-note pc-note-old" data-old-note>the pressure: locks must be short &rarr; markets drift to dump-and-reinvest memecoins</div>
    </div>
    <div class="pc-panel pc-new">
      <div class="pc-t pc-t-new">pledges: commit to sales as they come</div>
      <div class="pc-row">
        <span class="pc-coin" data-new-coin>&#128176; $300</span>
        <span class="pc-sale" data-sale="0" data-state="pledged">sale A <span class="pc-sale-s" data-ss>&middot; pledged</span></span>
        <span class="pc-sale" data-sale="1" data-state="pledged">sale B <span class="pc-sale-s" data-ss>&middot; pledged</span></span>
        <span class="pc-sale" data-sale="2" data-state="pledged">sale C <span class="pc-sale-s" data-ss>&middot; pledged</span></span>
      </div>
      <div class="pc-note pc-note-new" data-new-note>the first close takes the money, the rest die automatically &mdash; nothing was ever locked</div>
    </div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("pc-enhanced");

  const q = (sel: string) => stage.querySelector(sel) as HTMLElement;
  const oldCoin = q("[data-old-coin]");
  const oldArr = q("[data-old-arr]");
  const lock = q("[data-lock]");
  const wait = q("[data-wait]");
  const oldNote = q("[data-old-note]");
  const newCoin = q("[data-new-coin]");
  const sales = Array.from(stage.querySelectorAll<HTMLElement>("[data-sale]"));
  const newNote = q("[data-new-note]");

  // A driver (video capture / narrator) takes exclusive control via reset();
  // `driven` stands the live self-play down (rule 7).
  let driven = false;

  /** Discrete state: a sale card's pledged/won/dead flip (text + data-state
   *  the CSS keys off) — set via timeline .call()s inside fixed-size cards. */
  function setSale(i: number, state: SaleState): void {
    const s = sales[i]!;
    s.dataset.state = state;
    (s.querySelector("[data-ss]") as HTMLElement).innerHTML = SALE_TEXT[state];
  }

  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });

    tl.addLabel("old", 0);
    // Frame-zero state-set ON the timeline so the free-run loop replays from a
    // clean slate (late-revealed elements otherwise linger from the previous
    // cycle until their own tween is reached).
    tl.call(() => { setSale(0, "pledged"); setSale(1, "pledged"); setSale(2, "pledged"); });
    tl.set([oldCoin, newCoin], { opacity: 0, x: -10, immediateRender: false }, 0);
    tl.set([oldArr, wait, oldNote, newNote], { opacity: 0, immediateRender: false }, 0);
    tl.set(lock, { opacity: 0, scale: 0.85, immediateRender: false }, 0);
    tl.set(sales, { opacity: 0, y: -8, scale: 1, immediateRender: false }, 0);
    tl.fromTo(oldCoin, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out", immediateRender: false });
    tl.fromTo(oldArr, { opacity: 0 }, { opacity: 1, duration: 0.2, immediateRender: false });
    tl.fromTo(lock, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false });
    tl.fromTo(wait, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, "+=0.3");
    tl.fromTo(oldNote, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, "+=0.25");
    tl.to({}, { duration: 1.6 });

    tl.addLabel("new");
    tl.fromTo(newCoin, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out", immediateRender: false });
    for (let i = 0; i < sales.length; i++) {
      tl.call(() => setSale(i, "pledged"));
      tl.fromTo(sales[i]!, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(2)", immediateRender: false }, i ? "+=0.3" : "+=0.1");
    }
    tl.to({}, { duration: 0.6 });
    tl.call(() => setSale(1, "won"));
    tl.fromTo(sales[1]!, { scale: 1 }, { scale: 1.07, duration: 0.22, yoyo: true, repeat: 1, ease: "power1.inOut", immediateRender: false });
    tl.call(() => { setSale(0, "dead"); setSale(2, "dead"); });
    tl.fromTo(newNote, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, "+=0.3");
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
      setSale(0, "dead");
      setSale(1, "won");
      setSale(2, "dead");
      gsap.set([oldCoin, newCoin], { opacity: 1, x: 0 });
      gsap.set([oldArr, wait, oldNote, newNote], { opacity: 1 });
      gsap.set(lock, { opacity: 1, scale: 1 });
      gsap.set(sales, { opacity: 1, y: 0, scale: 1 });
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
  registerFigureJourney("pledge-capital-figure", buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill();
      loopTimer = null;
      tour.pause(0);
      // Explicit resting values (rule 12: no clearProps).
      setSale(0, "pledged");
      setSale(1, "pledged");
      setSale(2, "pledged");
      gsap.set([oldCoin, newCoin], { opacity: 0, x: -10 });
      gsap.set([oldArr, wait, oldNote, newNote], { opacity: 0 });
      gsap.set(lock, { opacity: 0, scale: 0.85 });
      gsap.set(sales, { opacity: 0, y: -8, scale: 1 });
    },
  }));
}
