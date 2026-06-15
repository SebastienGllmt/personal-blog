// Launchpad figures for posts/offer-files.html — the token-sale story, split
// into small figures introduced at different points in the section
// (one idea each, per author feedback):
//
//   launchpad-basic-figure   — the basic launchpad: pledges (offer files for a
//                              token that doesn't exist yet) arrive one by one
//                              and fill the meter to the target; "mint" pops.
//                              Labels: pile → mint.
//   pledge-promise-figure    — why a pledge means anything: on a typical chain
//                              a pledge is a promise (the sale closes, everyone
//                              must come back and sign, most never do); on
//                              Midnight a pledge IS a zSwap (already proven,
//                              the project settles all of them, nobody comes
//                              back).  Labels: promise → zswap.
//   launchpad-rollout-figure — the ~18-zSwaps-per-tx limit: settlement rolls
//                              out in waves; a pledge withdrawn mid-rollout
//                              closes the sale short.  Labels: rollout → grief
//                              (the narration step join-point).
//   launchpad-tickets-figure — the systematic fix: past 80% settle pledges for
//                              irrevocable tickets; at 100% they convert.
//                              Labels: settle → convert.
//
// All three are build-once (rule 10): every node exists from frame 0; all
// motion is opacity/transform (the meter is a scaleX fill), so each figure box
// height is invariant across the driven frames (rule 16).
//
// Same enhancement contract as the other offer-files figures (see
// deltasVanish.ts): progressive enhancement over a static SVG,
// narration-synced, IntersectionObserver intro, reduced-motion aware. External
// module for the production CSP; GSAP only writes CSSOM. Each figure registers
// its own FigureJourney so the narrator and the offline video renderer drive
// the same animation.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

const LOOP_GAP = 2.5;

/** Shared wiring: live free-run loop with the dwell gap, IO intro, narration
 *  replay, and the looping-journey registration (rules 7 and 15). */
