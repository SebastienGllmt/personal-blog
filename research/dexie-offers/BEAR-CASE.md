# The bear case against offer files

*Why a Chia-like chain should not have bet on offer files — and what it should have built instead*

## Thesis

Offer files are an elegant answer to a question almost nobody at scale was asking. The trustless, off-chain, partially-signed spend bundle is a genuinely beautiful primitive — atomic, no counterparty risk, no listing fee, free to create. But four and a half years and 833,145 settled trades of real-world track record are now in, and the data points to one uncomfortable verdict: **the offer-file market converged on exactly the architecture it was built to avoid.** Roughly half to two-thirds of all fills are now taken by a single automated market maker quoting a liquidity pool; discovery runs through one centralized aggregator; liquidity is rented with a token subsidy rather than earned on spread; and for every offer that settles, eight or nine are churned by bots re-posting quotes — the manual, wasteful version of work a single AMM pool does structurally for free.

So the argument is not that offer files *failed* — they cleared real trades and did some things uniquely well. The argument is about **opportunity cost**: a chain with Chia-style expressive coin scripting (Cardano, Ergo, any UTXO/coin-set chain with programmable puzzles) that is deciding *now* what liquidity primitive to ship first should not lead with offer files. It should make a different bet — an AMM/liquidity-pool-first design, a native on-chain order book, or an intent/solver architecture — because the end-state the offer-file market actually reached vindicates those designs, not the one Chia picked.

## Steelman: what offer files genuinely get right

A fair bear case has to concede the bull case first, and on the merits there is a lot to concede.

**Trustless atomic settlement is real and elegant.** The settlement-payments puzzle means a trade either completes in full, in one block, with both sides satisfied — or it does nothing. No escrow, no intermediary holding funds, no counterparty risk. The offer file is a plain `offer1…` string you can email, paste in a Discord, or gossip over Splash; the chain is touched *only* on a fill. Creating, listing, and cancelling an order are all free off-chain events. That is a strictly cleaner trust model than most centralized venues, and it is not marketing — it is how the mechanism actually works.

