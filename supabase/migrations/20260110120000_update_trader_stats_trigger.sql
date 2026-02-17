-- Create a function to calculate and update trader statistics
create or replace function public.update_trader_stats_on_signal_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_trader_id uuid;
  v_total_roi numeric;
  v_win_rate numeric;
  v_total_pnl numeric;
  v_total_signals integer;
  v_long_signals integer;
  v_short_signals integer;
  v_win_count integer;
  v_loss_count integer;
  v_total_win_pnl numeric;
  v_total_loss_pnl numeric;
  v_avg_win numeric;
  v_avg_loss numeric;
  v_avg_pnl_ratio numeric;
  v_profit_factor numeric;
  v_trading_days integer;
  v_first_signal_date timestamptz;
begin
  -- Determine the affected trader_id
  if (TG_OP = 'DELETE') then
    v_trader_id := OLD.trader_id;
  else
    v_trader_id := NEW.trader_id;
  end if;

  -- If trader_id is null, exit
  if v_trader_id is null then
    return null;
  end if;

  -- 1. Base Counts (All signals)
  select 
    count(*),
    count(case when direction = 'long' then 1 end),
    count(case when direction = 'short' then 1 end),
    min(created_at)
  into 
    v_total_signals,
    v_long_signals,
    v_short_signals,
    v_first_signal_date
  from public.signals
  where trader_id = v_trader_id;

  -- 2. Trading Days
  if v_first_signal_date is not null then
    v_trading_days := extract(day from (now() - v_first_signal_date))::integer;
    -- Ensure at least 1 day if signals exist
    if v_trading_days < 1 then v_trading_days := 1; end if;
  else 
    v_trading_days := 0;
  end if;

  -- 3. PnL Related Stats (Only closed signals)
  -- Assuming status that are not 'active' or 'cancelled' imply valid PnL calculation
  -- Specifically matching statuses set by backtest worker: 'closed', 'closed_profit', 'closed_loss'
  select 
    coalesce(sum(roi), 0),
    coalesce(sum(realized_pnl), 0),
    count(case when realized_pnl > 0 then 1 end),
    count(case when realized_pnl < 0 then 1 end),
    coalesce(sum(case when realized_pnl > 0 then realized_pnl end), 0),
    coalesce(sum(case when realized_pnl < 0 then abs(realized_pnl) end), 0)
  into 
    v_total_roi,
    v_total_pnl,
    v_win_count,
    v_loss_count,
    v_total_win_pnl,
    v_total_loss_pnl
  from public.signals
  where trader_id = v_trader_id
  and status in ('closed', 'closed_profit', 'closed_loss');

  -- 4. Calculate Derived Metrics
  
  -- Total ROI (Convert decimal 0.15 to percentage 15.00)
  v_total_roi := v_total_roi * 100;

  -- Win Rate
  if (v_win_count + v_loss_count) > 0 then
    v_win_rate := (v_win_count::numeric / (v_win_count + v_loss_count)::numeric) * 100;
  else
    v_win_rate := 0;
  end if;

  -- Avg PnL Ratio (Avg Win / Avg Loss)
  if v_win_count > 0 then
    v_avg_win := v_total_win_pnl / v_win_count;
  else
    v_avg_win := 0;
  end if;

  if v_loss_count > 0 then
    v_avg_loss := v_total_loss_pnl / v_loss_count;
  else
    v_avg_loss := 0; 
  end if;

  if v_avg_loss > 0 then
    v_avg_pnl_ratio := v_avg_win / v_avg_loss;
  else
    -- If no losses, effectively infinite ratio. We store avg_win or a capped value.
    v_avg_pnl_ratio := v_avg_win; 
  end if;

  -- Profit Factor (Total Win / Total Loss)
  if v_total_loss_pnl > 0 then
    v_profit_factor := v_total_win_pnl / v_total_loss_pnl;
  else
    v_profit_factor := v_total_win_pnl; -- Simple fallback
  end if;

  -- 5. Update Traders Table
  update public.traders
  set 
    total_roi = round(v_total_roi, 2),
    win_rate = round(v_win_rate, 2),
    avg_pnl_ratio = round(v_avg_pnl_ratio, 2),
    profit_factor = round(v_profit_factor, 2),
    total_pnl = round(v_total_pnl, 2),
    trading_days = v_trading_days,
    total_signals = v_total_signals,
    long_signals = v_long_signals,
    short_signals = v_short_signals,
    updated_at = now()
  where id = v_trader_id;

  return null;
end;
$$;

-- Create Trigger
-- Trigger on INSERT (new signal), DELETE (removed signal), 
-- or UPDATE of columns that affect stats (status, roi, realized_pnl, direction)
drop trigger if exists on_signal_update_stats on public.signals;

create trigger on_signal_update_stats
after insert or delete or update of status, roi, realized_pnl, direction
on public.signals
for each row
execute function public.update_trader_stats_on_signal_change();
