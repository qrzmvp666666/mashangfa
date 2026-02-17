-- 会员套餐表
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 购买记录增加 plan_id 关联会员套餐
ALTER TABLE public.purchase_records
  ADD COLUMN IF NOT EXISTS plan_id BIGINT REFERENCES public.membership_plans(id);

-- 插入默认的一期会员卡套餐
INSERT INTO public.membership_plans (name, description, price, duration_days, features, is_active, sort_order)
VALUES (
  '一期会员卡',
  '购买一期会员，可查看当期精准天地中特预测内容',
  9.90,
  1,
  '["查看当期精准预测内容", "每天15点准时推送", "精准天地中特"]'::jsonb,
  true,
  1
);

-- RPC: 获取可用的会员套餐
CREATE OR REPLACE FUNCTION get_membership_plans()
RETURNS SETOF public.membership_plans AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.membership_plans
  WHERE is_active = true
  ORDER BY sort_order ASC;
END;
$$ LANGUAGE plpgsql;

-- RPC: 获取购买记录（关联套餐名称）
DROP FUNCTION IF EXISTS get_purchase_records(UUID);
CREATE OR REPLACE FUNCTION get_purchase_records(p_auth_user_id UUID)
RETURNS TABLE (
  id BIGINT,
  auth_user_id UUID,
  order_no TEXT,
  product_name TEXT,
  amount NUMERIC,
  payment_method payment_method,
  payment_status payment_status,
  payment_time TIMESTAMPTZ,
  completed_time TIMESTAMPTZ,
  remark TEXT,
  plan_id BIGINT,
  plan_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id, pr.auth_user_id, pr.order_no, pr.product_name, pr.amount,
    pr.payment_method, pr.payment_status, pr.payment_time, pr.completed_time,
    pr.remark, pr.plan_id,
    COALESCE(mp.name, pr.product_name) AS plan_name,
    pr.created_at, pr.updated_at
  FROM public.purchase_records pr
  LEFT JOIN public.membership_plans mp ON pr.plan_id = mp.id
  WHERE pr.auth_user_id = p_auth_user_id
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 开启 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.membership_plans;
