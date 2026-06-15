// Interactive offer-size calculator for posts/offer-files.html (Performance →
// Throughput and Cost). A ZswapOffer is a set of ZswapInputs and ZswapOutputs:
// each input is ~4,934 bytes, each output ~5,136, plus a small fixed wrapper
// overhead (the 1-input/1-output offer measures 10,143 bytes, i.e. 73 bytes over
// its one input + one output). The reader drags input/output sliders and every
// [data-offersize] widget recomputes the offer's on-chain size and the
// size-derived figures in its table, live.
//
// Per-widget constants live in data-* on the root:
//   data-in-bytes, data-out-bytes, data-overhead
// Each [data-row] declares what to derive from the current size:
//   data-block-bytes [+ data-block-secs] -> floor(blockBytes / size) into
//        [data-perblock]; and round((blockBytes/size)/secs) into [data-persec]
//   data-tia-gas-price [+ data-tia-usd]   -> Celestia PFB fee in TIA into [data-tia],
//                                            and (× the TIA/USD rate) USD into [data-usd]
// Rows with none (e.g. a flat DUST fee) are left exactly as authored.
//
// Overhead is treated as a fixed constant — it is only measured at the 1-in/1-out
// offer, so multi-input/output sizes are estimates, good enough for the point
// being made (size, hence cost and throughput, scale with the UTXO count).
//
// External module for the production CSP (it only writes textContent, which CSP
// does not govern). Progressive enhancement: with no JS the markup shows the
// 1-input/1-output baseline baked into the cells.

function commas(n: number): string {
  return n.toLocaleString("en-US");
}

// Celestia PayForBlob fee, in TIA, for a single-blob payload of `bytes` at
// `price` utia/gas. Protocol constants (Mocha): the first share holds 478 payload
// bytes, each further share 482; PFB gas = 75,000 fixed + 700 (blob-info tx bytes)
// + shares × 512 × 8 (gas_per_blob_byte). Fee = gas × price ÷ 10^6.
function celestiaTIA(bytes: number, price: number): number {
  const shares = bytes <= 478 ? 1 : 1 + Math.ceil((bytes - 478) / 482);
  const gas = 75000 + 700 + shares * 512 * 8;
  return (gas * price) / 1_000_000;
}

const roots = document.querySelectorAll<HTMLElement>("[data-offersize]");
roots.forEach(initOfferSize);

function initOfferSize(root: HTMLElement): void {
  const sIn = root.querySelector<HTMLInputElement>("[data-slider-in]");
  const sOut = root.querySelector<HTMLInputElement>("[data-slider-out]");
  const nIn = root.querySelector<HTMLElement>("[data-n-in]");
  const nOut = root.querySelector<HTMLElement>("[data-n-out]");
  const formula = root.querySelector<HTMLElement>("[data-formula]");
  if (!sIn || !sOut || !nIn || !nOut) return;

  const inB = Number(root.dataset.inBytes ?? 0);
  const outB = Number(root.dataset.outBytes ?? 0);
  const over = Number(root.dataset.overhead ?? 0);
  const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));

  function render(): void {
    const N = parseInt(sIn!.value, 10);
    const M = parseInt(sOut!.value, 10);
    const size = N * inB + M * outB + over;
    nIn!.textContent = String(N);
    nOut!.textContent = String(M);
    if (formula) {
      formula.textContent =
        `${N}×${commas(inB)} + ${M}×${commas(outB)} + ${commas(over)} = ${commas(size)} bytes`;
    }
    for (const r of rows) {
      if (r.dataset.blockBytes) {
        const exact = Number(r.dataset.blockBytes) / size;
        const pb = r.querySelector<HTMLElement>("[data-perblock]");
        if (pb) pb.textContent = "~" + commas(Math.floor(exact));
        if (r.dataset.blockSecs) {
          const ps = r.querySelector<HTMLElement>("[data-persec]");
          if (ps) ps.textContent = "~" + commas(Math.round(exact / Number(r.dataset.blockSecs)));
        }
      }
      if (r.dataset.tiaGasPrice) {
        const tia = celestiaTIA(size, Number(r.dataset.tiaGasPrice));
        const t = r.querySelector<HTMLElement>("[data-tia]");
        if (t) t.textContent = "~" + tia.toFixed(6) + " TIA";
        if (r.dataset.tiaUsd) {
          const usd = tia * Number(r.dataset.tiaUsd);
          const u = r.querySelector<HTMLElement>("[data-usd]");
          if (u) u.textContent = "~$" + usd.toFixed(6);
          const pu = r.querySelector<HTMLElement>("[data-perusd]");
          if (pu) pu.textContent = "~" + commas(Math.round(1 / usd));
        }
      }
    }
  }

  sIn.addEventListener("input", render);
  sOut.addEventListener("input", render);
  root.classList.add("provescale-on");
  render();
}
