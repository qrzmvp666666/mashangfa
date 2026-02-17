import { supabase } from './supabase';

// 从环境变量读取开奖时间
const DRAW_HOUR = parseInt(process.env.EXPO_PUBLIC_DRAW_HOUR || '21', 10);
const DRAW_MINUTE = parseInt(process.env.EXPO_PUBLIC_DRAW_MINUTE || '30', 10);

export interface MembershipStatus {
  isVip: boolean;
  label: string; // '一期会员' | '普通用户'
  lastPurchaseTime: string | null;
  expiresAt: Date | null; // 到期时间（当天开奖时间）
}

/**
 * 获取当天的开奖时间点
 * 例如今天 2026-02-17 21:30:00
 */
function getTodayDrawTime(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), DRAW_HOUR, DRAW_MINUTE, 0);
}

/**
 * 获取下一次开奖时间点
 * 如果当前时间还没到今天开奖时间 → 下一次是今天
 * 如果当前时间已过今天开奖时间 → 下一次是明天
 */
function getNextDrawTime(): Date {
  const now = new Date();
  const todayDraw = getTodayDrawTime();
  if (now < todayDraw) {
    return todayDraw;
  }
  // 明天的开奖时间
  const tomorrow = new Date(todayDraw);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * 判断会员是否有效（一期会员）
 * 
 * 逻辑：
 * - 获取用户最近一条 paid 状态的购买记录的 completed_time
 * - 获取当天开奖时间（DRAW_HOUR:DRAW_MINUTE）
 * - 购买时间 ≤ 当天开奖时间 → 会员有效（一期会员），到期时间为当天开奖时间
 * - 购买时间 > 当天开奖时间 → 会员过期（普通用户）
 * 
 * 示例（开奖时间 21:30）：
 * - 用户在 02/17 14:00 购买 → 14:00 ≤ 02/17 21:30 → 有效，到期 02/17 21:30
 * - 02/17 21:30 过后 → 下一次开奖变为 02/18 21:30 → 14:00 > 02/17 21:30（昨天的）→ 需重新比较
 *   此时 purchaseTime(02/17 14:00) 与 nextDrawTime(02/18 21:30) 比较 → ≤ → 依然有效？不对
 *   所以我们用"购买日期的当天开奖时间"来判断：
 *   购买时间 ≤ 购买当天的开奖时间 → 到期时间 = 购买当天的开奖时间
 *   购买时间 > 购买当天的开奖时间 → 到期时间 = 购买次日的开奖时间
 *   然后判断：当前时间 < 到期时间 → 有效，否则过期
 */
export async function checkMembershipStatus(authUserId: string): Promise<MembershipStatus> {
  const defaultStatus: MembershipStatus = {
    isVip: false,
    label: '普通用户',
    lastPurchaseTime: null,
    expiresAt: null,
  };

  if (!authUserId) return defaultStatus;

  try {
    // 获取最近一条已支付的购买记录
    const { data, error } = await supabase
      .from('purchase_records')
      .select('completed_time, payment_time')
      .eq('auth_user_id', authUserId)
      .eq('payment_status', 'paid')
      .order('completed_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return defaultStatus;
    }

    const purchaseTime = data.completed_time || data.payment_time;
    if (!purchaseTime) return defaultStatus;

    const purchaseDate = new Date(purchaseTime);

    // 计算购买当天的开奖时间
    const purchaseDayDrawTime = new Date(
      purchaseDate.getFullYear(),
      purchaseDate.getMonth(),
      purchaseDate.getDate(),
      DRAW_HOUR, DRAW_MINUTE, 0
    );

    let expiresAt: Date;
    if (purchaseDate.getTime() <= purchaseDayDrawTime.getTime()) {
      // 购买时间 ≤ 购买当天开奖时间 → 到期时间 = 购买当天开奖时间
      expiresAt = purchaseDayDrawTime;
    } else {
      // 购买时间 > 购买当天开奖时间 → 到期时间 = 次日开奖时间
      expiresAt = new Date(purchaseDayDrawTime);
      expiresAt.setDate(expiresAt.getDate() + 1);
    }

    const now = new Date();
    if (now < expiresAt) {
      // 还没到期 → 会员有效
      return {
        isVip: true,
        label: '一期会员',
        lastPurchaseTime: purchaseTime,
        expiresAt,
      };
    }

    // 已过期
    return defaultStatus;
  } catch (err) {
    console.error('Check membership status error:', err);
    return defaultStatus;
  }
}

/**
 * 订阅购买记录变动以实时更新会员状态
 */
export function subscribeToMembershipChanges(authUserId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`membership:${authUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'purchase_records',
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
