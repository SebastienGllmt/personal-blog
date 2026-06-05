// Animated "shared liquidity" figure for the presidocs blog.
//
// The point: there is ONE shared pool of offers. Many different producers
// (wallets, DEXes, NFT apps) post offer-files that all FAN IN to a single
// Celestia namespace; many different consumer dApps then FAN OUT from that
// same pool, each just a filter + a frontend over the shared offers. Liquidity
// one app attracts is liquidity every other app can match against.
//
// External module for the same CSP reason as the other figures (see
// client/figures/hashAvalanche.ts). GSAP only writes CSSOM. Enhancement
// contract is identical to offerLifecycle.ts: static SVG fallback,
// `.sl-enhanced`, IntersectionObserver intro (once), `narration-active`
// replay, reduced-motion aware.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

// Seconds to dwell on the final frame before the loop replays. Shared by the
// in-page free-run loop and the registered journey (baked in via
// buildLoopingJourney) so the page and the rendered video pause identically.
const LOOP_GAP = 2;

interface Node {
  icon: string;
  label: string;
}

// Producers on the left that emit offer-files into the shared pool.
const SOURCES: Node[] = [
  { icon: "👛", label: "Wallet" },
  { icon: "🔁", label: "DEX A" },
  { icon: "🖼️", label: "NFT app" },
];

// Consumer dApps on the right that read from the same shared pool.
const CONSUMERS: Node[] = [
  { icon: "🔁", label: "DEX" },
  { icon: "🖼️", label: "NFT marketplace" },
  { icon: "📊", label: "Portfolio app" },
  { icon: "🧮", label: "Aggregator" },
];

const buildColumn = (nodes: Node[], side: "src" | "dst"): string => {
  const items = nodes
    .map(
      (n, i) =>
        `<div class="sl-node" data-side="${side}" data-i="${i}">
           <span class="sl-node-icon">${n.icon}</span>
           <span class="sl-node-label">${n.label}</span>
         </div>`,
    )
    .join("");
  return `<div class="sl-col sl-col-${side}">${items}</div>`;
};

const buildMarkup = (): string => {
  return (
    `<div class="sl-diagram">` +
    `<div class="sl-col-cap sl-cap-src">sources</div>` +
    `<div class="sl-col-cap sl-cap-hub">shared pool</div>` +
    `<div class="sl-col-cap sl-cap-dst">apps</div>` +
    buildColumn(SOURCES, "src") +
    `<div class="sl-hub-col">` +
    `<div class="sl-hub" data-hub>` +
    `<span class="sl-hub-icon">🟪</span>` +
    `<span class="sl-hub-name">Celestia</span>` +
    `<span class="sl-hub-sub">one shared pool of offers</span>` +
    `</div>` +
    `</div>` +
    buildColumn(CONSUMERS, "dst") +
    `<div class="sl-chips" data-chips></div>` +
    `</div>` +
    `<div class="sl-controls">` +
    // Reserve a fixed height with a hidden sizer holding the LONGEST caption, so
    // the (absolutely-positioned) active caption never changes the figure's
    // height between steps — no layout shift of the content below.
    `<div class="sl-caption-wrap">` +
    `<p class="sl-caption-sizer" aria-hidden="true">${CAP_FANOUT}</p>` +
    `<p class="sl-caption" data-caption>One pool, many apps.</p>` +
    `</div>` +
    `</div>`
  );
};

const CAP_FANIN = "Every wallet, DEX and NFT app posts its offer-files into the <b>same</b> Celestia namespace.";
const CAP_HUB = "They all collect in one shared pool &mdash; liquidity isn't trapped inside any single app.";
const CAP_FANOUT =
  "Every dApp reads from that same pool. Each one is just a filter and a frontend over the shared offers, so liquidity one app attracts is liquidity <b>every</b> other app can match against.";

