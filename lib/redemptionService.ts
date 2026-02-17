import { supabase } from './supabase';
import { RedemptionCode, RedemptionRecord, RedemptionCodeType } from '../types';

/**
 * 兑换码服务
 * 处理兑换码的验证和兑换逻辑
 */

/**
 * 验证兑换码
 * @param code 兑换码
 * @returns 兑换码信息
 */
export async function validateRedemptionCode(code: string): Promise<RedemptionCode> {
  try {
    const { data, error } = await supabase
      .from('redemption_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (error || !data) {
      throw new Error('兑换码不存在');
    }

    // 检查兑换码状态
    if (data.status === 'used') {
      throw new Error('兑换码已被使用');
    }

    if (data.status === 'expired') {
      throw new Error('兑换码已过期');
    }

    // 检查兑换码是否过期
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < now) {
      // 更新状态为过期
      await supabase
        .from('redemption_codes')
        .update({ status: 'expired' })
        .eq('id', data.id);
      
      throw new Error('兑换码已过期');
    }

    return data as RedemptionCode;
  } catch (error: any) {
    console.error('Validate redemption code error:', error);
    throw error;
  }
}

/**
 * 执行兑换
 * @param userId 用户ID
 * @param code 兑换码
 * @returns 兑换记录
 */
export async function redeemCode(userId: string, code: string): Promise<RedemptionRecord> {
  try {
    // 1. 验证兑换码
    const redemptionCode = await validateRedemptionCode(code);

    // 2. 检查用户是否已经使用过此兑换码
    const { data: existingRecord } = await supabase
      .from('redemption_records')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code.trim().toUpperCase())
      .single();

    if (existingRecord) {
      throw new Error('您已经使用过此兑换码');
    }

    // 3. 获取用户当前的VIP过期时间
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('vip_expires_at')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error('获取用户信息失败');
    }

    const currentExpiresAt = userData?.vip_expires_at ? new Date(userData.vip_expires_at) : null;
    const now = new Date();

    // 4. 计算新的过期时间
    // 如果当前VIP未过期，在当前过期时间基础上累加
    // 如果已过期或没有VIP，从现在开始计算
    let baseDate: Date;
    if (currentExpiresAt && currentExpiresAt > now) {
      baseDate = currentExpiresAt;
    } else {
      baseDate = now;
    }

    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + redemptionCode.duration_days);

    // 5. 开始数据库事务
    // 5a. 更新用户VIP过期时间
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ 
        vip_expires_at: newExpiresAt.toISOString(),
        vip_status: getVipTier(redemptionCode.type)
      })
      .eq('id', userId);

    if (updateUserError) {
      throw new Error('更新用户VIP状态失败');
    }

    // 5b. 标记兑换码为已使用
    const { error: updateCodeError } = await supabase
      .from('redemption_codes')
      .update({ 
        status: 'used',
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('id', redemptionCode.id);

    if (updateCodeError) {
      throw new Error('更新兑换码状态失败');
    }

    // 5c. 创建兑换记录
    const { data: record, error: recordError } = await supabase
      .from('redemption_records')
      .insert({
        user_id: userId,
        code: code.trim().toUpperCase(),
        code_type: redemptionCode.type,
        duration_days: redemptionCode.duration_days,
        previous_vip_expires_at: currentExpiresAt?.toISOString() || null,
        new_vip_expires_at: newExpiresAt.toISOString(),
        redeemed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (recordError || !record) {
      throw new Error('创建兑换记录失败');
    }

    return record as RedemptionRecord;
  } catch (error: any) {
    console.error('Redeem code error:', error);
    throw error;
  }
}

/**
 * 获取用户的兑换记录
 * @param userId 用户ID
 * @returns 兑换记录列表
 */
export async function getUserRedemptionRecords(userId: string): Promise<RedemptionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('redemption_records')
      .select('*')
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false });

    if (error) {
      throw new Error('获取兑换记录失败');
    }

    return (data || []) as RedemptionRecord[];
  } catch (error: any) {
    console.error('Get redemption records error:', error);
    throw error;
  }
}

/**
 * 根据兑换码类型获取VIP等级
 * @param type 兑换码类型
 * @returns VIP等级
 */
function getVipTier(type: RedemptionCodeType): string {
  const tierMap: Record<RedemptionCodeType, string> = {
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly'
  };
  return tierMap[type] || 'free';
}

/**
 * 获取兑换码类型的中文名称
 * @param type 兑换码类型
 * @returns 中文名称
 */
export function getRedemptionTypeName(type: RedemptionCodeType): string {
  const nameMap: Record<RedemptionCodeType, string> = {
    monthly: '月度会员',
    quarterly: '季度会员',
    yearly: '年度会员'
  };
  return nameMap[type] || '未知';
}

/**
 * 检查用户VIP状态
 * @param vipExpiresAt VIP过期时间
 * @returns VIP是否有效
 */
export function isVipActive(vipExpiresAt: string | null): boolean {
  if (!vipExpiresAt) return false;
  
  const expiresAt = new Date(vipExpiresAt);
  const now = new Date();
  
  return expiresAt > now;
}

/**
 * 格式化VIP过期时间
 * @param vipExpiresAt VIP过期时间
 * @returns 格式化后的字符串
 */
export function formatVipExpiresAt(vipExpiresAt: string | null): string {
  if (!vipExpiresAt) return '未开通';
  
  const expiresAt = new Date(vipExpiresAt);
  const now = new Date();
  
  if (expiresAt <= now) return '已过期';
  
  const year = expiresAt.getFullYear();
  const month = String(expiresAt.getMonth() + 1).padStart(2, '0');
  const day = String(expiresAt.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