function wireFigure(opts: {
  id: string;
  figure: HTMLElement;
  tour: gsap.core.Timeline;
  reduced: boolean;
  settle: () => void; // reduced-motion settled (final) state
  restore: () => void; // explicit frame-0 values (rule 12)
}): void {
  const { id, figure, tour, reduced, settle, restore } = opts;
  let driven = false;
  let loopTimer: gsap.core.Tween | null = null;

  function playLive(): void {
    if (driven) return; // a driver owns the figure; stay out of its way
    if (reduced) {
      tour.pause(0);
      settle();
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

  registerFigureJourney(id, buildLoopingJourney({
    playMs: tour.duration() * 1000,
    labels: tour.labels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => tour.time(ms / 1000),
    reset() {
      driven = true;
      loopTimer?.kill();
      loopTimer = null;
      tour.pause(0);
      restore();
    },
  }));
}

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- basic ----
const basicFig = document.getElementById("launchpad-basic-figure");
if (basicFig) initBasic(basicFig);

function initBasic(figure: HTMLElement): void {
  const stage = document.createElement("div");
  stage.className = "lpb-fig";
  stage.innerHTML = `
    <div class="lpb-h">pledges pile up off-chain</div>
    <div class="lpb-chips">
      <span class="lpb-chip" data-chip>zswapoffer1qpz&hellip;</span>
      <span class="lpb-chip" data-chip>zswapoffer1m4e&hellip;</span>
      <span class="lpb-chip" data-chip>zswapoffer1x7c&hellip;</span>
      <span class="lpb-chip" data-chip>zswapoffer1t9h&hellip;</span>
      <span class="lpb-more" data-more>+ hundreds more&hellip;</span>
    </div>
    <div class="lpb-meter-row">
      <!-- data-contrast="exempt": at scaleX(1) the fill covers its own track, so
           there is no adjacent colour to measure against; the state is carried
           redundantly by the mint badge and the caption (gated). -->
      <div class="lpb-meter"><div class="lpb-fill" data-fill data-contrast="exempt"></div><div class="lpb-target" aria-hidden="true"></div></div>
      <span class="lpb-mint" data-mint>target &check; &rarr; mint</span>
    </div>
    <div class="lpb-note">each pledge = an offer file wanting a token that doesn't exist yet</div>
    <div class="lpb-note">cross the target &rarr; the project mints the token and accepts them all</div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("lpb-enhanced");

  const fill = stage.querySelector("[data-fill]") as HTMLElement;
  const mint = stage.querySelector("[data-mint]") as HTMLElement;
  const chips = Array.from(stage.querySelectorAll<HTMLElement>("[data-chip]"));
  const more = stage.querySelector("[data-more]") as HTMLElement;

  const tl = gsap.timeline({ paused: true });
  tl.addLabel("pile", 0);
  // Frame-zero state-set ON the timeline so the free-run loop replays from a
  // clean slate (see the comment in longtermSeries.ts).
  tl.set(chips, { opacity: 0, y: -8, immediateRender: false }, 0);
  tl.set(more, { opacity: 0, immediateRender: false }, 0);
  tl.set(mint, { opacity: 0, scale: 0.7, immediateRender: false }, 0);
  tl.set(fill, { scaleX: 0, immediateRender: false }, 0);
  // Each arriving offer file bumps the meter a step — the pile IS the files.
  for (let i = 0; i < chips.length; i++) {
    tl.fromTo(chips[i]!, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(2)", immediateRender: false }, i ? "+=0.15" : 0);
    tl.to(fill, { scaleX: (i + 1) * 0.2, duration: 0.25, ease: "power1.out" }, "<0.05");
  }
  tl.fromTo(more, { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, "+=0.15");
  tl.to(fill, { scaleX: 1, duration: 0.35, ease: "power1.inOut" }, "<");
  tl.addLabel("mint");
  tl.fromTo(mint, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false });
  tl.to({}, { duration: 1.9 });

  wireFigure({
    id: "launchpad-basic-figure", figure, tour: tl, reduced,
    settle() {
      gsap.set(chips, { opacity: 1, y: 0 });
      gsap.set(more, { opacity: 1 });
      gsap.set(fill, { scaleX: 1 });
      gsap.set(mint, { opacity: 1, scale: 1 });
    },
    restore() {
      gsap.set(chips, { opacity: 0, y: -8 });
      gsap.set(more, { opacity: 0 });
      gsap.set(fill, { scaleX: 0 });
      gsap.set(mint, { opacity: 0, scale: 0.7 });
    },
  });
}

// -------------------------------------------------------------- promise ----
const promiseFig = document.getElementById("pledge-promise-figure");
if (promiseFig) initPromise(promiseFig);

function initPromise(figure: HTMLElement): void {
  const buyer = () =>
    `<span class="lpp-chip lpp-buyer" data-buyer data-state="promised">&#128100; <span data-bs>promised</span></span>`;
  const pledge = () =>
    `<span class="lpp-chip lpp-pledge" data-pledge data-state="proven">&#128196; <span data-ps>proven &check;</span></span>`;

  const stage = document.createElement("div");
  stage.className = "lpp-fig";
  stage.innerHTML = `
    <div class="lpp-panel lpp-old">
      <div class="lpp-t lpp-t-old">a typical chain: a pledge is a promise</div>
      <div class="lpp-row">${buyer()}${buyer()}${buyer()}${buyer()}</div>
      <div class="lpp-ev" data-old-ev data-state="counting">&#9201; sale closes in 3&hellip;</div>
      <div class="lpp-note lpp-note-old" data-old-note>most never come back &mdash; the sale collects 1 of 4</div>
    </div>
    <div class="lpp-panel lpp-new">
      <div class="lpp-t lpp-t-new">Midnight: a pledge <em>is</em> a zSwap</div>
      <div class="lpp-row">${pledge()}${pledge()}${pledge()}${pledge()}</div>
      <div class="lpp-ev" data-new-ev data-state="counting">&#9201; sale closes in 3&hellip;</div>
      <div class="lpp-note lpp-note-new" data-new-note>already executable &mdash; the project settles 4 of 4; nobody comes back</div>
    </div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("lpp-enhanced");

  const q = (sel: string) => stage.querySelector(sel) as HTMLElement;
  const buyers = Array.from(stage.querySelectorAll<HTMLElement>("[data-buyer]"));
  const pledges = Array.from(stage.querySelectorAll<HTMLElement>("[data-pledge]"));
  const oldEv = q("[data-old-ev]");
  const oldNote = q("[data-old-note]");
  const newEv = q("[data-new-ev]");
  const newNote = q("[data-new-note]");

  /** Discrete state: a buyer chip's promised/signs/gone flip and a pledge
   *  chip's proven/settled flip (text + data-state the CSS keys off) — set via
   *  timeline .call()s inside fixed-size chips. */
  const BUYER_TEXT = { promised: "promised", signs: "signs &check;", gone: "never returns" } as const;
  function setBuyer(i: number, state: keyof typeof BUYER_TEXT): void {
    const b = buyers[i]!;
    b.dataset.state = state;
    (b.querySelector("[data-bs]") as HTMLElement).innerHTML = BUYER_TEXT[state];
  }
  function setPledge(i: number, state: "proven" | "settled"): void {
    const p = pledges[i]!;
    p.dataset.state = state;
    (p.querySelector("[data-ps]") as HTMLElement).innerHTML = state === "proven" ? "proven &check;" : "settled &check;";
  }
  function setTimer(el: HTMLElement, state: "counting" | "closed", html: string): void {
    el.dataset.state = state;
    el.innerHTML = html;
  }
  /** The shared countdown beat: ⏱ 3… 2… 1… then "sale closed". The CONTRAST is
   *  what happens at zero, so both panels tick identically. */
  function countdown(tl: gsap.core.Timeline, el: HTMLElement, closedHtml: string): void {
    tl.call(() => setTimer(el, "counting", "&#9201; sale closes in 3&hellip;"));
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25, immediateRender: false });
    tl.call(() => setTimer(el, "counting", "&#9201; sale closes in 2&hellip;"), undefined, "+=0.55");
    tl.call(() => setTimer(el, "counting", "&#9201; sale closes in 1&hellip;"), undefined, "+=0.55");
    tl.call(() => setTimer(el, "closed", "&#9201; 0 &mdash; sale closed"), undefined, "+=0.55");
    tl.to({}, { duration: 0.01 });
  }

  const tl = gsap.timeline({ paused: true });
  tl.addLabel("promise", 0);
  // Frame-zero state-set ON the timeline so the free-run loop replays from a
  // clean slate (see the comment in longtermSeries.ts).
  tl.call(() => {
    for (let i = 0; i < buyers.length; i++) setBuyer(i, "promised");
    for (let i = 0; i < pledges.length; i++) setPledge(i, "proven");
    setTimer(oldEv, "counting", "&#9201; sale closes in 3&hellip;");
    setTimer(newEv, "counting", "&#9201; sale closes in 3&hellip;");
  });
  tl.set([...buyers, ...pledges], { opacity: 0, y: -8, scale: 1, immediateRender: false }, 0);
  tl.set([oldEv, oldNote, newEv, newNote], { opacity: 0, immediateRender: false }, 0);
  for (let i = 0; i < buyers.length; i++) {
    tl.call(() => setBuyer(i, "promised"));
    tl.fromTo(buyers[i]!, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.25, ease: "back.out(2)", immediateRender: false }, i ? "+=0.12" : 0);
  }
  countdown(tl, oldEv, "");
  // …and then nothing happens. That awkward silence is the point: everyone has
  // to come back and sign, and only one ever does.
  tl.to({}, { duration: 0.9 });
  tl.call(() => setBuyer(0, "signs"));
  tl.fromTo(buyers[0]!, { scale: 1 }, { scale: 1.06, duration: 0.2, yoyo: true, repeat: 1, ease: "power1.inOut", immediateRender: false });
  tl.to({}, { duration: 0.6 });
  tl.call(() => setBuyer(1, "gone"));
  tl.call(() => { setBuyer(2, "gone"); setBuyer(3, "gone"); }, undefined, "+=0.3");
  tl.fromTo(oldNote, { opacity: 0 }, { opacity: 1, duration: 0.35, immediateRender: false }, "+=0.2");
  tl.to({}, { duration: 1.5 });

  tl.addLabel("zswap");
  for (let i = 0; i < pledges.length; i++) {
    tl.call(() => setPledge(i, "proven"));
    tl.fromTo(pledges[i]!, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.25, ease: "back.out(2)", immediateRender: false }, i ? "+=0.12" : "+=0.1");
  }
  countdown(tl, newEv, "");
  // The instant the timer hits zero, EVERY pledge settles — no lag, nobody
  // comes back.
  tl.call(() => { for (let i = 0; i < pledges.length; i++) setPledge(i, "settled"); });
  tl.fromTo(pledges, { scale: 1 }, { scale: 1.06, duration: 0.2, yoyo: true, repeat: 1, ease: "power1.inOut", immediateRender: false, stagger: 0.04 });
  tl.fromTo(newNote, { opacity: 0 }, { opacity: 1, duration: 0.35, immediateRender: false }, "+=0.2");
  tl.to({}, { duration: 2.0 });

  wireFigure({
    id: "pledge-promise-figure", figure, tour: tl, reduced,
    settle() {
      setBuyer(0, "signs");
      setBuyer(1, "gone");
      setBuyer(2, "gone");
      setBuyer(3, "gone");
      for (let i = 0; i < pledges.length; i++) setPledge(i, "settled");
      setTimer(oldEv, "closed", "&#9201; 0 &mdash; sale closed");
      setTimer(newEv, "closed", "&#9201; 0 &mdash; sale closed");
      gsap.set([...buyers, ...pledges], { opacity: 1, y: 0, scale: 1 });
      gsap.set([oldEv, oldNote, newEv, newNote], { opacity: 1 });
    },
    restore() {
      for (let i = 0; i < buyers.length; i++) setBuyer(i, "promised");
      for (let i = 0; i < pledges.length; i++) setPledge(i, "proven");
      setTimer(oldEv, "counting", "&#9201; sale closes in 3&hellip;");
      setTimer(newEv, "counting", "&#9201; sale closes in 3&hellip;");
      gsap.set([...buyers, ...pledges], { opacity: 0, y: -8, scale: 1 });
      gsap.set([oldEv, oldNote, newEv, newNote], { opacity: 0 });
    },
  });
}

// -------------------------------------------------------------- rollout ----
const rolloutFig = document.getElementById("launchpad-rollout-figure");
if (rolloutFig) initRollout(rolloutFig);

function initRollout(figure: HTMLElement): void {
  const stage = document.createElement("div");
  stage.className = "lpr-fig";
  stage.innerHTML = `
    <div class="lpr-h">settlement rolls out in waves (~18 zSwaps per tx)</div>
    <div class="lpr-txs">
      <div class="lpr-tx" data-tx1><b>tx 1 &middot; ~18 zSwaps</b><span class="lpr-stamp" data-stamp1>settled &check;</span></div>
      <div class="lpr-tx" data-tx2><b>tx 2 &middot; ~18 zSwaps</b><span class="lpr-stamp" data-stamp2>settled &check;</span></div>
      <div class="lpr-tx lpr-tx-3" data-tx3><b>tx 3 &middot; pending&hellip;</b><span class="lpr-stamp lpr-stamp-bad" data-stamp3>a pledge withdrawn &cross;</span></div>
    </div>
    <div class="lpr-short" data-short>&rarr; the sale closes short</div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("lpr-enhanced");

  const q = (sel: string) => stage.querySelector(sel) as HTMLElement;
  const stamp1 = q("[data-stamp1]");
  const stamp2 = q("[data-stamp2]");
  const stamp3 = q("[data-stamp3]");
  const tx3 = q("[data-tx3]");
  const short = q("[data-short]");

  const tl = gsap.timeline({ paused: true });
  tl.addLabel("rollout", 0);
  tl.call(() => { stage.dataset.step = "rollout"; });
  // Frame-zero state-set ON the timeline so the free-run loop replays from a
  // clean slate (see the comment in longtermSeries.ts).
  tl.set([stamp1, stamp2, stamp3], { opacity: 0, scale: 0.7, immediateRender: false }, 0);
  tl.set(tx3, { x: 0, immediateRender: false }, 0);
  tl.set(short, { opacity: 0, immediateRender: false }, 0);
  tl.fromTo(stamp1, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false });
  tl.to({}, { duration: 0.45 });
  tl.fromTo(stamp2, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false });
  tl.to({}, { duration: 1.0 });
  tl.addLabel("grief");
  tl.call(() => { stage.dataset.step = "grief"; });
  tl.to(tx3, { keyframes: [{ x: -3 }, { x: 3 }, { x: -2 }, { x: 2 }, { x: 0 }], duration: 0.4, ease: "none" });
  tl.fromTo(stamp3, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, "<0.15");
  tl.fromTo(short, { opacity: 0 }, { opacity: 1, duration: 0.35, immediateRender: false });
  tl.to({}, { duration: 2.0 });

  wireFigure({
    id: "launchpad-rollout-figure", figure, tour: tl, reduced,
    settle() {
      stage.dataset.step = "grief";
      gsap.set([stamp1, stamp2, stamp3], { opacity: 1, scale: 1 });
      gsap.set(tx3, { x: 0 });
      gsap.set(short, { opacity: 1 });
    },
    restore() {
      stage.dataset.step = "rollout";
      gsap.set([stamp1, stamp2, stamp3], { opacity: 0, scale: 0.7 });
      gsap.set(tx3, { x: 0 });
      gsap.set(short, { opacity: 0 });
    },
  });
}

