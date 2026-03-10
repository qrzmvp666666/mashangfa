-- 统一业务表手机号格式为 11 位中国大陆手机号，不带 +86

CREATE OR REPLACE FUNCTION public.normalize_mainland_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned_phone TEXT;
BEGIN
  cleaned_phone := NULLIF(TRIM(COALESCE(p_phone, '')), '');

  IF cleaned_phone IS NULL THEN
    RETURN NULL;
  END IF;

  IF cleaned_phone ~ '^\+86(1[3-9]\d{9})$' THEN
    RETURN SUBSTRING(cleaned_phone FROM 4);
  END IF;

  IF cleaned_phone ~ '^1[3-9]\d{9}$' THEN
    RETURN cleaned_phone;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.extract_phone_from_auth_user(
  p_email TEXT,
  p_raw_user_meta_data JSONB
)
RETURNS TEXT AS $$
DECLARE
  derived_phone TEXT;
BEGIN
  derived_phone := public.normalize_mainland_phone(p_raw_user_meta_data->>'phone');

  IF derived_phone IS NOT NULL THEN
    RETURN derived_phone;
  END IF;

  IF p_email IS NULL OR p_email NOT LIKE '%@mashangfa.local' THEN
    RETURN NULL;
  END IF;

  RETURN public.normalize_mainland_phone(
    REPLACE(REPLACE(SPLIT_PART(p_email, '@', 1), '%2B', '+'), '%2b', '+')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
  SET phone = EXCLUDED.phone,
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE public.users AS u
SET
  phone = public.extract_phone_from_auth_user(au.email, au.raw_user_meta_data),
  updated_at = NOW()
FROM auth.users AS au
WHERE au.id = u.auth_user_id
  AND COALESCE(u.phone, '') IS DISTINCT FROM COALESCE(public.extract_phone_from_auth_user(au.email, au.raw_user_meta_data), '');