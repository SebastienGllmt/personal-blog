// Animated "the batcher pays the fee" figure for the batcher post.
//
// A left→right flow of three nodes: a Midnight user (no TIA), the batcher
// (holds TIA, pays the fee), and Celestia (the public bulletin board). A packet
// carrying the user's offer travels user → batcher; at the batcher a "+ TIA
// fee" tag attaches (the batcher is paying); the packet then travels batcher →
// Celestia and lands as "posted ✓". Takeaway: the user never needs Celestia's
// token — they hand the offer to the batcher, which submits the blob and pays
// the TIA fee on their behalf.
//
// External module for the same CSP reason as the other figures (see
// client/figures/hashAvalanche.ts). GSAP only writes CSSOM. Enhancement
// contract is identical: static SVG fallback, `.bat-enhanced`,
// IntersectionObserver intro, `narration-active` replay, reduced-motion aware.
import { gsap } from "gsap";
import { registerFigureJourney, stepsFromLabels } from "../engine/client/figureAnimation.ts";

interface Node {
  icon: string;
  title: string;
  note: string;
}

const NODES: Node[] = [
  { icon: "👤", title: "User", note: "holds Midnight assets &middot; no TIA" },
  { icon: "🧰", title: "Batcher", note: "holds TIA &middot; pays the fee" },
  { icon: "🟪", title: "Celestia", note: "public bulletin board" },
];

const INTRO =
  "The user hands their offer to the batcher — they never touch Celestia's token. Press play, or just listen.";
const DONE =
  "The user never needs TIA: they just hand the offer to the batcher, which posts the blob to Celestia and pays the TIA fee on their behalf.";

