import { supabase } from './supabase';

export interface BallData {
  num: string;
  animal: string;
  color: 'red' | 'blue' | 'green';
}

export interface TiandiSpecial {
  id: number;
  issue_no: string;
  prediction_content: string | null;
  is_correct: boolean | null;
  result_balls: BallData[] | null;
  result_animal: string | null;
  result_number: number | null;
  is_current: boolean;
  display_content: string;
  display_result: string;
  visibility: 'locked' | 'visible' | 'login_required' | 'member_only';
  cta_type: 'login' | 'buy_or_redeem' | null;
  cta_text: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * 获取"精选天地中特"列表（含后端处理的展示逻辑）
 * 后端根据用户身份和时间返回 display_content / visibility 等字段
 * 前端只需直接展示，不再做权限/时间判断
 */
export async function fetchTiandiSpecials(): Promise<TiandiSpecial[]> {
  try {
    const { data, error } = await supabase.rpc('get_tiandi_with_visibility');
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
