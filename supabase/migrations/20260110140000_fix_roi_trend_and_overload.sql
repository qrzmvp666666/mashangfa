-- Fix 1: Drop conflicting function overload
DROP FUNCTION IF EXISTS public.get_multiple_traders_roi_trend(uuid[], integer);

-- Fix 2: Update functions to correctly count 'closed_profit' and 'closed_loss' signals
-- Previously it only looked for exact string 'closed', which resulted in 0 ROI.

-- 1. Single Trader ROI Trend (Cumulative)
CREATE OR REPLACE FUNCTION public.get_trader_roi_trend(p_trader_id uuid, p_days integer DEFAULT 7)
 RETURNS TABLE(date date, roi numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH 
  dates AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day
  ),
  base_roi AS (
    SELECT COALESCE(SUM(s.roi), 0) as total
    FROM signals s 
    WHERE s.trader_id = p_trader_id
      AND (s.status LIKE 'closed%') -- Updated to include 'closed_profit', 'closed_loss'
      AND s.closed_at < (CURRENT_DATE - (p_days - 1))
  ),
  daily_roi AS (
    SELECT
      s.closed_at::date as day,
      SUM(s.roi) as total
    FROM signals s
    WHERE s.trader_id = p_trader_id
      AND (s.status LIKE 'closed%') -- Updated to include 'closed_profit', 'closed_loss'
      AND s.closed_at >= (CURRENT_DATE - (p_days - 1))
    GROUP BY s.closed_at::date
  )
  SELECT 
    dates.day as date,
    (
      (SELECT total FROM base_roi) + 
      SUM(COALESCE(dr.total, 0)) OVER (ORDER BY dates.day ASC)
    ) as roi
  FROM dates
  LEFT JOIN daily_roi dr ON dr.day = dates.day
  ORDER BY dates.day ASC;
END;
$function$;

-- 2. Multiple Traders ROI Trend (Cumulative)
CREATE OR REPLACE FUNCTION public.get_multiple_traders_roi_trend(p_trader_ids text[], p_days integer DEFAULT 7)
 RETURNS TABLE(trader_id text, date date, roi numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH 
  -- 1. Unnest trader IDs
  traders AS (
    SELECT DISTINCT unnest(p_trader_ids)::uuid AS id
  ),
  -- 2. Generate date series
  dates AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day
  ),
  -- 3. Calculate Base ROI (ROI before the start date) for EACH trader
  base_roi AS (
    SELECT 
      t.id as trader_id,
      COALESCE(SUM(s.roi), 0) as total
    FROM traders t
    LEFT JOIN signals s ON s.trader_id = t.id 
      AND (s.status LIKE 'closed%') -- Updated
      AND s.closed_at < (CURRENT_DATE - (p_days - 1))
    GROUP BY t.id
  ),
  -- 4. Calculate Daily ROI Increments for EACH trader
  daily_roi AS (
    SELECT
      t.id as trader_id,
      s.closed_at::date as day,
      SUM(s.roi) as total
    FROM traders t
    JOIN signals s ON s.trader_id = t.id
      AND (s.status LIKE 'closed%') -- Updated
      AND s.closed_at >= (CURRENT_DATE - (p_days - 1))
      AND s.closed_at <= (CURRENT_DATE + 1)
    GROUP BY t.id, s.closed_at::date
  ),
  -- 5. Cross join traders and dates to ensure full coverage
  trader_dates AS (
    SELECT 
      traders.id as trader_id,
      dates.day
    FROM traders
    CROSS JOIN dates
  )
  -- 6. Combine and calculate cumulative
  SELECT 
    td.trader_id::text,
    td.day as date,
    (
      COALESCE(b.total, 0) + 
      SUM(COALESCE(d.total, 0)) OVER (PARTITION BY td.trader_id ORDER BY td.day ASC)
    ) as roi
  FROM trader_dates td
  LEFT JOIN base_roi b ON b.trader_id = td.trader_id
  LEFT JOIN daily_roi d ON d.trader_id = td.trader_id AND d.day = td.day
  ORDER BY td.trader_id, td.day ASC;
END;
$function$;