// -------------------------------------------------------------- tickets ----
const ticketsFig = document.getElementById("launchpad-tickets-figure");
if (ticketsFig) initTickets(ticketsFig);

function initTickets(figure: HTMLElement): void {
  const stage = document.createElement("div");
  stage.className = "lpt-fig";
  stage.innerHTML = `
    <div class="lpt-h">the systematic fix: tickets</div>
    <div class="lpt-row">
      <span class="lpt-chip lpt-chip-settle" data-settle>past 80%: the zSwap batches settle early &rarr; &#127903;</span>
      <span class="lpt-arr" data-arr>&rarr;</span>
      <span class="lpt-chip lpt-chip-convert" data-convert>at 100%: a Compact contract converts &#127903; &rlarr; token</span>
    </div>
    <div class="lpt-note" data-note>each ~18-zSwap batch locks pledges in as tickets - the griefing window shrinks as it runs</div>`;

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("lpt-enhanced");

  const q = (sel: string) => stage.querySelector(sel) as HTMLElement;
  const settleChip = q("[data-settle]");
  const arr = q("[data-arr]");
  const convertChip = q("[data-convert]");
  const note = q("[data-note]");

  const tl = gsap.timeline({ paused: true });
  tl.addLabel("settle", 0);
  // Frame-zero state-set ON the timeline so the free-run loop replays from a
  // clean slate (see the comment in longtermSeries.ts).
  tl.set([settleChip, convertChip], { opacity: 0, scale: 0.8, immediateRender: false }, 0);
  tl.set([arr, note], { opacity: 0, immediateRender: false }, 0);
  tl.fromTo(settleChip, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false });
  tl.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.35, immediateRender: false });
  tl.to({}, { duration: 0.8 });
  tl.addLabel("convert");
  tl.fromTo(arr, { opacity: 0 }, { opacity: 1, duration: 0.25, immediateRender: false });
  tl.fromTo(convertChip, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, "<0.1");
  tl.to({}, { duration: 2.0 });

  wireFigure({
    id: "launchpad-tickets-figure", figure, tour: tl, reduced,
    settle() {
      gsap.set([settleChip, convertChip], { opacity: 1, scale: 1 });
      gsap.set([arr, note], { opacity: 1 });
    },
    restore() {
      gsap.set([settleChip, convertChip], { opacity: 0, scale: 0.8 });
      gsap.set([arr, note], { opacity: 0 });
    },
  });
}
