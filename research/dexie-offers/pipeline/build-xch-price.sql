-- Load the TRUE external XCH/USD daily price (from pull-xch-price.ts) into an
-- `xch_price` table so any analysis can join a trustworthy USD/XCH onto offers
-- by UTC day (e.g. real USD volume, instead of the offer-flow oracle).
--   bun research/dexie-offers/pipeline/pull-xch-price.ts > generated/xch-price-daily.json
--   ./tools/duckdb generated/offers.duckdb < research/dexie-offers/pipeline/build-xch-price.sql
-- Usage example:
--   SELECT o.*, p.usd_per_xch FROM offers o
--   JOIN xch_price p ON p.day = CAST(o.date_completed AS DATE);
CREATE OR REPLACE TABLE xch_price AS
SELECT CAST(u.d AS DATE)         AS day,
       u.o                        AS open,
       u.h                        AS high,
       u.l                        AS low,
       u.c                        AS usd_per_xch,  -- daily close; the field to join on
       u.v                        AS usd_volume    -- cross-exchange USD volume that day
FROM (
  SELECT UNNEST(days) AS u
  FROM read_json('generated/xch-price-daily.json',
    columns={
      days:'STRUCT(d VARCHAR, o DOUBLE, h DOUBLE, l DOUBLE, c DOUBLE, v DOUBLE)[]'
    })
)
ORDER BY day;
COPY xch_price TO 'generated/xch-price.parquet' (FORMAT parquet);
