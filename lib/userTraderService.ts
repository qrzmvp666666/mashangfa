import { supabase } from './supabase';

/**
 * 获取用户的关注、订阅和交易账户统计
 * 优化：使用数据库函数，单次 RPC 调用获取所有统计数据
 * 性能提升：从 3 个 HTTP 请求减少为 1 个
 */
export async function getUserStats(userId: string) {
  try {
    // 使用数据库函数，一次调用获取所有统计
    const { data, error } = await supabase
      .rpc('get_user_stats', { p_user_id: userId });

    if (error) throw error;

    return {
      followCount: data?.followCount || 0,
      subscriptionCount: data?.subscriptionCount || 0,
      exchangeAccountCount: data?.exchangeAccountCount || 0,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      followCount: 0,
      subscriptionCount: 0,
      exchangeAccountCount: 0,
    };
  }
}

/**
 * 检查用户是否已关注某个交易员
 */
export async function isFollowing(userId: string, traderId: string) {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('user_id', userId)
      .eq('trader_id', traderId)
      .single();

    // PGRST116: 没有找到记录
    // 其他错误（如RLS策略拒绝）也返回false，不抛出异常
    if (error && error.code !== 'PGRST116') {
      console.error('检查关注状态失败:', error);
      return false;
    }
    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

/**
 * 检查用户是否已订阅某个交易员
 */
export async function isSubscribed(userId: string, traderId: string) {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('trader_id', traderId)
      .single();

    // PGRST116: 没有找到记录
    // 其他错误（如RLS策略拒绝）也返回false，不抛出异常
    if (error && error.code !== 'PGRST116') {
      console.error('检查订阅状态失败:', error);
      return false;
    }
    return !!data;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * 关注交易员
 * 使用 upsert 避免重复插入错误
 */
export async function followTrader(userId: string, traderId: string) {
  try {
    const { error } = await supabase
      .from('user_follows')
      .upsert(
        { user_id: userId, trader_id: traderId },
        { onConflict: 'user_id,trader_id', ignoreDuplicates: true }
      );

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error following trader:', error);
    return { success: false, message: '关注失败，请稍后重试' };
  }
}

/**
 * 取消关注交易员
 */
export async function unfollowTrader(userId: string, traderId: string) {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('user_id', userId)
      .eq('trader_id', traderId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error unfollowing trader:', error);
    return { success: false, message: '取消关注失败，请稍后重试' };
  }
}

/**
 * 订阅交易员
 * 使用 upsert 避免重复插入错误
 */
export async function subscribeTrader(userId: string, traderId: string) {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(
        { user_id: userId, trader_id: traderId },
        { onConflict: 'user_id,trader_id', ignoreDuplicates: true }
      );

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error subscribing trader:', error);
    return { success: false, message: '订阅失败，请稍后重试' };
  }
}

/**
 * 取消订阅交易员
 */
export async function unsubscribeTrader(userId: string, traderId: string) {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('trader_id', traderId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing trader:', error);
    return { success: false, message: '取消订阅失败，请稍后重试' };
  }
}

/**
 * 获取用户关注的交易员列表
 */
export async function getFollowedTraders(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        trader_id,
        followed_at,
        traders (*)
      `)
      .eq('user_id', userId)
      .order('followed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching followed traders:', error);
    return [];
  }
}

/**
 * 获取用户订阅的交易员列表
 */
export async function getSubscribedTraders(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        trader_id,
        subscribed_at,
        traders (*)
      `)
      .eq('user_id', userId)
      .order('subscribed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subscribed traders:', error);
    return [];
  }
}
