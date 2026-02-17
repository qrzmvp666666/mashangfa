-- 精选天地中特表
CREATE TABLE IF NOT EXISTS public.featured_tiandi_specials (
  id BIGSERIAL PRIMARY KEY,
  issue_no TEXT NOT NULL,
  win_rate NUMERIC(5,2),
  prediction_content TEXT,
  result_text TEXT,
  result_animal TEXT,
  result_number INTEGER,
  is_show BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS featured_tiandi_specials_issue_no_key
  ON public.featured_tiandi_specials (issue_no);
