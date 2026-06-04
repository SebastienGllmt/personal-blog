// Looping "wrap an offer into a portable file" figure for posts/offer-files.html.
//
// An offer file is just a proven offer that's been made self-contained: the
// in-wallet proof object is serialized to bytes, then bech32m-encoded into a
// single `zswapoffer1…` string anyone can copy, paste, or post. This figure
// loops that wrap continuously — proof object → bytes → encoded string →
// handed off to the shared pool — then unwraps and starts over, so a passing
// reader (or listener) always catches the cycle mid-flow.
//
// External module for the same CSP reason as the other figures (see
// client/figures/hashAvalanche.ts). GSAP only writes CSSOM. Enhancement
// contract matches the house pattern: static SVG fallback, an `fw-enhanced`
// class on the figure, IntersectionObserver intro that starts the loop,
// `narration-active` replay, and reduced-motion awareness (a sensible static
// final frame, no animation, no loop).
import { gsap } from "gsap";
import { registerFigureJourney, stepsFromLabels } from "../engine/client/figureAnimation.ts";

interface Step {
  icon: string;
  title: string;
  note: string;
}

// The four states the offer cycles through as it gets wrapped into a file.
const STEPS: Step[] = [
  { icon: "👛", title: "Proven offer", note: "A proven partial transaction sits in your wallet as a live in-memory object &mdash; not yet something you can hand to anyone." },
  { icon: "🧬", title: "Serialize", note: "Flatten that object to a compact, deterministic byte string: the whole offer, dependencies and all, in one self-contained blob." },
  { icon: "🔡", title: "bech32m-encode", note: "Wrap the bytes in a checksummed bech32m envelope. The result is one copy-pasteable <code>zswapoffer1…</code> string." },
  { icon: "📤", title: "Hand it off", note: "Drop the string anywhere &mdash; a paste, a QR code, a Celestia namespace. Decode reverses every step, so the cycle can begin again." },
];

const fig = document.getElementById("filewrap-figure");
if (fig) { try { initFileWrap(fig); } catch (e) { console.error("fileWrap figure failed", e); } }

