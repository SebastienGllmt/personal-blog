-- ============================================================================
-- T32 — USD-denominated volume of the offer-file system, and the distribution of
-- per-swap USD value over time. Reads the prebuilt `offer_usd` table.
--   ./tools/duckdb -readonly generated/offers.duckdb -c ".read research/dexie-offers/analysis/32-usd-volume.sql"
-- Build deps: build-xch-price.sql → build-asset-prices.sql → build-offer-usd.sql.
--
-- Each settled offer is valued by its most-trustworthy leg (xch > stablecoin > CAT;
-- see build-offer-usd.sql). Coverage 84.7% & biased to dropping the OLDEST offers of
-- the busiest pairs (↔XCH/stablecoins) — so early-year VOLUME is a FLOOR. Combined
-- Swaps span multiple offer records, so a single economic swap can be counted more
-- than once in the total (an upper-ish bound on that portion). Use median/quantiles,
-- never mean, for the distribution.
-- ============================================================================

.print '== Q1: lifetime total + by valuation method =='
SELECT coalesce(method,'(null)') AS method, count(*) AS offers,
       round(sum(usd)) AS total_usd, round(median(usd),2) AS med_usd, round(max(usd)) AS max_usd
FROM offer_usd GROUP BY 1 ORDER BY total_usd DESC NULLS LAST;

.print '== Q2: priceable total + per-swap distribution (all priceable swaps) =='
SELECT count(*) AS swaps, round(sum(usd)) AS total_usd,
       round(quantile_cont(usd,0.10),3) AS p10, round(quantile_cont(usd,0.25),3) AS p25,
       round(median(usd),2) AS p50, round(quantile_cont(usd,0.75),2) AS p75,
       round(quantile_cont(usd,0.90),2) AS p90, round(quantile_cont(usd,0.99),2) AS p99,
       round(max(usd),2) AS max
FROM offer_usd WHERE usd > 0;

.print '== Q3: volume by year =='
SELECT strftime(date_completed,'%Y') AS yr, count(*) FILTER (WHERE usd>0) AS swaps,
       round(sum(usd)) AS usd_volume, round(median(usd),2) AS med_swap
FROM offer_usd GROUP BY 1 ORDER BY 1;

-- ----------------------------------------------------------------------------
-- CSV 1 — monthly USD volume (+ cumulative) for the total-volume chart.
-- ----------------------------------------------------------------------------
.print '== Q4: writing monthly USD volume CSV =='
COPY (
  SELECT month, swaps, usd_volume,
         round(sum(usd_volume) OVER (ORDER BY month)) AS cum_usd_volume
  FROM (
    SELECT strftime(date_completed,'%Y-%m') AS month,
           count(*) FILTER (WHERE usd>0) AS swaps,
           round(sum(usd)) AS usd_volume
    FROM offer_usd GROUP BY 1
  ) ORDER BY month
) TO 'research/dexie-offers/findings/data/32-usd-volume-monthly.csv' (HEADER, DELIMITER ',');

-- ----------------------------------------------------------------------------
-- CSV 2 — monthly per-swap value distribution (quantiles) for the box-over-time
-- chart. p10/p25/median/p75/p90 (+p99) per month; log-scale Y when plotting.
-- ----------------------------------------------------------------------------
.print '== Q5: writing monthly swap-value distribution CSV =='
COPY (
  SELECT strftime(date_completed,'%Y-%m') AS month,
         count(*) AS n,
         round(quantile_cont(usd,0.10),4) AS p10,
         round(quantile_cont(usd,0.25),4) AS p25,
         round(quantile_cont(usd,0.50),4) AS p50,
         round(quantile_cont(usd,0.75),4) AS p75,
         round(quantile_cont(usd,0.90),4) AS p90,
         round(quantile_cont(usd,0.99),4) AS p99
  FROM offer_usd WHERE usd > 0
  GROUP BY 1 ORDER BY 1
) TO 'research/dexie-offers/findings/data/32-swap-distribution-monthly.csv' (HEADER, DELIMITER ',');

-- ----------------------------------------------------------------------------
-- CSV 3 — overall histogram of per-swap USD value, log-spaced buckets (decades
-- from <$0.01 to >$10k), for an all-time distribution view.
-- ----------------------------------------------------------------------------
.print '== Q6: writing overall log-bucket histogram CSV =='
COPY (
  WITH b AS (
    SELECT CASE WHEN usd < 0.01 THEN 0 ELSE least(7, floor(log10(usd)) + 2) END AS bucket
    FROM offer_usd WHERE usd > 0
  )
  SELECT bucket,
         CASE bucket WHEN 0 THEN '<$0.01' WHEN 1 THEN '$0.01–0.10' WHEN 2 THEN '$0.10–1'
              WHEN 3 THEN '$1–10' WHEN 4 THEN '$10–100' WHEN 5 THEN '$100–1k'
              WHEN 6 THEN '$1k–10k' ELSE '>$10k' END AS label,
         count(*) AS swaps
  FROM b GROUP BY 1 ORDER BY 1
) TO 'research/dexie-offers/findings/data/32-swap-distribution-overall.csv' (HEADER, DELIMITER ',');
.print 'done.'
