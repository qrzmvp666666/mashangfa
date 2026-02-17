import { supabase } from './supabase';

export interface MembershipStatus {
  isVip: boolean;
  label: string; // '一期会员' | '普通用户'
  expiresAt: Date | null; // 到期时间（数据库存储）
}

/**
 * 判断会员是否有效（一期会员）
 * 
 * 直接读取 users.membership_expires_at 字段
 * 该字段由数据库触发器在购买记录 INSERT/UPDATE 时自动计算：
 * - 购买时间 ≤ 当天开奖时间 → membership_expires_at = 当天开奖时间
 * - 购买时间 > 当天开奖时间 → membership_expires_at = 次日开奖时间
 * - 当前时间 < membership_expires_at → 有效
 * - 当前时间 ≥ membership_expires_at → 过期
 */
export async function checkMembershipStatus(authUserId: string): Promise<MembershipStatus> {
  const defaultStatus: MembershipStatus = {
    isVip: false,
    label: '普通用户',
    expiresAt: null,
  };

  if (!authUserId) return defaultStatus;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('membership_expires_at')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !data || !data.membership_expires_at) {
      return defaultStatus;
    }

    const expiresAt = new Date(data.membership_expires_at);
    const now = new Date();

    if (now < expiresAt) {
      return {
        isVip: true,
        label: '一期会员',
        expiresAt,
      };
    }

    return defaultStatus;
  } catch (err) {
    console.error('Check membership status error:', err);
    return defaultStatus;
  }
}

/**
 * 订阅会员状态变动
 * 监听 users 表 membership_expires_at 字段更新（由触发器自动维护）
 */
export function subscribeToMembershipChanges(authUserId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`membership:${authUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `auth_user_id=eq.${authUserId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
