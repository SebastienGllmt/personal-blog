# The Bull Case for Offer Files

**Thesis.** Chia's offer file — a self-contained, trustless, off-chain, partially-signed spend bundle that touches the chain *only* on a fill — is not a Chia quirk. It is a general primitive that any blockchain with the same architectural DNA (a UTXO/coin-set model, programmable coins, and atomic spend bundles) should adopt. The 4.5-year, 833,145-trade track record indexed from dexie.space is the closest thing the industry has to a controlled experiment on the idea, and the verdict is strongly favorable: the primitive *works*, it does things no account-based DEX can do cheaply, and — most surprisingly — it inverts the one objection everyone raises against peer-to-peer trading. The market built on top is small and bot-heavy, but every one of those weaknesses is a property of *this* ecosystem's size, not of the primitive. Cardano, Ergo, and any future coin-set chain with expressive scripting should ship offer files, and they should do it early.

All figures below are drawn from `posts/offer-files-data.html` and the findings under `research/dexie-offers/findings/`, computed from a deduplicated dump of 833,145 settled offers (~84.7% of all settled offers ever, with a known bias toward undercounting the *oldest* trades of the busiest pairs — so early absolute counts are floors, not exact). I flag every estimate and inference as such; the case does not need to hide them.

---

## Who this applies to

The bet transfers to any chain that already has the two ingredients Chia's offer file is built from. First, a **coin-set / UTXO model**, where value lives in discrete coins (eUTXOs) rather than mutable account balances — this is what makes an offer a *reservation of specific coins* rather than a promise against a shared balance. Second, **expressive coin-level scripting plus atomic multi-input spends**, so a coin can carry a puzzle that announces "this spend is only valid if these other payments happen in the same transaction." That announcement-and-assertion mechanism is exactly Chia's `settlement_payments` puzzle, and it is what makes a half-signed, anyone-can-complete trade *atomic and trustless* without an intermediary.

**Cardano** (eUTXO + Plutus, with native multi-asset support and an existing tradition of "datum + redeemer" partial transactions) is the cleanest fit; it already has the asset model that makes 32-asset atomic bundles trivial to express. **Ergo** (eUTXO + ErgoScript, with a sigma-protocol scripting model explicitly designed for this kind of conditional spend) is arguably an even more natural home; its "offer chain"-style contracts are conceptually adjacent already. Any newer coin-set chain (the design is recurring) inherits the same applicability. The bet does *not* transfer to account-based chains (Ethereum, Solana, the L2s): there, "offers" require a smart-contract escrow or an off-chain order-book relayer with on-chain settlement (the 0x / Seaport pattern), which reintroduces a contract surface to audit and a relayer to trust. The offer-file advantage is specifically a coin-set advantage. This document argues those chains, and only those chains, should adopt it.

---

## Pillar 1 — Trustless trading *protects* royalties instead of eroding them

The single most important result in the dataset is the one that inverts the standard objection. The instinctive worry about removing the marketplace from the middle of a trade is that nothing stops a buyer from routing *around* the creator royalty — and on Ethereum-style chains this is exactly what happened: royalties were a marketplace social convention, so when trading moved to venues that didn't enforce them, creator revenue collapsed. Offer files do the opposite.

The data (finding `07-royalties.md`, chart `chart-royalties`) shows that **100% of traded NFTs carry an on-chain `royalty_bps`** (360,302 of 360,302 legs; royalty is a first-class property of the NFT1 puzzle, not optional metadata), and only **7.6%** are set to zero. The trade-weighted median royalty did not erode under fully P2P trading — it *rose*, from **5% (2022–24) to 7% (2025) to 10% (2026)**. Creators raised their take in a market with no marketplace forcing anyone to pay, which only makes economic sense if the protocol itself honors the royalty.

