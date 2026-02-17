-- =============================================
-- 兑换码系统：表 + 原子兑换 RPC
-- =============================================

-- 1. 兑换码表
CREATE TABLE IF NOT EXISTS public.redemption_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  plan_id BIGINT NOT NULL REFERENCES public.membership_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON public.redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_status ON public.redemption_codes(status);

-- 2. 兑换记录表
CREATE TABLE IF NOT EXISTS public.redemption_records (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  code TEXT NOT NULL,
  plan_id BIGINT NOT NULL REFERENCES public.membership_plans(id),
  plan_name TEXT,
  duration_days INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  previous_expires_at TIMESTAMPTZ,
  new_expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_redemption_records_user ON public.redemption_records(auth_user_id);

-- 3. RLS 策略
ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read redemption_codes"
  ON public.redemption_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view own redemption_records"
  ON public.redemption_records FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- 4. 原子兑换 RPC 函数
CREATE OR REPLACE FUNCTION public.redeem_code_atomic(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_code_row public.redemption_codes%ROWTYPE;
  v_plan_row public.membership_plans%ROWTYPE;
  v_current_expires TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_draw_hour INTEGER := 21;
  v_draw_minute INTEGER := 30;
  v_today_draw TIMESTAMPTZ;
  v_new_expires TIMESTAMPTZ;
  v_record_id BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '请先登录');
  END IF;

  p_code := UPPER(TRIM(p_code));

  SELECT * INTO v_code_row
  FROM public.redemption_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '兑换码不存在');
  END IF;

  IF v_code_row.expires_at < v_now THEN
    UPDATE public.redemption_codes SET status = 'expired', updated_at = v_now WHERE id = v_code_row.id;
    RETURN jsonb_build_object('success', false, 'error', '兑换码已过期');
  END IF;

  IF v_code_row.status = 'used' THEN
    RETURN jsonb_build_object('success', false, 'error', '兑换码已被使用');
  END IF;

  IF v_code_row.status = 'expired' THEN
    RETURN jsonb_build_object('success', false, 'error', '兑换码已过期');
  END IF;

  SELECT * INTO v_plan_row
  FROM public.membership_plans
  WHERE id = v_code_row.plan_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '关联套餐不存在或已下架');
  END IF;

  SELECT membership_expires_at INTO v_current_expires
  FROM public.users
  WHERE auth_user_id = v_user_id;

  v_today_draw := date_trunc('day', v_now) 
                  + (v_draw_hour || ' hours')::INTERVAL 
                  + (v_draw_minute || ' minutes')::INTERVAL;

  IF v_current_expires IS NOT NULL AND v_current_expires > v_now THEN
    v_new_expires := v_current_expires + (v_plan_row.duration_days || ' days')::INTERVAL;
  ELSE
    IF v_now <= v_today_draw THEN
      v_new_expires := v_today_draw + ((v_plan_row.duration_days - 1) || ' days')::INTERVAL;
    ELSE
      v_new_expires := v_today_draw + (v_plan_row.duration_days || ' days')::INTERVAL;
    END IF;
  END IF;

  UPDATE public.redemption_codes
  SET status = 'used',
      used_by = v_user_id,
      used_at = v_now,
      updated_at = v_now
  WHERE id = v_code_row.id;

  INSERT INTO public.redemption_records (auth_user_id, code, plan_id, plan_name, duration_days, redeemed_at, previous_expires_at, new_expires_at)
  VALUES (v_user_id, p_code, v_plan_row.id, v_plan_row.name, v_plan_row.duration_days, v_now, v_current_expires, v_new_expires)
  RETURNING id INTO v_record_id;

  UPDATE public.users
  SET membership_expires_at = v_new_expires,
      updated_at = v_now
  WHERE auth_user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'plan_name', v_plan_row.name,
    'duration_days', v_plan_row.duration_days,
    'new_expires_at', v_new_expires,
    'previous_expires_at', v_current_expires
  );
END;
$$;

-- 5. 获取用户兑换记录的 RPC
CREATE OR REPLACE FUNCTION public.get_redemption_records()
RETURNS TABLE (
  id BIGINT,
  code TEXT,
  plan_id BIGINT,
  plan_name TEXT,
  duration_days INTEGER,
  redeemed_at TIMESTAMPTZ,
  previous_expires_at TIMESTAMPTZ,
  new_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.code, r.plan_id, r.plan_name, r.duration_days, r.redeemed_at, r.previous_expires_at, r.new_expires_at
  FROM public.redemption_records r
  WHERE r.auth_user_id = auth.uid()
  ORDER BY r.redeemed_at DESC;
END;
$$;
