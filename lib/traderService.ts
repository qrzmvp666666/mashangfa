import { supabase } from './supabase';

export interface Trader {
  id: string;
  name: string;
  avatar_url: string;
  description?: string;
  is_online_today?: boolean;
  is_online?: boolean;
  is_visible?: boolean; // 新增：是否展示
  signal_count?: number;
  followers_count?: number;
  win_rate?: number;
  // 新增统计字段
  total_roi?: number;
  avg_pnl_ratio?: number;
  profit_factor?: number;
  total_pnl?: number;
  trading_days?: number;
  subscription_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TraderWithStats extends Trader {
  total_signals?: number;
  active_signals?: number;
  closed_signals?: number;
  long_signals?: number;
  short_signals?: number;
  is_subscribed?: boolean;
  is_followed?: boolean;
}

export interface TraderDetail extends Trader {
  total_signals?: number;
  active_signals?: number;
  closed_signals?: number;
  cancelled_signals?: number;
  long_signals?: number;
  short_signals?: number;
  spot_signals?: number;
  futures_signals?: number;
  margin_signals?: number;
  is_subscribed?: boolean;
  is_followed?: boolean;
}

export interface TraderWithUserStatus extends Trader {
  isSubscribed?: boolean;
  isFollowed?: boolean;
}

/**
 * 获取交易员列表及统计数据（使用RPC函数）
 * @param userId 用户ID（可选）
 * @param limit 限制返回数量（默认10条，用于分页）
 * @param offset 偏移量（用于分页）
 * @param filters 筛选条件
 */
export async function getTradersWithStats(
  userId?: string,
  limit: number = 10,
  offset: number = 0,
  filters: {
    sortByRoi?: boolean;
    sortByWinRate?: boolean;
    filterSubscribed?: boolean;
    filterFollowed?: boolean;
  } = {}
): Promise<TraderWithStats[]> {
  try {
    const params = {
      p_user_id: userId || null,
      p_limit: limit,
      p_offset: offset,
      p_sort_by_roi: filters.sortByRoi ?? true, // 默认按 ROI 排序
      p_sort_by_win_rate: filters.sortByWinRate ?? false,
      p_filter_subscribed: filters.filterSubscribed ?? false,
      p_filter_followed: filters.filterFollowed ?? false
    };
    
    console.log('🔵 [TraderService] 调用 RPC: get_traders_with_stats', params);
    
    const { data, error } = await supabase.rpc('get_traders_with_stats', params);
    
    if (error) {
      console.error('❌ [TraderService] 获取交易员列表失败:', error);
      throw error;
    }

    console.log('✅ [TraderService] 成功获取', data?.length || 0, '条交易员数据（只显示is_visible=true）');
    return data || [];
  } catch (error) {
    console.error('❌ [TraderService] 获取交易员列表异常:', error);
    throw error;
  }
}

/**
 * 【优化 v2】一次性获取交易员列表及用户的订阅/关注状态
 * 性能提升：使用数据库函数，从 3 个请求减少为 1 个 RPC 调用
 * @param userId 用户ID（可选）
 * @param limit 限制返回数量（默认20，用于分页）
 */
export async function getTradersWithUserStatus(
  userId?: string,
  limit: number = 20
): Promise<TraderWithUserStatus[]> {
  try {
    console.log('🔵 [TraderService] 正在获取交易员列表（RPC函数），limit:', limit, 'userId:', userId);
    
    // 使用数据库 RPC 函数，一次性获取所有数据
    const { data, error } = await supabase.rpc('get_traders_with_user_status', {
      p_user_id: userId || null,
      p_limit: limit
    });
    
    if (error) {
      console.error('获取交易员列表失败:', error);
      throw error;
    }

    // 映射数据库字段（下划线命名）到前端字段（驼峰命名）
    const mappedData = (data || []).map((trader: any) => ({
      id: trader.id,
      name: trader.name,
      avatar_url: trader.avatar_url,
      description: trader.description,
      created_at: trader.created_at,
      updated_at: trader.updated_at,
      isSubscribed: trader.is_subscribed,  // 下划线 -> 驼峰
      isFollowed: trader.is_followed        // 下划线 -> 驼峰
    }));
    
    console.log('✅ [TraderService] 成功获取', mappedData?.length || 0, '条交易员数据');
    console.log('📊 [TraderService] 第一条数据状态:', {
      name: mappedData[0]?.name,
      isSubscribed: mappedData[0]?.isSubscribed,
      isFollowed: mappedData[0]?.isFollowed
    });

    return mappedData;
  } catch (error) {
    console.error('获取交易员列表及状态异常:', error);
    throw error;
  }
}

/**
 * 根据ID获取单个交易员信息
 */
export async function getTraderById(traderId: string): Promise<Trader | null> {
  try {
    const { data, error } = await supabase
      .from('traders')
      .select('*')
      .eq('id', traderId)
      .single();

    if (error) {
      console.error('获取交易员详情失败:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('获取交易员详情异常:', error);
    throw error;
  }
}

/**
 * 【优化 v2】获取单个交易员信息及用户的订阅/关注状态
 * 性能提升：使用数据库函数，从 3 个请求减少为 1 个 RPC 调用
 */
export async function getTraderByIdWithUserStatus(
  traderId: string, 
  userId?: string
): Promise<TraderWithUserStatus | null> {
  try {
    console.log('🔵 [TraderService] 正在获取交易员详情（RPC函数），traderId:', traderId, 'userId:', userId);
    
    // 使用数据库 RPC 函数，一次性获取所有数据
    const { data, error } = await supabase.rpc('get_trader_by_id_with_user_status', {
      p_trader_id: traderId,
      p_user_id: userId || null
    });

    if (error) {
      console.error('获取交易员详情失败:', error);
      throw error;
    }

    // RPC 返回数组，取第一个元素
    const rawTrader = data && data.length > 0 ? data[0] : null;
    
    if (!rawTrader) {
      console.log('⚠️ [TraderService] 未找到交易员详情');
      return null;
    }

    // 映射数据库字段（下划线命名）到前端字段（驼峰命名）
    const trader: TraderWithUserStatus = {
      id: rawTrader.id,
      name: rawTrader.name,
      avatar_url: rawTrader.avatar_url,
      description: rawTrader.description,
      created_at: rawTrader.created_at,
      updated_at: rawTrader.updated_at,
      isSubscribed: rawTrader.is_subscribed,  // 下划线 -> 驼峰
      isFollowed: rawTrader.is_followed        // 下划线 -> 驼峰
    };
    
    console.log('✅ [TraderService] 成功获取交易员详情:', trader.name);
    console.log('📊 [TraderService] 订阅/关注状态:', {
      isSubscribed: trader.isSubscribed,
      isFollowed: trader.isFollowed
    });

    return trader;
  } catch (error) {
    console.error('获取交易员详情及状态异常:', error);
    throw error;
  }
}

/**
 * 获取交易员详细信息（使用RPC函数）
 * @param traderId 交易员ID
 * @param userId 用户ID（可选，用于获取订阅/关注状态）
 * @returns 交易员详细信息，包含完整统计数据
 */
export async function getTraderDetail(
  traderId: string,
  userId?: string
): Promise<TraderDetail | null> {
  try {
    console.log('🔵 [TraderService] 获取交易员详情 (RPC + Table)', { traderId, userId });
    
    // 1. 调用 RPC 获取动态统计数据 (如订阅状态、活跃信号数等)
    const rpcPromise = supabase.rpc('get_trader_detail', {
      p_trader_id: traderId,
      p_user_id: userId || null
    });

    // 2. 直接查询表获取最新的静态字段 (防止 RPC 未更新导致缺少 total_roi 等新字段)
    const tablePromise = supabase
      .from('traders')
      .select('*')
      .eq('id', traderId)
      .single();

    const [rpcResult, tableResult] = await Promise.all([rpcPromise, tablePromise]);
    
    if (rpcResult.error) {
      console.error('❌ [TraderService] RPC 获取失败:', rpcResult.error);
    }
    if (tableResult.error) {
      console.error('❌ [TraderService] Table 获取失败:', tableResult.error);
    }

    const rpcData = rpcResult.data && rpcResult.data.length > 0 ? rpcResult.data[0] : {};
    const tableData = tableResult.data || {};

    // 合并数据：Table 数据优先覆盖 (因为它是最新的 Schema), 但保留 RPC 特有的字段
    const mergedData = {
      ...rpcData,
      ...tableData,
      // 确保保留 RPC 计算出的特定字段，如果 tableData 里没有
      is_subscribed: rpcData.is_subscribed,
      is_followed: rpcData.is_followed,
      // 某些统计字段如果 tableData 是 null (默认值), 可以考虑用 RPC 的
      total_signals: tableData.total_signals ?? rpcData.total_signals,
      long_signals: tableData.long_signals ?? rpcData.long_signals,
      short_signals: tableData.short_signals ?? rpcData.short_signals,
    };

    console.log('✅ [TraderService] 成功合并交易员详情');
    return mergedData as TraderDetail;
  } catch (error) {
    console.error('❌ [TraderService] 获取交易员详情异常:', error);
    throw error;
  }
}

/**
 * 获取交易员的信号列表（使用RPC函数）
 * @param traderId 交易员ID
 * @param status 信号状态（可选）
 * @param limit 限制返回数量
 * @param offset 偏移量
 */
export async function getTraderSignals(
  traderId: string,
  status?: string,
  limit: number = 20,
  offset: number = 0
) {
  try {
    console.log('🔵 [TraderService] 调用 RPC: get_trader_signals', { traderId, status, limit, offset });
    
    const { data, error } = await supabase.rpc('get_trader_signals', {
      p_trader_id: traderId,
      p_status: status || null,
      p_limit: limit,
      p_offset: offset
    });
    
    if (error) {
      console.error('❌ [TraderService] 获取交易员信号失败:', error);
      throw error;
    }

    console.log('✅ [TraderService] 成功获取', data?.length || 0, '条信号数据');
    return data || [];
  } catch (error) {
    console.error('❌ [TraderService] 获取交易员信号异常:', error);
    throw error;
  }
}

/**
 * 获取交易员 ROI 趋势数据（按天统计累计收益率）
 * @param traderId 交易员ID
 * @param days 天数（7, 30, 90）
 * @returns 每天的累计 ROI
 */
export async function getTraderRoiTrend(
  traderId: string,
  days: number = 7
): Promise<Array<{ date: string; roi: number }>> {
  try {
    console.log('🔵 [TraderService] 调用 RPC: get_trader_roi_trend', { traderId, days });
    
    const { data, error } = await supabase.rpc('get_trader_roi_trend', {
      p_trader_id: traderId,
      p_days: days
    });
    
    if (error) {
      console.error('❌ [TraderService] 获取 ROI 趋势失败:', error);
      throw error;
    }

    console.log('✅ [TraderService] 成功获取', data?.length || 0, '天的 ROI 趋势数据');
    return data || [];
  } catch (error) {
    console.error('❌ [TraderService] 获取 ROI 趋势异常:', error);
    throw error;
  }
}

/** * 获取交易员信号趋势数据（按天统计）
 * @param traderId 交易员ID
 * @param days 天数（7, 30, 90）
 * @returns 每天的信号数量统计
 */
export async function getTraderSignalTrend(
  traderId: string,
  days: number = 7
): Promise<Array<{ date: string; signal_count: number }>> {
  try {
    console.log('🔵 [TraderService] 调用 RPC: get_trader_signal_trend', { traderId, days });
    
    const { data, error } = await supabase.rpc('get_trader_signal_trend', {
      p_trader_id: traderId,
      p_days: days
    });
    
    if (error) {
      console.error('❌ [TraderService] 获取信号趋势失败:', error);
      throw error;
    }

    console.log('✅ [TraderService] 成功获取', data?.length || 0, '天的信号趋势数据');
    return data || [];
  } catch (error) {
    console.error('❌ [TraderService] 获取信号趋势异常:', error);
    throw error;
  }
}

/**
 * 批量获取多个交易员的信号趋势数据（性能优化版本）
 * @param traderIds 交易员ID数组
 * @param days 天数（7, 30, 90）
 * @returns Map<traderId, 每天的信号数量统计>
 */
export async function getMultipleTradersSignalTrend(
  traderIds: string[],
  days: number = 7
): Promise<Map<string, Array<{ date: string; signal_count: number }>>> {
  try {
    if (traderIds.length === 0) {
      return new Map();
    }

    console.log('🔵 [TraderService] 批量调用 RPC: get_multiple_traders_signal_trend', { 
      count: traderIds.length, 
      days 
    });
    
    const { data, error } = await supabase.rpc('get_multiple_traders_signal_trend', {
      p_trader_ids: traderIds,
      p_days: days
    });
    
    if (error) {
      console.error('❌ [TraderService] 批量获取信号趋势失败:', error);
      throw error;
    }

    // 将数据按 trader_id 分组
    const trendMap = new Map<string, Array<{ date: string; signal_count: number }>>();
    
    if (data) {
      data.forEach((row: { trader_id: string; date: string; signal_count: number }) => {
        if (!trendMap.has(row.trader_id)) {
          trendMap.set(row.trader_id, []);
        }
        trendMap.get(row.trader_id)!.push({
          date: row.date,
          signal_count: row.signal_count
        });
      });
    }

    console.log('✅ [TraderService] 成功获取', trendMap.size, '个交易员的趋势数据');
    return trendMap;
  } catch (error) {
    console.error('❌ [TraderService] 批量获取信号趋势异常:', error);
    throw error;
  }
}

/**
 * 批量获取多个交易员的 ROI 趋势数据（累计收益率）
 * @param traderIds 交易员ID数组
 * @param days 天数（7, 30, 90）
 * @returns Map<traderId, 每天的累计 ROI>
 */
export async function getMultipleTradersRoiTrend(
  traderIds: string[],
  days: number = 7
): Promise<Map<string, Array<{ date: string; roi: number }>>> {
  try {
    if (traderIds.length === 0) {
      return new Map();
    }

    console.log('🔵 [TraderService] 批量调用 RPC: get_multiple_traders_roi_trend', { 
      count: traderIds.length, 
      days 
    });
    
    // 注意：supabase-js 在处理 text[] 参数时有时需要直接传数组，无需特殊格式
    const { data, error } = await supabase.rpc('get_multiple_traders_roi_trend', {
      p_trader_ids: traderIds,
      p_days: days
    });
    
    if (error) {
      console.error('❌ [TraderService] 批量获取 ROI 趋势失败:', error);
      throw error;
    }

    // 将数据按 trader_id 分组
    const trendMap = new Map<string, Array<{ date: string; roi: number }>>();
    
    if (data) {
      data.forEach((row: { trader_id: string; date: string; roi: number }) => {
        if (!trendMap.has(row.trader_id)) {
          trendMap.set(row.trader_id, []);
        }
        trendMap.get(row.trader_id)!.push({
          date: row.date,
          roi: Number(row.roi) // 确保是数字
        });
      });
    }

    console.log('✅ [TraderService] 成功获取', trendMap.size, '个交易员的 ROI 趋势数据');
    return trendMap;
  } catch (error) {
    console.error('❌ [TraderService] 批量获取 ROI 趋势异常:', error);
    throw error;
  }
}

/**
 * 【优化版】搜索交易员（支持模糊搜索名称和描述，只返回 is_visible=true 的数据）
 * 性能提升：使用数据库 RPC 函数，从 3-4 个查询优化为 1 个 RPC 调用
 * @param query 搜索关键词
 * @param userId 用户ID（可选，用于获取订阅/关注状态）
 * @param limit 限制返回数量（默认10条，用于分页）
 * @param offset 偏移量（用于分页）
 */
export async function searchTraders(
  query: string,
  userId?: string,
  limit: number = 10,
  offset: number = 0
): Promise<TraderWithStats[]> {
  try {
    if (!query || query.trim() === '') {
      console.log('🔍 [TraderService] 搜索关键词为空');
      return [];
    }

    const trimmedQuery = query.trim();
    console.log('🔍 [TraderService] 搜索交易员 (RPC):', trimmedQuery, 'userId:', userId, 'limit:', limit, 'offset:', offset);

    // 使用优化的数据库 RPC 函数，支持分页和 is_visible 筛选
    const { data, error } = await supabase.rpc('search_traders_with_stats', {
      p_query: trimmedQuery,
      p_user_id: userId || null,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('❌ [TraderService] 搜索交易员失败:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('🔍 [TraderService] 未找到匹配的交易员');
      return [];
    }

    console.log('✅ [TraderService] 搜索完成，返回', data.length, '条结果（只显示 is_visible=true）');
    return data || [];
  } catch (error) {
    console.error('❌ [TraderService] 搜索交易员异常:', error);
    throw error;
  }
}

/**
 * 获取排行榜前5名交易员
 * 按信号总数排序，相同则按创建时间排序
 */
export interface LeaderboardTrader {
  id: string;
  name: string;
  avatar_url: string;
  signal_count: number;
  total_roi?: number;
  created_at: string;
  is_subscribed?: boolean;
  is_followed?: boolean;
}

export async function getLeaderboard(
  userId?: string, 
  limit: number = 5  // 明确设置默认为5,获取前5名排行榜
): Promise<LeaderboardTrader[]> {
  try {
    console.log('🔵 [TraderService] 调用 RPC: get_leaderboard, userId:', userId, 'limit:', limit);
    
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_user_id: userId || null,
      p_limit: limit,
      p_offset: 0
    });

    if (error) {
      console.error('❌ [TraderService] 获取排行榜失败:', error);
      throw error;
    }

    console.log('✅ [TraderService] 获取排行榜成功，返回', data?.length || 0, '条数据');
    return data || [];
  } catch (error) {
    console.error('❌ [TraderService] 获取排行榜异常:', error);
    throw error;
  }
}

/**
 * 获取前5名交易员的收益趋势数据
 * 用于首页收益走势图表
 * @param days 天数（7或30）
 * @returns 交易员及其趋势数据
 */
export interface TopTraderTrend {
  trader_id: string;
  trader_name: string;
  avatar_url: string;
  total_roi: number;
  trend_date: string;
  trend_roi: number | null;
  trend_rank: number;
}

export interface TraderTrendData {
  traderId: string;
  name: string;
  avatarUrl: string;
  totalRoi: number;
  rank: number;
  data: Array<{ date: string; roi: number }>;
}

export async function getTopTradersForTrend(days: number = 7): Promise<TopTraderTrend[]> {
  try {
    console.log('🔵 [TraderService] 调用 RPC: get_top_traders_for_trend, days:', days);

    const { data, error } = await supabase.rpc('get_top_traders_for_trend', {
      p_days: days
    });

    if (error) {
      console.error('❌ [TraderService] 获取前5名交易员趋势失败:', error);
      throw error;
    }

    console.log('✅ [TraderService] 成功获取前5名交易员趋势数据');
    return data || [];
  } catch (error) {
    console.error('❌ [TraderService] 获取前5名交易员趋势异常:', error);
    throw error;
  }
}

/**
 * 将 getTopTradersForTrend 返回的数据转换为图表可用的格式
 */
export async function getTopTradersTrendData(days: number = 7): Promise<TraderTrendData[]> {
  try {
    const rawData = await getTopTradersForTrend(days);

    // 按 trader_id 分组并转换格式
    const traderMap = new Map<string, TraderTrendData>();

    rawData.forEach((row) => {
      if (!traderMap.has(row.trader_id)) {
        traderMap.set(row.trader_id, {
          traderId: row.trader_id,
          name: row.trader_name,
          avatarUrl: row.avatar_url,
          totalRoi: row.total_roi,
          rank: row.trend_rank,
          data: []
        });
      }

      const trader = traderMap.get(row.trader_id)!;

      // 添加趋势数据点
      if (row.trend_roi !== null) {
        trader.data.push({
          date: row.trend_date,
          roi: row.trend_roi
        });
      }
    });

    // 转换为数组并按 rank 排序
    const result = Array.from(traderMap.values()).sort((a, b) => a.rank - b.rank);

    console.log('✅ [TraderService] 成功转换', result.length, '个交易员的趋势数据');
    return result;
  } catch (error) {
    console.error('❌ [TraderService] 转换趋势数据异常:', error);
    throw error;
  }
}
