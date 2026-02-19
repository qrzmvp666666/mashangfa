-- 获取最新一期开奖结果
CREATE OR REPLACE FUNCTION public.get_latest_lottery_result()
RETURNS TABLE (
  id bigint,
  issue_no text,
  draw_date date,
  balls jsonb,
  special_num integer,
  special_animal text,
  special_color text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lr.id,
    lr.issue_no,
    lr.draw_date,
    lr.balls,
    lr.special_num,
    lr.special_animal,
    lr.special_color,
    lr.created_at,
    lr.updated_at
  FROM lottery_results lr
  ORDER BY lr.created_at DESC -- 或者按 issue_no 如果它是可靠的
  LIMIT 1;
END;
$$;
