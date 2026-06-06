// Interactive figure for posts/offer-files.html: which privacy choice makes a
// DEX usable. The nuance is *what* you hide — addresses vs amounts — so the
// reader drives two independent switches over a tiny live order book and watches
// both the book redact and a verdict checklist flip:
//
//   hide neither            → transparent DEX (usable, no privacy)
//   hide addresses only     → zSwap / offer files (private AND usable — sweet spot)
//   hide both               → fully private (max privacy, but blind, heavy, unmeasurable)
//   hide amounts only        → odd: market invisible yet identities public
//
// Hiding amounts is what breaks usability (traders go blind), forces MPC/FHE,
// and makes trustworthy public stats hard — which is the whole argument for
// "public amounts, hidden addresses."
//
// External module for the CSP reason in hashAvalanche.ts. GSAP writes CSSOM
// only. Progressive enhancement over a static SVG; narration-synced; reduced
// motion aware.
import { gsap } from "gsap";
import { registerFigureJourney, stepsFromLabels } from "../engine/client/figureAnimation.ts";

interface Row { side: "buy" | "sell"; who: string; amt: string; px: string }
const ROWS: Row[] = [
  { side: "buy", who: "0x9f…a1", amt: "300 NIGHT", px: "$2.38" },
  { side: "buy", who: "0x71…c3", amt: "120 NIGHT", px: "$2.40" },
  { side: "sell", who: "0x3c…b2", amt: "80 NIGHT", px: "$2.55" },
  { side: "sell", who: "0xe2…d4", amt: "150 NIGHT", px: "$2.61" },
];

const fig = document.getElementById("privacy-figure");
if (fig) initPrivacy(fig);