const initFigure = (figure: HTMLElement): void => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "sl-fig";
  stage.innerHTML = buildMarkup();

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("sl-enhanced");

  const q = <T extends Element>(s: string) => stage.querySelector(s) as T;
  const hub = q<HTMLElement>("[data-hub]");
  const chipsLayer = q<HTMLElement>("[data-chips]");
  const captionEl = q<HTMLElement>("[data-caption]");
  const srcEls = Array.from(stage.querySelectorAll<HTMLElement>('.sl-node[data-side="src"]'));
  const dstEls = Array.from(stage.querySelectorAll<HTMLElement>('.sl-node[data-side="dst"]'));

  const center = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // Visual reset (no timeline kill — stopLive() handles that). Also clears the
  // dynamically-spawned chips, so the journey is REBUILT (fresh chips) each run.
  const resetVisual = (): void => {
    chipsLayer.innerHTML = "";
    gsap.set(hub, { scale: 1, boxShadow: "0 0 0 rgba(106,79,176,0)" });
    srcEls.concat(dstEls).forEach((el) => el.classList.remove("lit"));
  };

  // Spawn a chip and animate it from→to ENTIRELY on the timeline (move + fade-out
  // + arrival callback at numeric `at`) — no detached gsap.to in callbacks, so a
  // forward seek reproduces every frame. immediateRender:false keeps building a
  // paused instance side-effect-free.
  const flyChip = (
    timeline: gsap.core.Timeline,
    from: HTMLElement,
    to: HTMLElement,
    at: number,
    onArrive?: () => void,
  ): void => {
    const a = center(from);
    const b = center(to);
    const sr = stage.getBoundingClientRect();
    const chip = document.createElement("div");
    chip.className = "sl-chip";
    chipsLayer.appendChild(chip);
    timeline.fromTo(
      chip,
      { x: a.x - sr.left, y: a.y - sr.top, xPercent: -50, yPercent: -50, opacity: 0, scale: 0.6 },
      { x: b.x - sr.left, y: b.y - sr.top, opacity: 1, scale: 1, duration: 0.55, ease: "power2.inOut", immediateRender: false },
      at,
    );
    timeline.to(chip, { opacity: 0, scale: 0.5, duration: 0.25 }, at + 0.55);
    if (onArrive) timeline.add(onArrive, at + 0.55);
  };

  const lightAll = (): void => {
    srcEls.concat(dstEls).forEach((el) => el.classList.add("lit"));
    captionEl.innerHTML = CAP_FANOUT;
  };

  // One pass (fan-in → hub pulse → fan-out) as a paused, labeled timeline, with
  // explicit numeric times so chip fades/callbacks sit on the timeline.
  const buildPass = (): gsap.core.Timeline => {
    const t = gsap.timeline({ paused: true });
    t.addLabel("fan-in", 0);
    t.add(() => { captionEl.innerHTML = CAP_FANIN; }, 0);
    srcEls.forEach((el, i) => {
      const at = i * 0.18;
      t.add(() => el.classList.add("lit"), at);
      flyChip(t, el, hub, at);
    });

    t.addLabel("hub", 1.0);
    t.add(() => { captionEl.innerHTML = CAP_HUB; }, 1.0);
    t.to(hub, { scale: 1.12, duration: 0.25, ease: "power2.out" }, 1.0);
    t.to(hub, { boxShadow: "0 0 22px rgba(106,79,176,0.55)", duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, 1.0);
    t.to(hub, { scale: 1, duration: 0.3, ease: "power2.inOut" }, 1.5);

    t.addLabel("fan-out", 1.75);
    t.add(() => { captionEl.innerHTML = CAP_FANOUT; }, 1.75);
    dstEls.forEach((el, i) => flyChip(t, hub, el, 1.75 + i * 0.18, () => el.classList.add("lit")));
    return t;
  };

  let liveTl: gsap.core.Timeline | null = null;
  let loopTimer: gsap.core.Tween | null = null;
  let driven = false;
  const stopLive = (): void => { liveTl?.kill(); liveTl = null; loopTimer?.kill(); loopTimer = null; };

  const playLive = (): void => {
    if (driven) return;
    if (reduced) { stopLive(); resetVisual(); lightAll(); return; }
    stopLive();
    resetVisual();
    const t = buildPass();
    t.eventCallback("onComplete", () => { loopTimer = gsap.delayedCall(LOOP_GAP, playLive); });
    liveTl = t;
    t.play();
  };

  // Silent reader: play once when scrolled into view.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
    },
    { threshold: 0.3 },
  );
  io.observe(figure);

  // Listener: replay when narration reaches the paired mark.
  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  // Register the journey. This figure SPAWNS chips during the animation, so the
  // journey is rebuilt fresh on reset() (a probe build gives stable duration/
  // steps; its chips are cleared so the live DOM stays clean).
  const probe = buildPass();
  const probePlayMs = probe.duration() * 1000;
  const probeLabels = { ...probe.labels }; // clone before kill(), used below
  probe.kill();
  resetVisual();
  let journey: gsap.core.Timeline | null = null;
  // Bake the free-run LOOP_GAP dwell into the journey so the video compositor
  // (and the narration driver's continuous loop) pause on the final frame
  // before looping. This figure spawns chips during the animation, so the
  // journey timeline is rebuilt fresh on reset(); duration/labels are probed
  // off the throwaway build above.
  registerFigureJourney("sharedliquidity-figure", buildLoopingJourney({
    playMs: probePlayMs,
    labels: probeLabels,
    loopGapMs: LOOP_GAP * 1000,
    seek: (ms) => { journey?.time(ms / 1000); },
    reset() {
      driven = true;
      stopLive();
      resetVisual();
      journey = buildPass();
      journey.pause(0);
    },
  }));
};

// Run-guard at the very bottom: all const arrow helpers above are defined by
// the time this executes (const arrows are NOT hoisted, so this must come last).
const fig = document.getElementById("sharedliquidity-figure");
if (fig) { try { initFigure(fig); } catch (e) { console.error("sharedLiquidity figure failed", e); } }