**Atomic multi-asset bundling is a real capability.** ~10% of offers carry 3+ assets, 2.2% carry 5+, and the tail runs to a single atomic trade packing **32 assets** (the post's *assets-per-offer* chart). The spikes at bundle sizes 5 and 11 are the fingerprints of real templated operations — LP deposits, NFT-plus-token baskets. An order book quoting one instrument at a time cannot express "give me all of this, atomically, or none of it."

**Royalty enforcement is a genuine win.** 100% of traded NFTs carry a royalty, only 7.6% set it to zero, and the trade-weighted median royalty has *risen* from 5% to 10% over the four years (the *royalties* finding, `07-royalties.md`). The evidence it's honored is clean: the share of sales that mint a payout coin climbs monotonically with the royalty rate, 9.5% → 58.3%, while sale price stays flat (the *royalties* chart). In a market with nothing *forcing* a buyer to pay, creators raising their take only makes sense if the protocol itself honors it — and it does.

**The compute footprint is tiny by design.** Offer settlements are ~0.5% of Chia's theoretical block-compute capacity at peak (the *blockspace* chart); a whole DEX runs on half a percent of headroom. Cheap to verify is a real virtue.

**And there is a price oracle for free.** Because every settled offer is an accepted price, XCH/USD reconstructs cleanly from stablecoin trades, ~1.8% median spread, stable on as few as five trades a day (the *oracle* chart).

These are not throwaway concessions. Take them seriously and the bear case has to clear a high bar. Here is why it still clears.

## The better bet

The counterfactual matters, so state it concretely. A Chia-like chain has expressive coin-level scripting — the same property that makes the settlement puzzle possible makes AMM pools, on-chain order books, and solver-settled intents possible too. Given a one-shot choice of what to ship *first* as the liquidity primitive, the better bets were:

- **AMM/liquidity-pool-first.** A single pool per pair is continuous, always-on, self-quoting, and requires *zero* manual repricing. One on-chain object replaces millions of re-posted quotes.
- **A native on-chain order book**, where resting liquidity is *protected* and *priced* by the protocol (price-time priority), instead of being a free option anyone can pick off.
- **An intent/solver architecture** (the modern Ethereum-style design): users sign intents, competing solvers source liquidity and settle atomically — capturing the offer file's atomic-settlement win *plus* a real competitive discovery layer.

The reason these were the better bet is not theoretical. It is that **the offer-file market built two of them anyway, badly, on top of the wrong primitive** — and the data shows the seams.

## Bear pillar 1: it became an AMM market regardless

The single most damning chart is the *AMM-share* chart (`01-amm.md`). Since dexie began labeling fills in April 2025, **46.2%** of all settled offers (163,603 / 354,521) were taken not by a person but by the TibetSwap AMM — a bot quoting a pool — rising to **67.4% by March 2026**. And this is an explicit *floor*: only one AMM (`tibet2`) is labeled; every other bot is invisible. The *automation* chart pushes the timeline back further: a bot fingerprint (sub-minute fill, pool-derived non-round amounts) catches **36–51%** of token swaps in 2023–24, years before any label existed. The machines were always here.

The mechanical tells are unambiguous: an AMM fill settles in a median **~35 seconds** (70.7% sub-minute) against **~3.9 hours** for human P2P; humans pick round XCH amounts (48.8% are multiples of 0.05), the AMM emits whatever the pool math returns. This is a liquidity-pool market wearing an offer-file costume.

So pose the question the bull case must answer: *if the market converges on pooled AMM liquidity regardless, why pay the complexity cost of the offer-file primitive instead of building the pool natively?* A native AMM gives you the same continuous liquidity with one on-chain pool object per pair — no off-chain gossip network, no aggregator, no quote churn. The offer file's end-state is the AMM. Chia spent four years and a P2P architecture arriving at the design it could have shipped on day one.

## Bear pillar 2: "trustless P2P" discovery is centralized off-chain anyway

The atomic-settlement win is real. But settlement is not a market — *discovery* is, and discovery here is a centralized chokepoint. There is no on-chain order book and no native price discovery; orders are free, off-chain, and invisible until they fill. To find a counterparty you rely on **dexie** as indexer/aggregator/marketplace and **Splash** for propagation. The *aggregator* chart makes the dependence concrete: dexie's Combined Swap — multi-source routing settled atomically in one offer — goes from zero before 2024 to **~half of all offers** by 2026, and **59% of TibetSwap fills are these routed Combined Swaps**. "The AMM is half the market" is, to a large degree, "dexie routes orders to the AMM."

This guts much of the decentralization pitch. The offer file proves *settlement* doesn't need a trusted intermediary — a genuine result — but the actual market needs a centralized indexer to find prices, a centralized aggregator to route them, and a gossip network to move the files. An order-book or AMM chain puts price discovery *on-chain* where it is censorship-resistant and verifiable. The offer-file chain pushed discovery off-chain and watched it re-centralize on one company's API. The atomic-settlement guarantee is, ironically, what makes routing through that untrusted aggregator safe — so the strongest part of the design exists largely to backstop the centralized layer the design was supposed to make unnecessary.

## Bear pillar 3: resting orders are a free option to bots

This is the structural defect, and it is the cleanest in the data (the *tightness* finding, `12-tightness.md`). Spreads on the liquid XCH↔USD pair are genuinely tight — ~1% effective half-spread, 93% of fills within ±5% of fair. But bucket settled offers by how favorably they were priced for the taker and the time-to-fill *collapses* on the cheap side: an offer priced >5% in the taker's favor fills in a median **~38 seconds** (65% sub-minute), while a fairly-priced one sits for ~10 minutes (the *pick-off* chart). The picker is the AMM: it fills in 51s versus ~18 minutes for everyone else.

A resting offer is, in effect, **a free option you write to arbitrage bots** — they exercise it the instant it drifts in their favor. That is textbook adverse selection: you keep the bad fills and lose the good ones. On an on-chain order book with price-time priority, or in an AMM where the curve reprices automatically, resting liquidity is *protected and repriced by the protocol*. On offer files there is no protection — every stale quote is a gift. The post's own market-maker verdict is blunt: "you can't passively rest orders and collect a spread."

Which is why the market never paid for liquidity on spread — it *rented* it. dexie's Liquidity Incentive Program pays makers in DBX to keep open offers within 5% of market, an estimated 16–31% APR on the liquid pairs (100–340% on thin ones), and *only open offers earn* — so the constant repricing that gets you picked off is exactly the behavior being subsidized. It was "a rewards game, not a spread game" (the *market-maker* section). And the rented liquidity is evaporating: priced through the chain's own order flow, the subsidy **shrank ~5×, from ~$1,700/month in mid-2025 to ~$355 by 2026** (the *mm-rewards* discussion), because the reward is denominated in a token that fell with XCH. Liquidity that needs a shrinking subsidy to exist was never organic. An AMM earns its fee from the curve; an order book earns its spread from priority. Offer files earned neither, so the chain had to pay for liquidity directly — and that bill is coming due.

## Bear pillar 4: massive wasteful churn

The waste is the mirror image of the pick-off problem. Because a stale quote is a liability, makers must constantly cancel and re-post to track the price — and they do, enormously. The *churn* charts (from the incentive reward data) show **150,000–280,000 reward-earning offers a month against 17,000–39,000 that settle**: roughly **8–9 churned offers per settled one**, steady month to month. Over ten months, **2.2 million reward-earning offers, 99.7% of which never settled.** And those are only the *incentivized* makers dexie can see; the README is explicit that cumulative offer creation runs into the *millions*, of which all-time settlements (~985k) are a small minority — the post's headline estimate is that only **about 1 in 8 offer files ever settles.**

This is precisely the work an AMM does for free. A single pool reprices continuously as the curve moves — no re-posting, no cancellations, no gossip-network spam. Offer files make market-makers do *manually and wastefully* what pooled liquidity does *structurally*. Yes, the churn is cheap to verify (expirations never touch the chain; cancellations batch). But cheap-to-verify is not the same as valuable, and "we generate millions of throwaway quotes to simulate continuous liquidity" is a description of a workaround, not a feature. The AMM-first chain simply does not have this problem.

## Bear pillar 5: the market stayed tiny and retail

Four and a half years in, the scale is a flea market. **89.7%** of offers are a simple one-for-one swap; the **median trade is ~0.2 XCH (~$2.70)**; lifetime dollar volume — valuing every settled swap at the true XCH price on its day — is **~$16.9M** (a floor); the liquid XCH↔USD pair clears a **median ~17 trades and ~$800 a day**, with the 99th-percentile trade just **~24 XCH** and the largest single fill in four years 2,582 XCH (the *scale* stats and the *tightness* finding). At peak the *entire* settled market cleared one trade every ~69 seconds (the *throughput* chart). The much-cited "offer files are ~33% of Chia's actual compute in 2026" is not a growth story — the README and the *actual-compute* chart are explicit that offer compute held *flat* while the chain's total compute collapsed ~4×. Offer files became a large share of a shrinking pie by attrition, not expansion.

The primitive simply did not unlock the liquidity or scale the pitch promised. The composition tells the same story: it is overwhelmingly **NFTs (38% of offers), memecoins (27%), and game economies (20%)** — the serious financial use case (stablecoins, RWAs) is a single-digit-percent niche (the *categories* chart). None of this is a knock on NFTs or game economies — those are real and interesting uses. The point is the counterfactual: an AMM/order-book chain would have served NFTs and games *and* offered a credible venue for the financial use case that offer files never grew into. A retail bazaar is what you get when the only liquidity primitive can't support resting depth.

## What the bulls get right

In fairness, three of the bull case's strongest points survive the bear argument largely intact, and an honest reader should weigh them.

**Royalty enforcement is genuinely better here.** Trustless P2P trading *should* let buyers route around creator royalties, and on most chains it does; on Chia the royalty is baked into the NFT puzzle and the settlement spend must satisfy it. The data confirms it holds. But note the seam: this is a property of Chia's NFT *puzzle standard*, not of the offer-file order model — the same expressive scripting that enforces a royalty in a settlement spend can enforce it in an AMM swap or an order-book fill. The win is real and separable; it does not require the offer-file architecture.

**Atomic multi-asset bundling is a real edge** that a naive order book lacks. But an intent/solver architecture captures it — a signed intent can specify an all-or-nothing multi-asset basket, and the solver settles it atomically — so this argues for *intents over order books*, not for offer files over everything.

**Atomic settlement with no counterparty risk is elegant and worth keeping.** The right reading is that the *settlement layer* of offer files is the good idea, and the *discovery/order layer* is the bad bet. An intent/solver design keeps the former and replaces the latter with real competitive price discovery.

What the bulls are wrong about is the implication. "It cleared real trades, enforces royalties, is cheap to verify, and gives you a free oracle" is all true and all compatible with the bear thesis — because every one of those wins is either achievable in a better architecture (royalties, atomicity, the oracle falls out of any settled-price tape) or is a virtue that doesn't bear weight (cheap-to-verify ≠ valuable; an AMM is also cheap).

## Recommendation

For a Chia-like chain choosing its liquidity primitive today, the evidence says: **do not lead with offer files.** Lead with pooled, always-on liquidity (an AMM) or protocol-protected resting liquidity (an on-chain order book), and — best of all — an **intent/solver architecture** that keeps offer files' one durable win (trustless atomic settlement, including multi-asset baskets) while replacing their fatal weakness (off-chain, unprotected, pick-off-prone resting orders and a re-centralized discovery layer) with real on-chain price discovery and competitive solving.

The offer-file market is the strongest evidence for this recommendation, because it ran the experiment. Given total freedom, it converged on an AMM (46→67% of fills), centralized its discovery on one aggregator (~half of fills routed), rented its liquidity with a subsidy that has already shrunk 5×, and generated 8–9 wasted quotes per trade to fake the continuous liquidity a pool provides for free — and after all that, it is a flea market clearing ~$800/day on its best pair. The mechanism is genuinely elegant. The bet was wrong. A chain with this much scripting power should aim its expressiveness at a primitive that protects and prices liquidity natively, and keep offer-file-style atomic settlement as the *rail underneath* it — not as the market itself.
