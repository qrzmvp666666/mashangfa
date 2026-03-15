-- Creates a SECURITY DEFINER RPC to bypass RLS for platform_config upserts.
-- The function itself verifies admin identity before writing.
CREATE OR REPLACE FUNCTION public.save_tiandi_page_config(
  p_title TEXT,
  p_description TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  INSERT INTO public.platform_config (key, value, description, updated_at)
  VALUES
    ('tiandi_page_title', p_title, '推荐页全局标题', now()),
    ('tiandi_page_description', p_description, '推荐页全局描述', now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_tiandi_page_config(TEXT, TEXT) TO authenticated, anon;
