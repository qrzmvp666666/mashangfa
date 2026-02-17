-- Rollback: 恢复 traders/signals 的 REPLICA IDENTITY 为 DEFAULT
-- 并移除 anon SELECT policy（如果是本次 migration 新增的）

-- Step 1: 恢复 REPLICA IDENTITY DEFAULT
ALTER TABLE public.traders REPLICA IDENTITY DEFAULT;
ALTER TABLE public.signals REPLICA IDENTITY DEFAULT;

-- Step 2: 移除 anon SELECT policy（如果不需要）
DROP POLICY IF EXISTS realtime_anon_select_traders ON public.traders;
DROP POLICY IF EXISTS realtime_anon_select_signals ON public.signals;

COMMENT ON TABLE public.traders IS NULL;
COMMENT ON TABLE public.signals IS NULL;
