import { supabase } from './supabase';

/**
 * 兑换码服务
 * 使用原子 RPC 函数处理兑换逻辑，保证事务一致性
 */

// 兑换结果类型
export interface RedeemResult {
  success: boolean;
  error?: string;
  record_id?: number;
  plan_name?: string;
  duration_days?: number;
  new_expires_at?: string;
  previous_expires_at?: string;
}

// 兑换记录类型
export interface RedemptionRecord {
  id: number;
  code: string;
  plan_id: number;
  plan_name: string;
  duration_days: number;
  redeemed_at: string;
  previous_expires_at: string | null;
  new_expires_at: string;
}

/**
 * 原子兑换码兑换
 * 调用数据库 RPC，在单个事务中完成：验证 → 锁定 → 核销 → 更新会员
 */
export async function redeemCode(code: string): Promise<RedeemResult> {
  try {
    const { data, error } = await supabase.rpc('redeem_code_atomic', {
      p_code: code.trim().toUpperCase(),
    });

    if (error) {
      console.error('Redeem RPC error:', error);
      return { success: false, error: '兑换失败，请稍后重试' };
    }

    const result = data as RedeemResult;
    return result;
  } catch (err: any) {
    console.error('Redeem code error:', err);
    return { success: false, error: '网络异常，请稍后重试' };
  }
}

/**
 * 获取当前用户的兑换记录
 */
export async function getUserRedemptionRecords(): Promise<RedemptionRecord[]> {
  try {
    const { data, error } = await supabase.rpc('get_redemption_records');

    if (error) {
      console.error('Get redemption records error:', error);
      return [];
    }

    return (data || []) as RedemptionRecord[];
  } catch (err: any) {
    console.error('Get redemption records error:', err);
    return [];
  }
}

/**
 * 格式化过期时间显示
 */
export function formatExpiresAt(dateStr: string | null): string {
  if (!dateStr) return '未开通';
  const d = new Date(dateStr);
  const now = new Date();
  if (d <= now) return '已过期';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 检查用户VIP状态
 */
export function isVipActive(vipExpiresAt: string | null): boolean {
  if (!vipExpiresAt) return false;
  return new Date(vipExpiresAt) > new Date();
}

/**
 * 格式化VIP过期时间
 */
export function formatVipExpiresAt(vipExpiresAt: string | null): string {
  if (!vipExpiresAt) return '未开通';
  const expiresAt = new Date(vipExpiresAt);
  if (expiresAt <= new Date()) return '已过期';
  const year = expiresAt.getFullYear();
  const month = String(expiresAt.getMonth() + 1).padStart(2, '0');
  const day = String(expiresAt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
