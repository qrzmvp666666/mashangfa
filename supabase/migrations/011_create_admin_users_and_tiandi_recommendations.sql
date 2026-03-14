CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tiandi_recommendations (
  id BIGSERIAL PRIMARY KEY,
  issue_no TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  recommendation_content TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  updated_by BIGINT REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id
  ON public.admin_users(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_users_email
  ON public.admin_users(email);

CREATE INDEX IF NOT EXISTS idx_tiandi_recommendations_issue_date
  ON public.tiandi_recommendations(issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_tiandi_recommendations_visible_date
  ON public.tiandi_recommendations(is_visible, issue_date DESC);

INSERT INTO public.tiandi_recommendations (
  issue_no,
  issue_date,
  title,
  description,
  recommendation_content,
  is_visible,
  created_at,
  updated_at
)
SELECT
  f.issue_no,
  COALESCE(f.draw_date, (NOW() AT TIME ZONE 'Asia/Shanghai')::date),
  '精准天地中特',
  E'天肖：【兔马猴猪牛龙】\n地肖：【蛇羊鸡狗鼠虎】',
  f.prediction_content,
  COALESCE(f.is_show, true),
  COALESCE(f.created_at, NOW()),
  COALESCE(f.updated_at, NOW())
FROM public.featured_tiandi_specials f
WHERE f.issue_no IS NOT NULL
ON CONFLICT (issue_no) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_record_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_users_set_updated_at ON public.admin_users;
CREATE TRIGGER admin_users_set_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_record_updated_at();

DROP TRIGGER IF EXISTS tiandi_recommendations_set_updated_at ON public.tiandi_recommendations;
CREATE TRIGGER tiandi_recommendations_set_updated_at
  BEFORE UPDATE ON public.tiandi_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_record_updated_at();

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE auth_user_id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.link_admin_user()
RETURNS public.admin_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_email TEXT;
  matched_admin public.admin_users;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  current_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));

  IF current_email = '' THEN
    RAISE EXCEPTION 'ADMIN_EMAIL_REQUIRED';
  END IF;

  UPDATE public.admin_users
  SET auth_user_id = auth.uid(),
      last_login_at = NOW(),
      updated_at = NOW()
  WHERE auth_user_id IS NULL
    AND LOWER(email) = current_email
    AND is_active = true;

  UPDATE public.admin_users
  SET last_login_at = NOW(),
      updated_at = NOW()
  WHERE auth_user_id = auth.uid()
    AND is_active = true;

  SELECT *
  INTO matched_admin
  FROM public.admin_users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF matched_admin.id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACCESS_DENIED';
  END IF;

  RETURN matched_admin;
END;
$$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiandi_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_self" ON public.admin_users;
CREATE POLICY "admin_users_select_self"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = auth_user_id
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "tiandi_recommendations_public_read" ON public.tiandi_recommendations;
CREATE POLICY "tiandi_recommendations_public_read"
  ON public.tiandi_recommendations
  FOR SELECT
  TO anon, authenticated
  USING (
    is_visible = true
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "tiandi_recommendations_admin_insert" ON public.tiandi_recommendations;
CREATE POLICY "tiandi_recommendations_admin_insert"
  ON public.tiandi_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "tiandi_recommendations_admin_update" ON public.tiandi_recommendations;
CREATE POLICY "tiandi_recommendations_admin_update"
  ON public.tiandi_recommendations
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "tiandi_recommendations_admin_delete" ON public.tiandi_recommendations;
CREATE POLICY "tiandi_recommendations_admin_delete"
  ON public.tiandi_recommendations
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

GRANT SELECT ON public.admin_users TO authenticated;
GRANT SELECT ON public.tiandi_recommendations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tiandi_recommendations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.admin_users_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tiandi_recommendations_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_admin_user() TO authenticated;

DROP FUNCTION IF EXISTS public.get_tiandi_specials();
CREATE FUNCTION public.get_tiandi_specials()
RETURNS TABLE(
  id BIGINT,
  issue_no TEXT,
  draw_date DATE,
  title TEXT,
  description TEXT,
  prediction_content TEXT,
  is_correct BOOLEAN,
  is_current BOOLEAN,
  special_animal TEXT,
  special_num INTEGER,
  special_color TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH today AS (
    SELECT (NOW() AT TIME ZONE 'Asia/Shanghai')::date AS d
  )
  SELECT
    r.id,
    r.issue_no,
    r.issue_date AS draw_date,
    r.title,
    r.description,
    r.recommendation_content AS prediction_content,
    CASE
      WHEN l.special_animal IS NULL THEN NULL
      WHEN r.recommendation_content IS NULL OR BTRIM(r.recommendation_content) = '' THEN NULL
      ELSE POSITION(l.special_animal IN REGEXP_REPLACE(r.recommendation_content, '[【】\s]', '', 'g')) > 0
    END AS is_correct,
    (r.issue_date = today.d) AS is_current,
    l.special_animal,
    l.special_num,
    l.special_color
  FROM public.tiandi_recommendations r
  CROSS JOIN today
  LEFT JOIN public.lottery_results l ON l.issue_no = r.issue_no
  WHERE r.issue_date <= today.d
    AND r.is_visible = true
  ORDER BY r.issue_date DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_tiandi_specials() TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tiandi_recommendations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tiandi_recommendations;
  END IF;
END $$;