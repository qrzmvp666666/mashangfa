-- 为业务用户表补充手机号字段，并兼容现有“手机号映射邮箱”的认证方式

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 保证手机号唯一（允许为空）
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key
  ON public.users (phone)
  WHERE phone IS NOT NULL;

-- 从 auth.users 中提取手机号：优先读取元数据，其次回退解析 mashangfa.local 伪邮箱
CREATE OR REPLACE FUNCTION public.extract_phone_from_auth_user(
  p_email TEXT,
  p_raw_user_meta_data JSONB
)
RETURNS TEXT AS $$
DECLARE
  derived_phone TEXT;
BEGIN
  derived_phone := NULLIF(TRIM(COALESCE(p_raw_user_meta_data->>'phone', '')), '');

  IF derived_phone IS NOT NULL THEN
    RETURN derived_phone;
  END IF;

  IF p_email IS NULL OR p_email NOT LIKE '%@mashangfa.local' THEN
    RETURN NULL;
  END IF;

  RETURN REPLACE(REPLACE(SPLIT_PART(p_email, '@', 1), '%2B', '+'), '%2b', '+');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 更新新用户触发器逻辑，自动写入手机号
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, username, avatar_url, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    public.extract_phone_from_auth_user(NEW.email, NEW.raw_user_meta_data),
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET phone = COALESCE(public.users.phone, EXCLUDED.phone),
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 回填历史用户手机号
UPDATE public.users AS u
SET
  phone = public.extract_phone_from_auth_user(au.email, au.raw_user_meta_data),
  updated_at = NOW()
FROM auth.users AS au
WHERE au.id = u.auth_user_id
  AND u.phone IS NULL
  AND public.extract_phone_from_auth_user(au.email, au.raw_user_meta_data) IS NOT NULL;