-- Add RPC function for top traders ROI trend
-- This function is used for the homepage profit trend chart

-- Create get_top_traders_for_trend function (Top 5 traders with their ROI trend data)
-- This function returns both trader info and their ROI trend data in one call
CREATE OR REPLACE FUNCTION public.get_top_traders_for_trend(p_days integer DEFAULT 7)
 RETURNS TABLE(trader_id uuid, trader_name text, avatar_url text, total_roi numeric, trend_date date, trend_roi numeric, trend_rank integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_trader record;
  v_rank integer := 0;
begin
  -- Get top 5 traders by ROI
  for v_trader in
    select t.id, t.name, t.avatar_url, t.total_roi
    from public.traders t
    where t.total_roi is not null
    order by t.total_roi desc nulls last, t.created_at desc
    limit 5
  loop
    v_rank := v_rank + 1;

    -- Return trend data for this trader using the existing get_trader_roi_trend function
    return query
    select
      v_trader.id::uuid as trader_id,
      v_trader.name::text as trader_name,
      v_trader.avatar_url,
      v_trader.total_roi,
      rt.date as trend_date,
      rt.roi as trend_roi,
      v_rank::integer as trend_rank
    from public.get_trader_roi_trend(v_trader.id, p_days) rt
    order by rt.date;
  end loop;
end;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_top_traders_for_trend(p_days integer) IS 'Get top 5 traders with their ROI trend data for the profit trend chart';