function initFileWrap(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "fw-fig";

  const parts: string[] = ['<div class="fw-track">'];
  STEPS.forEach((s, i) => {
    if (i > 0) parts.push('<div class="fw-link"><span class="fw-link-fill"></span></div>');
    parts.push(
      `<div class="fw-step" data-step="${i}">
         <div class="fw-icon">${s.icon}</div>
         <div class="fw-title">${s.title}</div>
       </div>`,
    );
  });
  parts.push("</div>");
  parts.push(
    `<div class="fw-pkg" data-pkg>
       <span class="fw-pkg-glyph" data-pkg-glyph>&#128230;</span>
       <code class="fw-pkg-label" data-pkg-label>zswapoffer1&hellip;</code>
     </div>`,
  );
  parts.push(
    `<div class="fw-controls">
       <button type="button" class="fw-replay" data-replay>&#9654; Watch it wrap</button>
       <p class="fw-caption" data-caption>An offer becomes a portable file, on loop. Press play, or just listen.</p>
     </div>`,
  );
  stage.innerHTML = parts.join("");

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("fw-enhanced");

  const stepEls = Array.from(stage.querySelectorAll<HTMLElement>(".fw-step"));
  const linkFills = Array.from(stage.querySelectorAll<HTMLElement>(".fw-link-fill"));
  const captionEl = stage.querySelector<HTMLElement>("[data-caption]")!;
  const replayBtn = stage.querySelector<HTMLButtonElement>("[data-replay]")!;
  const pkg = stage.querySelector<HTMLElement>("[data-pkg]")!;
  const pkgGlyph = stage.querySelector<HTMLElement>("[data-pkg-glyph]")!;
  const pkgLabel = stage.querySelector<HTMLElement>("[data-pkg-label]")!;

  // A throwaway hex blob to represent the raw serialized bytes (before encoding).
  // Deterministic (no Math.random) so frame capture is reproducible/content-
  // addressable; the exact digits are illustrative only.
  const randHex = (n: number) =>
    "0x" + "9f3ac12b7e4d6051a8f2".slice(0, n) + "…";

  let tl: gsap.core.Timeline | null = null;
  let driven = false;
  const stopLive = (): void => { tl?.kill(); tl = null; };

  function clearAll(): void {
    stepEls.forEach((el) => el.classList.remove("lit"));
    linkFills.forEach((el) => { el.style.width = "0%"; });
    pkg.classList.remove("show", "wrapped");
    // Explicit reset (not clearProps:"all", whose leftover inline-style residue
    // serializes inconsistently across runs → non-deterministic capture).
    gsap.set(pkg, { x: 0, y: 6, opacity: 0, scale: 0.6 });
    gsap.set(pkgGlyph, { rotation: 0 });
  }

  // Sensible static final frame for reduced motion: fully wrapped, last note.
  function showFinal(): void {
    clearAll();
    stepEls.forEach((el) => el.classList.add("lit"));
    linkFills.forEach((el) => { el.style.width = "100%"; });
    pkg.classList.add("show", "wrapped");
    captionEl.innerHTML = STEPS[STEPS.length - 1]!.note;
  }

  // One pass through the wrap cycle, appended to the given timeline. Labeled per
  // step; from/fromTo use immediateRender:false so building a paused instance is
  // side-effect-free. The leading callback re-establishes the start each cycle.
  function buildCycle(t: gsap.core.Timeline): void {
    t.add(() => {
      stepEls.forEach((el) => el.classList.remove("lit"));
      linkFills.forEach((el) => { el.style.width = "0%"; });
      pkg.classList.remove("show", "wrapped");
      gsap.set(pkg, { opacity: 0, scale: 0.6, y: 6 });
      gsap.set(pkgGlyph, { rotate: 0 });
    });

    STEPS.forEach((s, i) => {
      const el = stepEls[i]!;
      t.addLabel(`step-${i}`);
      t.add(() => { captionEl.innerHTML = s.note; });
      t.fromTo(el, { scale: 0.9 }, {
        scale: 1, duration: 0.35, ease: "back.out(2.4)", immediateRender: false,
        onStart() { el.classList.add("lit"); },
      });
      t.to(el, { scale: 1, duration: 0.5 }); // dwell so the caption is readable

      if (i === 1) {
        t.add(() => { pkg.classList.add("show"); pkgLabel.textContent = randHex(12); });
        t.to(pkg, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(2)" }, "<");
      }
      if (i === 2) {
        t.add(() => { pkg.classList.add("wrapped"); pkgLabel.textContent = "zswapoffer1…"; });
        t.to(pkgGlyph, { rotate: 360, duration: 0.5, ease: "power2.inOut" }, "<");
      }

      if (i < linkFills.length) t.to(linkFills[i]!, { width: "100%", duration: 0.4, ease: "none" });
    });

    // hand-off: the package slides out before the next cycle re-wraps it
    t.to(pkg, { x: 26, opacity: 0, duration: 0.5, ease: "power2.in" }, "+=0.4");
    t.set(pkg, { x: 0 });
    t.to({}, { duration: 0.5 }); // breath between loops
  }

  function playLive(): void {
    if (driven) return;
    if (reduced) { stopLive(); showFinal(); return; }
    stopLive();
    clearAll();
    const t = gsap.timeline({ repeat: -1 });
    tl = t;
    buildCycle(t);
  }

  replayBtn.addEventListener("click", () => { driven = false; playLive(); });

  // Silent reader: start the loop when scrolled into view.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); playLive(); }
  }, { threshold: 0 });
  io.observe(figure);

  // Listener: restart the loop when narration reaches the paired mark.
  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  // Journey: one paused cycle (no DOM spawned → built once).
  const journey = gsap.timeline({ paused: true });
  buildCycle(journey);
  registerFigureJourney("filewrap-figure", {
    durationMs: journey.duration() * 1000,
    steps: stepsFromLabels(journey.labels, journey.duration()),
    reset() { driven = true; stopLive(); clearAll(); journey.pause(0); },
    seek(ms: number) { journey.time(ms / 1000); },
  });
}
