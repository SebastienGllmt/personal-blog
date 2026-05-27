-- Value EVERY settled offer in USD → table `offer_usd(offer_id, date_completed,
-- usd, method)`. The shared substrate behind the USD-volume total and the
-- swap-value distribution (and reusable for any USD-denominated analysis).
--   Depends on: xch_price (build-xch-price.sql), asset_xch_price (build-asset-prices.sql)
--   ./tools/duckdb generated/offers.duckdb < research/dexie-offers/pipeline/build-offer-usd.sql
--
-- PRINCIPLE: a settled offer is an atomic swap, so its two sides have equal value —
-- we only need to price ONE side, via the most trustworthy asset present. Trust order:
--   1. xch    — value = (Σ XCH legs) × true XCH/USD that day        [most offers]
--   2. stable — value = Σ trusted-stablecoin legs × $1 (wUSDC.b/wUSDC/wUSDT; NOT USDSC)
--   3. cat    — value = the larger side's non-LP CAT legs priced via asset_xch_price×XCH/USD
--   (else NULL: NFT↔NFT barter, LP-only, or a CAT with no XCH market — left unpriced)
-- LP tokens (TIBET-*) are never an anchor: those offers are liquidity mint/burn, not
-- trades, and pricing the LP leg produces bogus six-figure values. When an offer also
-- carries XCH/stable (most do), it is still valued by that trustworthy leg.
CREATE OR REPLACE TABLE offer_usd AS
WITH cand AS (  -- direct anchors: XCH and stablecoin
  SELECT o.id, o.date_completed,
    sum(l.amount) FILTER (WHERE l.asset_id='xch') * max(p.usd_per_xch)        AS v_xch,
    sum(l.amount) FILTER (WHERE l.code IN ('wUSDC.b','wUSDC','wUSDT'))        AS v_stable
  FROM offers o
  JOIN legs l ON l.offer_id = o.id
  JOIN xch_price p ON p.day = CAST(o.date_completed AS DATE)
  GROUP BY 1, 2
),
cat_side AS (  -- CAT-only fallback: value each side's non-LP CAT legs
  SELECT l.offer_id, l.side,
         sum(l.amount * cp.xch_per_unit * p.usd_per_xch) AS s
  FROM legs l
  JOIN xch_price p ON p.day = CAST(l.date_completed AS DATE)
  JOIN asset_xch_price cp ON cp.asset_id = l.asset_id
                         AND cp.mon = strftime(l.date_completed, '%Y-%m')
  WHERE NOT l.is_nft AND l.asset_id <> 'xch'
    AND l.code NOT IN ('wUSDC.b','wUSDC','wUSDT') AND l.code NOT LIKE 'TIBET-%'
  GROUP BY 1, 2
),
cat_val AS (SELECT offer_id, max(s) AS v_cat FROM cat_side GROUP BY 1)
SELECT c.id AS offer_id, c.date_completed,
       coalesce(nullif(c.v_xch,0), nullif(c.v_stable,0), cv.v_cat) AS usd,
       CASE WHEN c.v_xch  > 0 THEN 'xch'
            WHEN c.v_stable > 0 THEN 'stable'
            WHEN cv.v_cat > 0 THEN 'cat'
            ELSE 'none' END AS method
FROM cand c
LEFT JOIN cat_val cv ON cv.offer_id = c.id;
COPY offer_usd TO 'generated/offer-usd.parquet' (FORMAT parquet);
