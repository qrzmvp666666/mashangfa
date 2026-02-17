-- Migration: 修复 traders/signals 的 Realtime 订阅无法收到事件的问题
-- 原因：REPLICA IDENTITY 为 DEFAULT，且 RLS policy 可能过滤了 Realtime 推送
-- 解决方案：
--   1. 设置 REPLICA IDENTITY FULL（确保 UPDATE/DELETE 能输出完整 old/new）
--   2. 确保 anon 角色对这两张表有 SELECT 权限（Realtime 需要）

-- Step 1: 设置 REPLICA IDENTITY FULL（让 Realtime 能拿到完整 old/new record）
ALTER TABLE public.traders REPLICA IDENTITY FULL;
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Step 2: 确保 anon 角色可以 SELECT（Realtime 推送依赖此权限）
-- 注意：如果你的表已经有更严格的 RLS policy，可以调整下面的策略
-- 这里给一个"最小可用"的 policy：允许 anon 读取所有行（仅用于 Realtime 订阅可见性）

-- 对 traders 表：如果还没有 anon SELECT policy，创建一个
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='traders'
      AND policyname='realtime_anon_select_traders'
  ) THEN
    CREATE POLICY realtime_anon_select_traders
      ON public.traders
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- 对 signals 表：如果还没有 anon SELECT policy，创建一个
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='signals'
      AND policyname='realtime_anon_select_signals'
  ) THEN
    CREATE POLICY realtime_anon_select_signals
      ON public.signals
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Step 3: 确保表在 publication 中（通常已经在，但以防万一）
-- 注意：Supabase 默认 realtime publication 名称可能是 supabase_realtime
-- 你可以根据实际情况调整，或者通过 Dashboard 开启

-- 查看当前 publication（仅供参考，不影响 migration）
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

COMMENT ON TABLE public.traders IS 'Realtime enabled with REPLICA IDENTITY FULL and anon SELECT policy for subscriptions';
COMMENT ON TABLE public.signals IS 'Realtime enabled with REPLICA IDENTITY FULL and anon SELECT policy for subscriptions';
