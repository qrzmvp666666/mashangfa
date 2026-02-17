import { supabase } from './supabase';
import {
  ExchangeAccount,
  Exchange,
  CreateExchangeAccountInput,
  UpdateExchangeAccountInput,
} from '../types';

/**
 * 交易所服务
 */
export class ExchangeService {
  /**
   * 获取所有交易所列表
   */
  static async getExchanges(): Promise<Exchange[]> {
    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('获取交易所列表失败:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * 根据ID获取交易所
   */
  static async getExchangeById(id: string): Promise<Exchange | null> {
    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('获取交易所失败:', error);
      throw error;
    }

    return data;
  }

  /**
   * 根据名称获取交易所
   */
  static async getExchangeByName(name: string): Promise<Exchange | null> {
    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .ilike('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('获取交易所失败:', error);
      throw error;
    }

    return data;
  }
}

/**
 * 交易所账户服务
 */
export class ExchangeAccountService {
  /**
   * 获取当前用户的所有交易所账户
   */
  static async getExchangeAccounts(): Promise<ExchangeAccount[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('exchange_accounts')
      .select(`
        *,
        exchanges (
          id,
          name,
          display_name,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取交易所账户失败:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * 获取当前用户的已启用交易所账户
   */
  static async getEnabledExchangeAccounts(): Promise<ExchangeAccount[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('exchange_accounts')
      .select(`
        *,
        exchanges (
          id,
          name,
          display_name,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取已启用交易所账户失败:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * 根据ID获取交易所账户
   */
  static async getExchangeAccountById(id: string): Promise<ExchangeAccount | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('exchange_accounts')
      .select(`
        *,
        exchanges (
          id,
          name,
          display_name,
          logo_url
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('获取交易所账户失败:', error);
      throw error;
    }

    return data;
  }

  /**
   * 创建交易所账户
   */
  static async createExchangeAccount(
    input: CreateExchangeAccountInput
  ): Promise<ExchangeAccount> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 验证必填字段
    if (!input.exchange_id || !input.api_key || !input.secret_key) {
      throw new Error('请填写完整的交易所信息和API配置');
    }

    const { data, error } = await supabase
      .from('exchange_accounts')
      .insert({
        user_id: user.id,
        exchange_id: input.exchange_id,
        account_type: input.account_type,
        account_mode: input.account_mode,
        api_key: input.api_key,
        secret_key: input.secret_key,
        passphrase: input.passphrase,
        account_nickname: input.account_nickname,
        is_enabled: input.is_enabled ?? true,
      })
      .select(`
        *,
        exchanges (
          id,
          name,
          display_name,
          logo_url
        )
      `)
      .single();

    if (error) {
      console.error('创建交易所账户失败:', error);
      if (error.code === '23505') {
        throw new Error('该交易所账户名称已存在');
      }
      throw error;
    }

    return data;
  }

  /**
   * 更新交易所账户
   */
  static async updateExchangeAccount(
    id: string,
    input: UpdateExchangeAccountInput
  ): Promise<ExchangeAccount> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('exchange_accounts')
      .update({
        ...input,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        exchanges (
          id,
          name,
          display_name,
          logo_url
        )
      `)
      .single();

    if (error) {
      console.error('更新交易所账户失败:', error);
      if (error.code === '23505') {
        throw new Error('该交易所账户名称已存在');
      }
      throw error;
    }

    return data;
  }

  /**
   * 删除交易所账户
   */
  static async deleteExchangeAccount(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { error } = await supabase
      .from('exchange_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('删除交易所账户失败:', error);
      throw error;
    }
  }

  /**
   * 启用/禁用交易所账户
   */
  static async toggleExchangeAccount(id: string, isEnabled: boolean): Promise<ExchangeAccount> {
    return this.updateExchangeAccount(id, { is_enabled: isEnabled });
  }

  /**
   * 更新账户状态
   */
  static async updateAccountStatus(
    id: string,
    status: 'normal' | 'expired' | 'suspended'
  ): Promise<ExchangeAccount> {
    return this.updateExchangeAccount(id, { status });
  }

  /**
   * 获取启用的交易所账户数量
   */
  static async getEnabledAccountsCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { count, error } = await supabase
      .from('exchange_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_enabled', true);

    if (error) {
      console.error('获取账户数量失败:', error);
      throw error;
    }

    return count || 0;
  }

  /**
   * 获取账户统计信息
   */
  static async getAccountStats(): Promise<{
    total: number;
    enabled: number;
    normal: number;
    expired: number;
    suspended: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('exchange_accounts')
      .select('is_enabled, status')
      .eq('user_id', user.id);

    if (error) {
      console.error('获取账户统计失败:', error);
      throw error;
    }

    const accounts = data || [];
    return {
      total: accounts.length,
      enabled: accounts.filter(a => a.is_enabled).length,
      normal: accounts.filter(a => a.status === 'normal').length,
      expired: accounts.filter(a => a.status === 'expired').length,
      suspended: accounts.filter(a => a.status === 'suspended').length,
    };
  }
}