It does. The cleanest on-chain signal: among single-pair NFT→XCH sales, the share that create an extra payout coin rises **monotonically with the set royalty rate — 9.5% → 22.5% → 39.9% → 48.2% → 58.3%** across the 0%, 1–3%, 4–7%, 8–15%, and >15% buckets — while the median sale price stays flat at ~0.1–0.2 XCH across every bucket. The extra coin tracks the *rate*, not the trade size, which is exactly the footprint of a royalty being paid. (Honesty requires the caveat that this is an inference from coin structure, not a decoded payment — see Objections — but it is consistent with NFT1's consensus-layer enforcement and a clean dose-response.) Underwriting it: **99.96%** of traded NFTs were minted by a creator with a persistent on-chain DID, the durable identity that makes a royalty claim meaningful at all.

For a chain choosing whether to adopt offer files, this is the headline. The marketplace-erosion problem that has plagued NFT royalties everywhere else simply does not exist when the royalty is enforced by the coin's own puzzle and the atomic settlement spend must satisfy it. Trustless trading and creator revenue are *aligned*, not opposed.

---

## Pillar 2 — Atomic multi-asset bundling: a primitive other models can't cheaply replicate

About **10% of offers carry 3+ assets, 2.7% carry 4+, and 2.2% carry 5+**, with a single all-or-nothing atomic offer packing up to **32 assets** (chart `chart-assets-per-offer`; the spikes at exactly 5 and 11 are the fingerprints of specific bundle templates — LP deposits, NFT bundles). One offer file can say "give XCH *and* a token, receive an LP token" or "these eight NFTs for that price," and either the whole thing settles in one block or none of it does.

This matters because it is the operation an account-based DEX is worst at. There, a multi-leg atomic trade means a bespoke smart contract or a flash-loan-style choreography, each with its own audit surface and failure modes. On a coin-set chain with the settlement puzzle, it is just a longer list of announced payments inside the same spend — the *same* primitive, no new contract. A chain that ships offer files gets atomic basket trades, LP-deposit-as-a-trade, and NFT-bundle sales for free, on day one, with no per-feature contract risk.

---

## Pillar 3 — The atomic guarantee makes composition into an aggregator safe

The most strategically interesting thing the ecosystem did with offer files was turn them into the **settlement rail for a DEX aggregator**. dexie's Combined Swap routes a single order through multiple sources — other resting offers *plus* the TibetSwap AMM pool — and settles the entire route atomically inside one offer file. By 2026, **roughly half of all offers are these multi-source routes** (chart `chart-aggregator`), and **59% of TibetSwap fills arrive through them**.

The deep point is *why* this is safe. Because the whole route is one atomic spend, routing through an untrusted source carries no downside: the worst case is that the offer simply doesn't complete and you keep your coins. There is no partial-execution risk, no "the second hop reverted and I'm now holding the wrong asset," no approval-draining contract to trust. The atomicity that makes a single trade trustless makes *arbitrary composition* trustless too. An aggregator can be built on top permissionlessly, by a third party, without the base layer knowing or caring. That is a far stronger composability story than approval-based account chains can offer, where every new router is new attack surface.

---

## Pillar 4 — Order flow *is* a price oracle, for free

Because every settled offer is a real, accepted, fee-bearing price, the order flow reconstructs into a usable oracle with no external feed. From XCH↔stablecoin trades alone (finding `03-price-oracle.md`, chart `chart-oracle`), the XCH/USD series rebuilds cleanly, tracking XCH's real decline from **~$31 to under $3**, with a **median bid/ask spread of just 1.83%**, no persistent maker skew (the sign flips month to month, like a real two-sided market), and a spam rate of **~0.1%**. Most strikingly, the median is stable on as few as **~5 trades/day** (every volume bucket sits within ±3% relative dispersion). A chain gets a manipulation-resistant internal price feed as a byproduct of trading — and manipulation is hard precisely because only *settled, on-chain, fee-paying* fills enter the series, so spoofing requires actually winning the majority of a day's fills, not posting free junk.

The honest asterisk here is a *general* lesson, not an offer-file flaw: the dataset contains a "USD" token (USDSC) that depegged after its off-chain custodian (Prime Trust) went insolvent in 2023, and naively including it makes XCH look like a $160–$695 coin. The fix is coin selection — validate the peg against the data. An oracle built on offer flow is only as good as the stablecoin you anchor it to, which is true of every oracle everywhere.

---

## Pillar 5 — Cheap by design, but load-bearing

A whole decentralized exchange runs on a **peak of ~0.53% of Chia's theoretical compute capacity** (~0.64% including on-chain cancellations; chart `chart-blockspace`). This is not a sign of irrelevance — it is the design goal. Offer settlements are deliberately cheap to verify, and the chain is only ever touched on a fill (orders are free and off-chain). Expired offers never touch the chain at all; cancellations batch (~3 offers per spend) and each is a cheap coin-reclaim.

That "tiny footprint" framing actually undersells how load-bearing the primitive is. Measured against the compute that *actually runs* on Chia (sampled real block costs, chart `chart-actual-compute`), offer files were **~6% of all compute through 2024 and jumped to ~33–40% in 2025–26** (~10.5% all-time). The jump was attrition, not growth — offer compute held flat while the rest of the chain emptied out — but the takeaway for an adopting chain is clean: this primitive is cheap enough to be nearly free at the protocol level, yet central enough to anchor a meaningful share of real activity. Network fees across the entire 4.5 years totalled only **~130 XCH** (≈0.01% of the ~1.08M XCH volume); the real costs of trading are the optional aggregator fee (~2,860 XCH) and creator royalties (~9,745 XCH) — i.e. value flowing to service providers and creators, not burned on gas.

---

## Pillar 6 — Real, durable, permissionless usage breadth

This is not a demo that traded for a quarter. Over 4.5 years it carried **833,145+ settled trades** through multiple boom/bust waves (the 2022 NFT mania, the 2025 go4.me wave, three successive game-economy bursts) and kept clearing. The breadth is the tell:

- **NFTs are a genuine killer app** — 38% of offers, with NFT→XCH the single #1 route at 224,879 trades (finding `02-nft.md`).
- **Whole game economies clear P2P** — FarmerVerse (76k offers) and Abandoned Land (48k; ~400k internal Wood/Ore/Food swaps, cashing out to XCH only ~8,500 times) run their internal production economies on offer files instead of a game server (chart `chart-games`). Collectively the game segment (~20% of offers) out-trades the entire stablecoin segment.
- **Real-world assets** show up in the predictable corner: ~0.3% of offers price NFTs directly in dollars, and they are tokenized real estate and GPUs (chart at `#nft-rwa`).
- **Settlement filters spam** — anyone can post junk, but someone must *accept* it, and under **0.5% of settled trades are 10× price outliers, a rate that's falling** (finding `05-microstructure.md`). The market's own settlement step does the spam filtering for free.
- **The infrastructure is light and permissionless** — no order-book server is required; offers gossip over Splash (a libp2p network) and anyone can host, relay, or index. dexie is an indexer, not a gatekeeper; a competitor could index the same gossip tomorrow.

A primitive that survives this many regime changes and hosts this many *different kinds* of economic activity, on light permissionless infrastructure, has demonstrated robustness — not just a happy-path proof of concept.

---

## Objections and rebuttals

**"Most offers never settle — only about 1 in 8."** True, and the cancelled/expired pile runs into the **millions** (chart `chart-outcomes`; the estimate scales market-maker reward churn, a floor). But this is a *feature*, not a leak. Orders are free and off-chain, so churn costs the chain essentially nothing — expired offers never touch it. The 2.2 million reward-earning offers in 10 months that 99.7% never settled (chart `chart-churn`) are market makers *re-quoting to track price*, which is precisely what healthy liquidity provision looks like; on an order-book chain those would be millions of on-chain cancel transactions. Here they are free messages on a gossip network. "Most offers don't fill" is the same sentence as "posting a quote is free" — and free quoting is the whole point.

**"The market is tiny — ~$16.9M lifetime volume, ~$800/day on the liquid pair, an ~$2.70 median trade."** Conceded, and it deserves no spin. But scale is a property of the *ecosystem*, not the primitive. This is the trading volume of one mid-size chain in a multi-year bear market; it is a chicken-and-egg liquidity problem (small chain → thin books → small trades), not evidence the mechanism caps out. The relevant question for an adopter is whether the *mechanism* scales, and on that the answer is yes: the throughput peak was ~1 trade every 69 seconds against a chain producing a block every ~19 seconds (chart `chart-throughput`), and the compute footprint stayed near half a percent. The primitive has enormous headroom; what's missing is users, which a larger chain (Cardano's market cap dwarfs Chia's) supplies on adoption.

**"It's bot- and AMM-dominated — TibetSwap is 46% of fills, rising toward 67%, and automation was already a third to half of swaps before it was even labeled."** Conceded (finding `01-amm.md`, charts `chart-amm`, `chart-automation`). But bot dominance is what a *maturing* market looks like — every liquid venue on every chain is dominated by automated market-making, and its arrival here is a sign of health, not decay. Crucially, the automation runs *on the same primitive*: the AMM fills offers, and the aggregator routes through it atomically (Pillar 3). The offer file didn't get displaced by bots; it became the rail the bots settle on. A would-be adopter should *want* this outcome.

**"Resting quotes get picked off, and making markets was 'a rewards game, not a spread game' whose subsidy shrank ~5×."** This is the most honest weakness and I won't soften the mechanics: a stale resting quote is effectively a free option you write to arbitrage bots, which exercise it the instant it moves in their favor — a mispriced-cheap offer fills in ~38 seconds versus ~10 minutes for a fair one (chart `chart-pickoff`). And the DBX liquidity subsidy that made passive market-making pay (16–31% APR on stablecoin pairs) fell from ~$1,700/month to ~$355 as it was paid in a falling token (`#mm-bottomline`). Two things keep this from sinking the case. First, it is not an offer-file pathology — adverse selection against stale quotes is universal across *all* electronic markets; the fix is the same everywhere (quote actively, reprice with the market). Second, and more telling: spreads on the liquid pair are genuinely *tight* (~1% effective half-spread; 93% of trades within ±5% of fair) **and** the chain enforces no privileged access — the pick-off is done by anyone running a bot against a public gossip network, not a co-located incumbent paying for order flow. The market is small and the easy subsidy is gone, but the price formation is real and the playing field is level. Those are the conditions a primitive should be judged on; the subsidy was always a bootstrapping tool, not the thesis.

---

## Recommendation

Adopt offer files. For a coin-set chain with expressive scripting — Cardano, Ergo, or the next chain built this way — the offer file is close to a free lunch: it requires a settlement-payments puzzle and a gossip relay, both of which are modest engineering against capabilities the chain already has, and in return it delivers atomic trustless trades, free off-chain order books, cheap-to-verify settlement, atomic multi-asset bundling, permissionless aggregation, and a built-in price oracle — plus the one thing no account-based chain can cleanly offer, **royalty enforcement that gets stronger, not weaker, when the marketplace steps out of the middle**.

The honest caveats are real and I have stated them: the Chia market is small, mostly machines, and a tough place to passively make markets. But every one of those is downstream of ecosystem size, and none is a property of the primitive. The 4.5-year record shows a mechanism that is cheap, robust across boom and bust, expressive enough to host NFT marketplaces and entire game economies, and safe to compose into higher-order infrastructure. The lesson of the data is the closing line of the post itself: *the mechanism was built for one thing, and people used it for everything.* That generality is the strongest possible argument for porting it. A chain that has the right shape and doesn't ship offer files is leaving a uniquely good primitive on the table.