function initPrivacy(figure: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.createElement("div");
  stage.className = "pt-fig";
  stage.innerHTML = `
    <div class="pt-toggles">
      what do you hide?
      <button type="button" data-toggle="amounts" aria-pressed="false">amounts</button>
      <button type="button" data-toggle="addresses" aria-pressed="true">addresses</button>
    </div>
    <div class="pt-title" data-title></div>
    <div class="pt-grid">
      <div class="pt-book">
        <div class="pt-row pt-head"><span>side</span><span>trader</span><span>amount</span><span>price</span></div>
        <div data-rows></div>
      </div>
      <ul class="pt-checks" data-checks></ul>
    </div>
    <p class="pt-readout" data-readout></p>`;
  const caption = figure.querySelector("figcaption");
  figure.insertBefore(stage, caption);
  figure.classList.add("privacy-enhanced");

  const q = <T extends Element>(s: string) => stage.querySelector(s) as T;
  const rowsBox = q<HTMLElement>("[data-rows]");
  const checksBox = q<HTMLElement>("[data-checks]");
  const titleEl = q<HTMLElement>("[data-title]");
  const readout = q<HTMLElement>("[data-readout]");
  const btnAmounts = q<HTMLButtonElement>('[data-toggle="amounts"]');
  const btnAddr = q<HTMLButtonElement>('[data-toggle="addresses"]');

  let hideAmounts = false;
  let hideAddresses = true; // default: the zSwap sweet spot

  const REDACT = "•••••";

  function renderBook(): void {
    rowsBox.innerHTML = "";
    for (const r of ROWS) {
      const row = document.createElement("div");
      row.className = "pt-row";
      // data-contrast="exempt": the redaction chips are deliberately obscured
      // (the faintness IS the "hidden" signal); not text to read (DESIGN.md §1).
      const who = hideAddresses ? `<span class="redact" data-contrast="exempt">🕶 hidden</span>` : r.who;
      const amt = hideAmounts ? `<span class="redact" data-contrast="exempt">${REDACT}</span>` : r.amt;
      const px = hideAmounts ? `<span class="redact" data-contrast="exempt">${REDACT}</span>` : r.px;
      row.innerHTML = `<span class="side ${r.side}">${r.side}</span><span class="who">${who}</span><span class="amt">${amt}</span><span class="px">${px}</span>`;
      rowsBox.appendChild(row);
    }
  }

  // Each row states the *current* reality, so the icon always matches the words
  // (✓ = a good thing that's true now, ✗ = a bad thing that's true now). No
  // fixed positive label flipped by a ✗ — that read as a double-negative.
  function renderChecks(): void {
    const checks = [
      hideAmounts
        ? { ok: false, text: "Traders are blind to liquidity &amp; price" }
        : { ok: true, text: "Traders can see liquidity &amp; price" },
      hideAddresses
        ? { ok: true, text: "Trader identities stay private" }
        : { ok: false, text: "Trader identities are public" },
      hideAmounts
        ? { ok: false, text: "Needs heavy MPC / FHE crypto" }
        : { ok: true, text: "Simple crypto &mdash; no MPC / FHE" },
      hideAmounts
        ? { ok: false, text: "Trustworthy public stats are hard" }
        : { ok: true, text: "Public stats come easily" },
    ];
    checksBox.innerHTML = checks
      .map((c) => `<li class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"} ${c.text}</li>`)
      .join("");
  }

  function classify(): { title: string; cls: string; note: string } {
    if (!hideAmounts && !hideAddresses)
      return { title: "Transparent DEX", cls: "transparent", note: "Everything is public &mdash; fully usable, but no privacy at all. This is a normal on-chain order book." };
    if (!hideAmounts && hideAddresses)
      return { title: "zSwap-based offer files &mdash; the sweet spot", cls: "sweet", note: "Amounts stay public so the market is fully legible &mdash; volume, liquidity, prices all visible &mdash; while <b>who</b> traded is hidden. Private <em>and</em> usable, with no heavy crypto." };
    if (hideAmounts && hideAddresses)
      return { title: "Fully private", cls: "private", note: "Maximum privacy &mdash; but traders are now blind to liquidity and price, hiding amounts drags in MPC/FHE, and trustworthy public stats become very hard. This is why “hide everything” DEXs have struggled." };
    return { title: "Hiding only amounts", cls: "odd", note: "Unusual: the market is invisible to traders, yet identities are still public &mdash; the worst of both. Almost no one wants this." };
  }

  function render(animate: boolean): void {
    renderBook();
    renderChecks();
    const { title, cls, note } = classify();
    titleEl.innerHTML = title;
    readout.innerHTML = note;
    figure.classList.toggle("is-sweet", cls === "sweet");
    figure.classList.toggle("is-private", cls === "private");
    btnAmounts.setAttribute("aria-pressed", String(hideAmounts));
    btnAddr.setAttribute("aria-pressed", String(hideAddresses));
    if (animate && !reduced) {
      gsap.fromTo([rowsBox, checksBox], { opacity: 0.35 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
    }
  }

  let driven = false;
  btnAmounts.addEventListener("click", () => { driven = false; hideAmounts = !hideAmounts; render(true); });
  btnAddr.addEventListener("click", () => { driven = false; hideAddresses = !hideAddresses; render(true); });

  render(false);

  // Narration / scroll: a quick pulse of the default (sweet-spot) state.
  function intro(): void {
    if (driven || reduced) return;
    gsap.fromTo(stage.querySelectorAll(".pt-row, .pt-checks li"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power1.out" });
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.disconnect(); intro(); }
  }, { threshold: 0.3 });
  io.observe(figure);

  let active = figure.classList.contains("narration-active");
  const mo = new MutationObserver(() => {
    const now = figure.classList.contains("narration-active");
    if (now && !active) intro();
    active = now;
  });
  mo.observe(figure, { attributes: true, attributeFilter: ["class"] });

  // The journey: tour the four privacy quadrants — transparent → the zSwap
  // sweet spot (hide addresses only) → fully private → amounts-only.
  const setHide = (amts: boolean, addr: boolean): void => { hideAmounts = amts; hideAddresses = addr; render(false); };
  const journey = gsap.timeline({ paused: true });
  journey.addLabel("transparent"); journey.call(() => setHide(false, false)); journey.to({}, { duration: 1.6 });
  journey.addLabel("sweet-spot"); journey.call(() => setHide(false, true)); journey.to({}, { duration: 1.8 });
  journey.addLabel("fully-private"); journey.call(() => setHide(true, true)); journey.to({}, { duration: 1.6 });
  journey.addLabel("amounts-only"); journey.call(() => setHide(true, false)); journey.to({}, { duration: 1.6 });
  registerFigureJourney("privacy-figure", {
    durationMs: journey.duration() * 1000,
    steps: stepsFromLabels(journey.labels, journey.duration()),
    reset() { driven = true; setHide(false, true); journey.pause(0); },
    seek(ms: number) { journey.time(ms / 1000); },
  });
}
