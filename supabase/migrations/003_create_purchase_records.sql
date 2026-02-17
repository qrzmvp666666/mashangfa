-- 支付方式枚举
CREATE TYPE payment_method AS ENUM ('alipay', 'wechat');

-- 支付状态枚举
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');

-- 购买记录表
CREATE TABLE IF NOT EXISTS public.purchase_records (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  order_no TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_time TIMESTAMP WITH TIME ZONE,
  completed_time TIMESTAMP WITH TIME ZONE,
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_purchase_user FOREIGN KEY (auth_user_id) REFERENCES public.users(auth_user_id)
);

-- 唯一订单号索引
CREATE UNIQUE INDEX IF NOT EXISTS purchase_records_order_no_key ON public.purchase_records (order_no);

-- 用户查询索引
CREATE INDEX IF NOT EXISTS purchase_records_user_idx ON public.purchase_records (auth_user_id);

-- 启用 RLS
ALTER TABLE public.purchase_records ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的购买记录
CREATE POLICY "Users can view own purchases" ON public.purchase_records
  FOR SELECT USING (auth.uid() = auth_user_id);

-- 用户只能插入自己的购买记录
CREATE POLICY "Users can insert own purchases" ON public.purchase_records
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- 开启 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_records;
