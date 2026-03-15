-- Enable realtime for platform_config so front-end can subscribe to title/description changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'platform_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_config;
  END IF;
END $$;
