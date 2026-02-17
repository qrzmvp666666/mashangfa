import { supabase } from './supabase';

export interface Signal {
  id: string;
  trader_id: string;
  currency: string;
  direction: 'long' | 'short';
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  leverage: string;
  status: 'active' | 'closed' | 'cancelled' | 'closed_profit' | 'closed_loss';
  signal_type: 'spot' | 'futures' | 'margin';
  signal_time: string;
  created_at: string;
  updated_at?: string;
  roi?: number;
  closed_at?: string;
  realized_pnl?: number;
  exit_price?: number;
  exit_reason?: 'tp' | 'sl' | 'manual';
  duration?: number; // 信号持续时长（小时）
  // 关联的交易员信息
  trader?: {
    id: string;
    name: string;
    description?: string;
    avatar_url: string;
    signal_count?: number;
    is_online?: boolean;
    is_online_today?: boolean;
    followers_count?: number;
    win_rate?: number;
  };
}

export interface SignalWithTrader extends Signal {
  trader_name: string;
  trader_description?: string;
  trader_avatar_url: string;
  trader_signal_count?: number;
  trader_is_online?: boolean;
  trader_is_online_today?: boolean;
  trader_followers_count?: number;
  trader_win_rate?: number;
}

export class SignalService {
  /**
   * 获取信号列表（使用RPC函数）
   * @param status 信号状态
   * @param direction 交易方向
   * @param signalType 信号类型
   * @param limit 限制返回数量
   * @param offset 偏移量
   * @param userId 用户ID（用于已关注筛选）
   * @param filterFollowed 是否只显示已关注的交易员的信号
   */
  static async getSignalsWithTraders(
    status: 'active' | 'closed' | 'cancelled' = 'active',
    direction?: 'long' | 'short',
    signalType?: 'spot' | 'futures' | 'margin',
    limit: number = 20,
    offset: number = 0,
    userId?: string,
    filterFollowed: boolean = false
  ): Promise<SignalWithTrader[]> {
    try {
      console.log('🔵 [SignalService] 调用 RPC: get_signals_with_traders', { 
        status, direction, signalType, limit, offset, userId, filterFollowed
      });
      
      const { data, error } = await supabase.rpc('get_signals_with_traders', {
        p_status: status,
        p_direction: direction || null,
        p_signal_type: signalType || null,
        p_limit: limit,
        p_offset: offset,
        p_user_id: userId || null,
        p_filter_followed: filterFollowed
      });

      if (error) {
        console.error('❌ [SignalService] 获取信号失败:', error);
        throw error;
      }

      console.log('✅ [SignalService] 成功获取', data?.length || 0, '条信号数据');
      return data || [];
    } catch (error) {
      console.error('❌ [SignalService] 获取信号异常:', error);
      return [];
    }
  }

  /**
   * 获取所有活跃的信号列表（使用新RPC）
   */
  static async getActiveSignals(limit: number = 20): Promise<SignalWithTrader[]> {
    return this.getSignalsWithTraders('active', undefined, undefined, limit, 0);
  }

  /**
   * 根据方向筛选信号（使用新RPC）
   */
  static async getSignalsByDirection(
    direction: 'long' | 'short',
    limit: number = 20
  ): Promise<SignalWithTrader[]> {
    return this.getSignalsWithTraders('active', direction, undefined, limit, 0);
  }

  /**
   * 根据信号类型筛选（使用新RPC）
   */
  static async getSignalsByType(
    signalType: 'spot' | 'futures' | 'margin',
    limit: number = 20
  ): Promise<SignalWithTrader[]> {
    return this.getSignalsWithTraders('active', undefined, signalType, limit, 0);
  }

  /**
   * 根据币种筛选信号
   */
  static async getSignalsByCurrency(
    currency: string,
    limit: number = 20
  ): Promise<Signal[]> {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select(`
          *,
          trader:traders (
            id,
            name,
            description,
            avatar_url,
            signal_count,
            is_online
          )
        `)
        .eq('status', 'active')
        .eq('currency', currency)
        .order('signal_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取信号失败:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('获取信号异常:', error);
      return [];
    }
  }

  /**
   * 获取特定交易员的信号
   */
  static async getSignalsByTrader(
    traderId: string,
    limit: number = 20
  ): Promise<Signal[]> {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select(`
          *,
          trader:traders (
            id,
            name,
            description,
            avatar_url,
            signal_count,
            is_online
          )
        `)
        .eq('trader_id', traderId)
        .order('signal_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取信号失败:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('获取信号异常:', error);
      return [];
    }
  }

  /**
   * 根据筛选条件获取信号
   */
  static async getSignalsWithFilters(filters: {
    direction?: 'long' | 'short';
    currency?: string;
    status?: string;
    limit?: number;
  }): Promise<Signal[]> {
    try {
      let query = supabase
        .from('signals')
        .select(`
          *,
          trader:traders (
            id,
            name,
            description,
            avatar_url,
            signal_count,
            is_online
          )
        `);

      // 应用筛选条件
      if (filters.direction) {
        query = query.eq('direction', filters.direction);
      }
      if (filters.currency) {
        query = query.eq('currency', filters.currency);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        // 默认只显示活跃信号
        query = query.eq('status', 'active');
      }

      const { data, error } = await query
        .order('signal_time', { ascending: false })
        .limit(filters.limit || 20);

      if (error) {
        console.error('获取信号失败:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('获取信号异常:', error);
      return [];
    }
  }

  /**
   * 格式化信号时间显示
   */
  static formatSignalTime(signalTime: string): string {
    const date = new Date(signalTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}
