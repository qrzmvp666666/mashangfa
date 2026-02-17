import { supabase } from './supabase';

export interface PurchaseRecord {
  id: number;
  auth_user_id: string;
  order_no: string;
  product_name: string;
  amount: number;
  payment_method: 'alipay' | 'wechat';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_time: string | null;
  completed_time: string | null;
  remark: string | null;
  plan_id: number | null;
  plan_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * 获取当前用户的购买记录（通过 RPC）
 */
export async function fetchPurchaseRecords(authUserId: string): Promise<PurchaseRecord[]> {
  try {
    const { data, error } = await supabase.rpc('get_purchase_records', {
      p_auth_user_id: authUserId,
    });
    if (error) {
      console.error('Error fetching purchase records:', error);
      return [];
    }
    return data as PurchaseRecord[];
  } catch (err) {
    console.error('Purchase records fetch error:', err);
    return [];
  }
}

/**
 * 订阅购买记录变动
 */
export function subscribeToPurchaseRecords(authUserId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`purchase_records:${authUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'purchase_records',
        filter: `auth_user_id=eq.${authUserId}`,
      },
      (payload) => {
        console.log('Purchase record update received!', payload);
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 获取支付方式的显示名称
 */
export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'alipay':
      return '支付宝';
    case 'wechat':
      return '微信支付';
    default:
      return method;
  }
}

/**
 * 获取支付状态的显示名称和颜色
 */
export function getPaymentStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: '待支付', color: '#eab308' };
    case 'paid':
      return { label: '已支付', color: '#2ebd85' };
    case 'failed':
      return { label: '支付失败', color: '#f6465d' };
    case 'refunded':
      return { label: '已退款', color: '#f97316' };
    case 'cancelled':
      return { label: '已取消', color: '#9ca3af' };
    default:
      return { label: '未知', color: '#9ca3af' };
  }
}
