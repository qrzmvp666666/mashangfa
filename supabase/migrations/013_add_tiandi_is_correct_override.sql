ALTER TABLE public.tiandi_recommendations ADD COLUMN IF NOT EXISTS is_correct_override BOOLEAN DEFAULT NULL;

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
    COALESCE(
      r.is_correct_override,
      CASE
        WHEN l.special_animal IS NULL THEN NULL
        WHEN r.recommendation_content IS NULL OR BTRIM(r.recommendation_content) = '' THEN NULL
        ELSE POSITION(l.special_animal IN REGEXP_REPLACE(r.recommendation_content, '[【】\s]', '', 'g')) > 0
      END
    ) AS is_correct,
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
