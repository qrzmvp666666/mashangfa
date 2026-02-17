-- 1. 给 users 表增加会员过期时间字段
ALTER TABLE public.users
  ADD COLUMN membership_expires_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.users.membership_expires_at IS '一期会员购买过期时间，由触发器自动更新';

-- 2. 创建触发器函数：根据购买时间计算过期时间并更新 users 表
CREATE OR REPLACE FUNCTION public.update_membership_expires()
RETURNS TRIGGER AS $$
DECLARE
  v_purchase_time TIMESTAMPTZ;
  v_draw_hour INTEGER := 21;  -- 开奖小时（与 env EXPO_PUBLIC_DRAW_HOUR 保持一致）
  v_draw_minute INTEGER := 30; -- 开奖分钟（与 env EXPO_PUBLIC_DRAW_MINUTE 保持一致）
  v_purchase_day_draw TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 只处理 paid 状态的记录
  IF NEW.payment_status != 'paid' THEN
    RETURN NEW;
  END IF;

  -- 取购买时间（优先 completed_time，其次 payment_time）
  v_purchase_time := COALESCE(NEW.completed_time, NEW.payment_time);
  IF v_purchase_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- 计算购买当天的开奖时间
  v_purchase_day_draw := date_trunc('day', v_purchase_time) 
                         + (v_draw_hour || ' hours')::INTERVAL 
                         + (v_draw_minute || ' minutes')::INTERVAL;

  -- 判断过期时间
  IF v_purchase_time <= v_purchase_day_draw THEN
    v_expires_at := v_purchase_day_draw;
  ELSE
    v_expires_at := v_purchase_day_draw + INTERVAL '1 day';
  END IF;

  -- 更新 users 表（仅当新的过期时间比现有的更晚时才更新）
  UPDATE public.users
  SET membership_expires_at = GREATEST(COALESCE(membership_expires_at, '1970-01-01'::TIMESTAMPTZ), v_expires_at),
      updated_at = NOW()
  WHERE auth_user_id = NEW.auth_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 绑定触发器到 purchase_records 表
DROP TRIGGER IF EXISTS trg_update_membership_expires ON public.purchase_records;
CREATE TRIGGER trg_update_membership_expires
  AFTER INSERT OR UPDATE ON public.purchase_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_membership_expires();
