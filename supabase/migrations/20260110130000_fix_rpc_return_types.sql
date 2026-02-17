-- Fix return type mismatch for trader related RPC functions
-- The 'name' column in 'traders' table is varchar(100), but RPCs define it as text.
-- While text can hold varchar, PL/pgSQL 'RETURN QUERY' requires strict type matching
-- or explicit casting in the SELECT clause.

-- 1. Fix get_traders_with_user_status
CREATE OR REPLACE FUNCTION public.get_traders_with_user_status(p_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, avatar_url text, description text, created_at timestamp with time zone, updated_at timestamp with time zone, is_subscribed boolean, is_followed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    t.id,
    t.name::text, -- Explicit cast to text
    t.avatar_url,
    t.description,
    t.created_at,
    t.updated_at,
    case when p_user_id is not null then
      exists (select 1 from public.user_subscriptions us where us.user_id = p_user_id and us.trader_id = t.id)
    else false end as is_subscribed,
    case when p_user_id is not null then
      exists (select 1 from public.user_follows uf where uf.user_id = p_user_id and uf.trader_id = t.id)
    else false end as is_followed
  from
    public.traders t
  order by
    t.total_roi desc nulls last,
    t.created_at desc
  limit p_limit;
end;
$function$;

-- 2. Fix get_traders_with_stats
CREATE OR REPLACE FUNCTION public.get_traders_with_stats(p_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, avatar_url text, description text, is_online_today boolean, is_online boolean, followers_count integer, win_rate numeric, total_roi numeric, avg_pnl_ratio numeric, profit_factor numeric, total_pnl numeric, trading_days integer, subscription_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, total_signals integer, long_signals integer, short_signals integer, active_signals integer, is_subscribed boolean, is_followed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    t.id,
    t.name::text, -- Explicit cast to text
    t.avatar_url,
    t.description,
    t.is_online_today,
    t.is_online,
    t.followers_count,
    t.win_rate,
    t.total_roi,
    t.avg_pnl_ratio,
    t.profit_factor,
    t.total_pnl,
    t.trading_days,
    t.subscription_count,
    t.created_at,
    t.updated_at,
    t.total_signals,
    t.long_signals,
    t.short_signals,
    (select count(*)::integer from public.signals s where s.trader_id = t.id and s.status = 'active') as active_signals,
    case when p_user_id is not null then
      exists (select 1 from public.user_subscriptions us where us.user_id = p_user_id and us.trader_id = t.id)
    else false end as is_subscribed,
    case when p_user_id is not null then
      exists (select 1 from public.user_follows uf where uf.user_id = p_user_id and uf.trader_id = t.id)
    else false end as is_followed
  from
    public.traders t
  order by
    t.total_roi desc nulls last,
    t.created_at desc
  limit p_limit
  offset p_offset;
end;
$function$;

-- 3. Fix search_traders_with_stats
CREATE OR REPLACE FUNCTION public.search_traders_with_stats(p_query text, p_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, avatar_url text, description text, is_online_today boolean, is_online boolean, followers_count integer, win_rate numeric, total_roi numeric, avg_pnl_ratio numeric, profit_factor numeric, total_pnl numeric, trading_days integer, subscription_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, total_signals integer, long_signals integer, short_signals integer, active_signals integer, is_subscribed boolean, is_followed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    t.id,
    t.name::text, -- Explicit cast to text
    t.avatar_url,
    t.description,
    t.is_online_today,
    t.is_online,
    t.followers_count,
    t.win_rate,
    t.total_roi,
    t.avg_pnl_ratio,
    t.profit_factor,
    t.total_pnl,
    t.trading_days,
    t.subscription_count,
    t.created_at,
    t.updated_at,
    t.total_signals,
    t.long_signals,
    t.short_signals,
    (select count(*)::integer from public.signals s where s.trader_id = t.id and s.status = 'active') as active_signals,
    case when p_user_id is not null then
      exists (select 1 from public.user_subscriptions us where us.user_id = p_user_id and us.trader_id = t.id)
    else false end as is_subscribed,
    case when p_user_id is not null then
      exists (select 1 from public.user_follows uf where uf.user_id = p_user_id and uf.trader_id = t.id)
    else false end as is_followed
  from
    public.traders t
  where
    (
      p_query IS NULL 
      OR p_query = '' 
      OR t.name ILIKE '%' || p_query || '%' 
      OR t.description ILIKE '%' || p_query || '%'
    )
  order by
    t.total_roi desc nulls last,
    t.created_at desc
  limit p_limit;
end;
$function$;
