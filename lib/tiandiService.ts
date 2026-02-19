import { supabase } from './supabase';

export interface BallData {
  num: string;
  animal: string;
  color: 'red' | 'blue' | 'green';
}

export interface TiandiSpecial {
  id: number;
  issue_no: string;
  draw_date: string;           // 对应日期，如 "2026-02-19"
  prediction_content: string | null;  // null 表示当天预测尚未发布
  is_correct: boolean | null;  // null=待开奖, true=命中, false=未中
  is_current: boolean;         // draw_date === 今天（北京时间）
  special_animal: string | null;
  special_num: number | null;
  special_color: string | null;
}

/**
 * 获取"精选天地中特"列表
 * 返回 draw_date <= 今天（北京时间）的记录，已 JOIN lottery_results 开奖结果
 * 无需做任何用户权限判断，数据直接展示
 */
export async function fetchTiandiSpecials(): Promise<TiandiSpecial[]> {
  try {
    const { data, error } = await supabase.rpc('get_tiandi_specials');
    if (error) {
      console.error('Error fetching tiandi specials:', error);
      return [];
    }
    return data as TiandiSpecial[];
  } catch (err) {
    console.error('Data fetch error:', err);
    return [];
  }
}

/**
 * 订阅“精选天地中特”变动
 * @param onUpdate 回调函数，每当数据变更时调用
 * @returns 取消订阅函数
 */
export function subscribeToTiandiSpecials(onUpdate: () => void) {
  const channel = supabase
    .channel('public:featured_tiandi_specials')
    .on(
      'postgres_changes',
      {
        event: '*', 
        schema: 'public', 
        table: 'featured_tiandi_specials'
      },
      (payload) => {
        console.log('Tiandi update received!', payload);
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export interface LotteryResult {
  id: number;
  issue_no: string;
  draw_date: string;
  balls: BallData[];
  special_num: number;
  special_animal: string;
  special_color: string;
  created_at: string;
  updated_at: string;
}

/**
 * 获取最新一期开奖结果（独立于预测记录）
 */
export async function fetchLatestLotteryResult(): Promise<LotteryResult | null> {
  try {
    const { data, error } = await supabase.rpc('get_latest_lottery_result');
    if (error) {
      console.error('Error fetching latest lottery result:', error);
      return null;
    }
    if (data && data.length > 0) {
      return data[0] as LotteryResult;
    }
    return null;
  } catch (err) {
    console.error('Fetch latest lottery result error:', err);
    return null;
  }
}

/**
 * 订阅开奖结果变动
 * @param onUpdate 更新回调
 * @param channelName 可选的自定义 channel 名称，避免多个订阅冲突
 */
export function subscribeToLotteryResults(onUpdate: () => void, channelName?: string) {
  const uniqueChannelName = channelName || `lottery_results_${Date.now()}_${Math.random()}`;
  console.log('[tiandiService] Setting up lottery_results subscription:', uniqueChannelName);
  const channel = supabase
    .channel(uniqueChannelName)
    .on(
      'postgres_changes',
      {
        event: '*', 
        schema: 'public', 
        table: 'lottery_results'
      },
      (payload) => {
        console.log('[tiandiService] ✅ Lottery result update received!', payload);
        onUpdate();
      }
    )
    .subscribe((status) => {
      console.log('[tiandiService] Lottery results subscription status:', status);
    });

  return () => {
    console.log('[tiandiService] Unsubscribing from lottery_results...');
    supabase.removeChannel(channel);
  };
}
