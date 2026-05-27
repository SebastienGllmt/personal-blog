-- Per-CAT monthly XCH price, so any fungible CAT can be valued in XCH (and thence
-- USD via xch_price). Built from single-pair XCH<->CAT settled offers: xch_per_unit
-- = median(XCH amount / CAT amount) per asset per month. Monthly (not daily) because
-- thin tokens trade sparsely; the median is robust to the junk anyone can post.
--   ./tools/duckdb generated/offers.duckdb < research/dexie-offers/pipeline/build-asset-prices.sql
--
-- EXCLUSIONS (deliberate):
--  * NFTs — non-fungible, no per-unit price.
--  * TIBET-* LP tokens — liquidity receipts, not spot assets; pricing them via their
--    thin market inflates liquidity add/remove operations into bogus mega-"swaps".
--  * XCH itself is the numéraire (xch_per_unit ≡ 1); handled in valuation, not here.
-- Trusted stablecoins are intentionally NOT special-cased here — they get a $1 USD
-- anchor directly in build-offer-usd.sql, not an XCH-derived price.
CREATE OR REPLACE TABLE asset_xch_price AS
SELECT lc.asset_id,
       strftime(o.date_completed, '%Y-%m')        AS mon,
       median(lx.amount / lc.amount)              AS xch_per_unit,  -- XCH per 1 CAT unit
       count(*)                                   AS n
FROM offers o
JOIN legs lx ON lx.offer_id = o.id AND lx.asset_id = 'xch'
JOIN legs lc ON lc.offer_id = o.id AND lc.asset_id <> 'xch'
            AND NOT lc.is_nft AND lc.code NOT LIKE 'TIBET-%'
WHERE o.is_single_pair AND lc.amount > 0 AND lx.amount > 0
GROUP BY 1, 2;
COPY asset_xch_price TO 'generated/asset-xch-price.parquet' (FORMAT parquet);
