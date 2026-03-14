ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_config (key, value, description, updated_at)
VALUES
  ('tiandi_page_title', '精准天地中特', '推荐页全局标题', NOW()),
  ('tiandi_page_description', E'天肖：【兔马猴猪牛龙】\n地肖：【蛇羊鸡狗鼠虎】', '推荐页全局描述', NOW())
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Admins can insert platform_config" ON public.platform_config;
CREATE POLICY "Admins can insert platform_config"
  ON public.platform_config
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update platform_config" ON public.platform_config;
CREATE POLICY "Admins can update platform_config"
  ON public.platform_config
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

GRANT INSERT, UPDATE ON public.platform_config TO authenticated;