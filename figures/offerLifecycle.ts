// Animated "life of an offer" figure for posts/offer-files.html.
//
// Walks the pipeline an offer travels: created & proven in the wallet →
// encoded as a `zswapoffer1…` string → posted to a Celestia namespace (the
// batcher paying the fee) → indexed off BOTH chains by EffectStream → surfaced
// in a shared order book → matched and settled on Midnight. Stages light up in
// sequence with the connectors filling between them, so a listener sees the
// flow advance on cue.
//
// External module for the same CSP reason as the other figures (see
// client/figures/hashAvalanche.ts). GSAP only writes CSSOM. Enhancement
// contract is identical: static SVG fallback, `.lifecycle-enhanced`,
// IntersectionObserver intro, `narration-active` replay, reduced-motion aware.
import { gsap } from "gsap";
import { registerFigureJourney, stepsFromLabels } from "../engine/client/figureAnimation.ts";

interface Stage {
  icon: string;
  title: string;
  note: string;
}

const STAGES: Stage[] = [
  { icon: "👛", title: "Create &amp; prove", note: "Your wallet builds an imbalanced partial transaction and proves it &mdash; no chain touched yet." },
  { icon: "🔡", title: "Encode", note: "Serialize the proven offer and bech32m-encode it: one self-contained <code>zswapoffer1…</code> string." },
  { icon: "🟪", title: "Post to Celestia", note: "Drop it in the shared namespace. The batcher pays the TIA fee, so you never need Celestia's token." },
  { icon: "🛰️", title: "Index both chains", note: "EffectStream watches Celestia for new offers <em>and</em> Midnight for spent UTXOs (fills &amp; expiries)." },
  { icon: "📖", title: "Shared order book", note: "One liquidity pool. Every DEX or marketplace is just a filter and a frontend over the same offers." },
  { icon: "🤝", title: "Match &amp; settle", note: "A taker merges the matching half and settles the single balanced transaction on Midnight." },
];

const fig = document.getElementById("lifecycle-figure");
if (fig) initLifecycle(fig);

function initLifecycle(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "lifecycle-fig";

  const parts: string[] = ['<div class="flow">'];
  STAGES.forEach((s, i) => {
    if (i > 0) parts.push('<div class="link"><span class="link-fill"></span></div>');
    parts.push(
      `<div class="stage" data-stage="${i}">
         <div class="icon">${s.icon}</div>
         <div class="s-title">${s.title}</div>
       </div>`,
    );
  });
  parts.push("</div>");
  parts.push(
    `<div class="controls">
       <button type="button" class="replay" data-playpause>&#9654; Play the journey</button>
       <span class="lc-hint">or click any step</span>
       <p class="step-caption" data-caption>An offer's life, in six steps. Press play, click a step, or just listen.</p>
     </div>`,
  );
  stage.innerHTML = parts.join("");

  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("lifecycle-enhanced");

  const stageEls = Array.from(stage.querySelectorAll<HTMLElement>(".stage"));
  const linkFills = Array.from(stage.querySelectorAll<HTMLElement>(".link-fill"));
  const captionEl = stage.querySelector<HTMLElement>("[data-caption]")!;
  const playBtn = stage.querySelector<HTMLButtonElement>("[data-playpause]")!;

  let liveTl: gsap.core.Timeline | null = null;
  let loopTimer: gsap.core.Tween | null = null;
  let playing = false;
  let driven = false; // a driver (capture/narrator) has exclusive control

  function setBtn(): void {
    playBtn.innerHTML = playing ? "&#10073;&#10073; Pause" : "&#9654; Play the journey";
  }

  function resetVisual(): void {
    stageEls.forEach((el) => el.classList.remove("lit"));
    linkFills.forEach((el) => { el.style.width = "0%"; });
  }
  function stopLive(): void {
    liveTl?.kill();
    liveTl = null;
    loopTimer?.kill();
    loopTimer = null;
  }

  // Statically show the journey up to (and including) step `i`, then pause —
  // an interactive jump (the reader takes over → driven off).
  function goTo(i: number): void {
    driven = false;
    stopLive();
    playing = false;
    setBtn();
    resetVisual();
    for (let k = 0; k <= i; k++) stageEls[k]!.classList.add("lit");
    linkFills.forEach((el, k) => { el.style.width = k < i ? "100%" : "0%"; });
    captionEl.innerHTML = STAGES[i]!.note;
  }

  // The journey: each stage lights up, the connector fills. One labeled step
  // per stage (the join-point for narration-driven stepping).
  function buildJourney(): gsap.core.Timeline {
    const t = gsap.timeline({ paused: true });
    STAGES.forEach((s, i) => {
      t.addLabel(`step-${i}`);
      t.add(() => { captionEl.innerHTML = s.note; });
      t.fromTo(stageEls[i]!, { scale: 0.9 }, {
        scale: 1, duration: 0.35, ease: "back.out(2.4)", immediateRender: false,
        onStart() { stageEls[i]!.classList.add("lit"); },
      });
      t.to(stageEls[i]!, { scale: 1, duration: 0.5 }); // dwell so the caption is readable
      if (i < linkFills.length) t.to(linkFills[i]!, { width: "100%", duration: 0.4, ease: "none" });
    });
    return t;
  }

  function playLive(): void {
    if (driven) return;
    if (reduced) {
      stopLive();
      resetVisual();
      stageEls.forEach((el) => el.classList.add("lit"));
      linkFills.forEach((el) => { el.style.width = "100%"; });
      captionEl.innerHTML = STAGES[STAGES.length - 1]!.note;
      return;
    }
    stopLive();
    resetVisual();
    playing = true;
    setBtn();
    const t = buildJourney();
    t.eventCallback("onComplete", () => {
      playing = false; setBtn();
      loopTimer = gsap.delayedCall(3.5, playLive);
    });
    liveTl = t;
    t.play();
  }

  // Play / pause toggle: resume an in-flight timeline, else (re)start it.
  playBtn.addEventListener("click", () => {
    driven = false;
    if (playing) { liveTl?.pause(); playing = false; setBtn(); return; }
    if (liveTl && liveTl.progress() > 0 && liveTl.progress() < 1) { liveTl.resume(); playing = true; setBtn(); return; }
    playLive();
  });

  // Click any step to jump there and pause.
  stageEls.forEach((el, i) => el.addEventListener("click", () => goTo(i)));

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

  const journey = buildJourney();
  registerFigureJourney("lifecycle-figure", {
    durationMs: journey.duration() * 1000,
    steps: stepsFromLabels(journey.labels, journey.duration()),
    reset() { driven = true; stopLive(); resetVisual(); journey.pause(0); },
    seek(ms: number) { journey.time(ms / 1000); },
  });
}
