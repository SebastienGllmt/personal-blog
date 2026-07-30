// Appendix F binding-anatomy figure for posts/offer-files.html.
//
// The inline SVG is authored in its complete state as the no-JS fallback. This
// module turns it into a build-up animation: a transaction grid fills one column
// at a time, and the binding_randomness row reveals the matching r term at the
// same tick.
import { gsap } from "gsap";
import { registerFigureJourney, buildLoopingJourney } from "../engine/client/figureAnimation.ts";

const LOOP_GAP = 2.2;

const fig = document.getElementById("binding-anatomy-figure");
if (fig) initBindingAnatomy(fig);

function initBindingAnatomy(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (name: string) => figure.querySelector(`[data-el="${name}"]`) as SVGElement | null;

  const cells = [
    el("cell-intent-a"),
    el("cell-zin"),
    el("cell-zout"),
    el("cell-intent-b"),
  ].filter((node): node is SVGElement => Boolean(node));
  const terms = [
    el("term-intent-a"),
    el("term-zin"),
    el("term-zout"),
    el("term-intent-b"),
  ].filter((node): node is SVGElement => Boolean(node));
  const zswapBracket = el("zswap-bracket");

  if (cells.length !== 4 || terms.length !== 4 || !zswapBracket) return;

  let driven = false;
  let loopTimer: gsap.core.Tween | null = null;

  function showInitial(): void {
    gsap.set([...cells, ...terms, zswapBracket], { opacity: 0 });
    gsap.set(cells, { y: -8, scale: 0.96, transformOrigin: "center center" });
    gsap.set(terms, { y: 6, scale: 0.96, transformOrigin: "center center" });
  }

  function showComplete(): void {
    gsap.set([...cells, ...terms, zswapBracket], { opacity: 1, y: 0, scale: 1 });
  }

  function revealPair(tl: gsap.core.Timeline, index: number): void {
    tl.fromTo(cells[index]!, { opacity: 0, y: -8, scale: 0.96 }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.42,
      ease: "back.out(2)",
      immediateRender: false,
    });
    tl.fromTo(terms[index]!, { opacity: 0, y: 6, scale: 0.96 }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.36,
      ease: "back.out(2.4)",
      immediateRender: false,
    }, "-=0.2");
  }

  function buildTour(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });

    tl.addLabel("intent-a", 0);
    revealPair(tl, 0);
    tl.to({}, { duration: 0.85 });

    tl.addLabel("zswap-input");
    tl.fromTo(zswapBracket, { opacity: 0 }, { opacity: 1, duration: 0.25, immediateRender: false });
    revealPair(tl, 1);
    tl.to({}, { duration: 0.85 });

    tl.addLabel("zswap-output");
    revealPair(tl, 2);
    tl.to({}, { duration: 0.85 });

    tl.addLabel("intent-b");
    revealPair(tl, 3);
    tl.to({}, { duration: 1.0 });

    return tl;
  }

  const tour = buildTour();

  function playLive(): void {
    if (driven) return;
    if (reduced) {
      showComplete();
      return;
    }
    showInitial();
    loopTimer?.kill();
    tour.eventCallback("onComplete", () => {
      loopTimer = gsap.delayedCall(LOOP_GAP, playLive);
    });
    tour.play(0);
  }

  showInitial();

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        io.disconnect();
        playLive();
      }
    }
  }, { threshold: 0.3 });
  io.observe(figure);

  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active && !driven) playLive();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  registerFigureJourney("binding-anatomy-figure", buildLoopingJourney({
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