const initFigure = (figure: HTMLElement): void => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "bat-fig";

  const parts: string[] = ['<div class="flow">'];
  NODES.forEach((n, i) => {
    if (i > 0) parts.push('<div class="link"><span class="link-fill"></span></div>');
    parts.push(
      `<div class="node" data-node="${i}">
         <div class="icon">${n.icon}</div>
         <div class="n-title">${n.title}</div>
         <div class="n-note">${n.note}</div>
       </div>`,
    );
  });
  parts.push("</div>");
  parts.push(
    `<div class="track" data-track>
       <span class="packet" data-packet>offer</span>
       <span class="fee-tag" data-fee>+ TIA fee</span>
       <span class="posted" data-posted>posted &check;</span>
     </div>`,
  );
  parts.push(
    `<div class="controls">
       <button type="button" class="replay" data-replay>&#9654; Play the flow</button>
       <div class="cap-wrap">
         <p class="step-caption-sizer" aria-hidden="true">${DONE}</p>
         <p class="step-caption" data-caption>${INTRO}</p>
       </div>
     </div>`,
  );
  stage.innerHTML = parts.join("");

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("bat-enhanced");

  const nodeEls = Array.from(stage.querySelectorAll<HTMLElement>(".node"));
  const linkFills = Array.from(stage.querySelectorAll<HTMLElement>(".link-fill"));
  const captionEl = stage.querySelector<HTMLElement>("[data-caption]")!;
  const replayBtn = stage.querySelector<HTMLButtonElement>("[data-replay]")!;
  const packet = stage.querySelector<HTMLElement>("[data-packet]")!;
  const feeTag = stage.querySelector<HTMLElement>("[data-fee]")!;
  const posted = stage.querySelector<HTMLElement>("[data-posted]")!;

  let liveTl: gsap.core.Timeline | null = null;
  let loopTimer: gsap.core.Tween | null = null;
  // A driver (video capture today, narrator later) has taken exclusive control
  // via the journey's reset(); while set, the page's own auto-play stands down
  // so it can't fight the driver's scrubbing.
  let driven = false;

  // x-translate that puts `ref`'s center under `el`'s center. Transform-aware:
  // it adds back `ref`'s current translate so the result is correct even on a
  // replay where ref still carries an `x` from the previous run.
  const centerX = (el: HTMLElement, ref: HTMLElement): number => {
    const r = el.getBoundingClientRect();
    const rr = ref.getBoundingClientRect();
    const curX = Number(gsap.getProperty(ref, "x")) || 0;
    return r.left + r.width / 2 - (rr.left + rr.width / 2) + curX;
  };

  // First-frame state (no timeline kill — that's stopLive()).
  const resetState = (): void => {
    nodeEls.forEach((el) => el.classList.remove("lit"));
    linkFills.forEach((el) => { el.style.width = "0%"; });
    gsap.set(packet, { x: 0, y: 0, opacity: 0, scale: 1 });
    gsap.set(feeTag, { x: 0, opacity: 0, scale: 0.6, y: 0 });
    gsap.set(posted, { x: 0, opacity: 0, scale: 0.6 });
    captionEl.innerHTML = INTRO;
  };

  const stopLive = (): void => {
    liveTl?.kill();
    liveTl = null;
    loopTimer?.kill();
    loopTimer = null;
  };

  const lightAll = (): void => {
    nodeEls.forEach((el) => el.classList.add("lit"));
    linkFills.forEach((el) => { el.style.width = "100%"; });
    gsap.set(packet, { opacity: 0 });
    gsap.set(feeTag, { opacity: 0 });
    gsap.set(posted, { opacity: 1, scale: 1, x: centerX(nodeEls[2]!, posted) });
    captionEl.innerHTML = DONE;
  };

  // The journey: the canonical flow as ONE paused, labeled timeline — built by
  // the same code the page plays, so capture and the page never diverge. NOTE:
  // `from`/`fromTo` use immediateRender:false so *building* a paused instance
  // (for the journey registration) doesn't mutate the live DOM; states apply as
  // each tween is reached when seeked/played forward.
  const buildFlow = (): gsap.core.Timeline => {
    const t = gsap.timeline({ paused: true });

    t.addLabel("user", 0);
    t.add(() => { captionEl.innerHTML = NODES[0]!.note + " &mdash; building an offer."; });
    t.fromTo(nodeEls[0]!, { scale: 0.92 }, {
      scale: 1, duration: 0.35, ease: "back.out(2.4)", immediateRender: false,
      onStart() { nodeEls[0]!.classList.add("lit"); },
    });
    t.set(packet, { x: centerX(nodeEls[0]!, packet), opacity: 0, scale: 0.7 });
    t.to(packet, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" });

    t.addLabel("to-batcher");
    t.add(() => { captionEl.innerHTML = "The user hands the offer to the batcher."; });
    t.to(linkFills[0]!, { width: "100%", duration: 0.4, ease: "none" }, "<");
    t.to(packet, { x: centerX(nodeEls[1]!, packet), duration: 0.6, ease: "power1.inOut" }, "<");
    t.add(() => { nodeEls[1]!.classList.add("lit"); });

    t.addLabel("fee");
    t.add(() => { captionEl.innerHTML = "The batcher attaches the <b>TIA fee</b> &mdash; it pays, not the user."; });
    t.set(feeTag, { x: centerX(nodeEls[1]!, feeTag) });
    t.fromTo(feeTag, { opacity: 0, scale: 0.6, y: 6 }, {
      opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(2.5)", immediateRender: false,
    });
    t.to({}, { duration: 0.45 }); // dwell

    t.addLabel("to-celestia");
    t.add(() => { captionEl.innerHTML = "The batcher posts the blob to Celestia."; });
    t.to(linkFills[1]!, { width: "100%", duration: 0.4, ease: "none" }, "<");
    t.to([packet, feeTag], { x: centerX(nodeEls[2]!, packet), duration: 0.6, ease: "power1.inOut" }, "<");
    t.add(() => { nodeEls[2]!.classList.add("lit"); });

    t.addLabel("posted");
    t.to([packet, feeTag], { opacity: 0, scale: 0.7, duration: 0.25, ease: "power2.in" });
    t.set(posted, { x: centerX(nodeEls[2]!, posted) });
    t.fromTo(posted, { opacity: 0, scale: 0.6 }, {
      opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.6)", immediateRender: false,
    });
    t.add(() => { captionEl.innerHTML = DONE; });
    return t;
  };

  // Live self-play (page): rebuilds per play for fresh layout measurements, and
  // auto-loops. Stands down once a driver has taken control (driven).
  const playLive = (): void => {
    if (driven) return;
    if (reduced) { stopLive(); resetState(); lightAll(); return; }
    stopLive();
    resetState();
    const t = buildFlow();
    t.eventCallback("onComplete", () => { loopTimer = gsap.delayedCall(3, playLive); });
    liveTl = t;
    t.play();
  };

  replayBtn.addEventListener("click", () => { driven = false; playLive(); });

  // Silent reader: play once when scrolled into view.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
  }, { threshold: 0.3 });
  io.observe(figure);

  // Listener: replay when narration reaches the paired mark.
  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  // Register the journey for engine drivers (video capture today). A dedicated
  // paused instance, scrubbed forward; reset() takes exclusive control so the
  // page's auto-play can't fight the driver.
  const journey = buildFlow();
  registerFigureJourney("batcher-figure", {
    durationMs: journey.duration() * 1000,
    steps: stepsFromLabels(journey.labels, journey.duration()),
    reset() {
      driven = true;
      stopLive();
      resetState();
      journey.pause(0);
    },
    seek(ms: number) {
      journey.time(ms / 1000);
    },
  });

  resetState();
};

const fig = document.getElementById("batcher-figure");
if (fig) { try { initFigure(fig); } catch (e) { console.error("batcherFlow figure failed", e); } }
