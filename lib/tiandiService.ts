import { supabase } from './supabase';

export interface TiandiSpecial {
  id: number;
  issue_no: string;
  prediction_content: string | null;
  result_text: string | null;
  is_show: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * 获取“精选天地中特”列表
 * 使用 RPC 函数获取排序后的数据
 */
export async function fetchTiandiSpecials(): Promise<TiandiSpecial[]> {
  try {
    const { data, error } = await supabase.rpc('get_featured_tiandi_specials');
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
