// 标签类型定义
export type TabType = 'home' | 'trade' | 'my';

// 资产信息类型
export interface AssetInfo {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
}

// 用户信息类型
export interface UserInfo {
  username: string;
  accountId: string;
  avatar?: string;
  verified?: boolean;
}

// 统计数据类型
export interface Stats {
  subscriptions: number;
  following: number;
  friends: number;
  favorites: number;
}

// 菜单项类型
export interface MenuItem {
  icon: string;
  label: string;
  onPress?: () => void;
  badge?: number;
}

// 交易所类型
export interface Exchange {
  id: string;
  name: string;
  display_name: string;
  logo_url?: string;
  supported_account_types: AccountType[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// 交易所账户类型
export type AccountType = 'spot' | 'futures' | 'margin';
export type AccountMode = 'real' | 'demo';
export type AccountStatus = 'normal' | 'expired' | 'suspended';

export interface ExchangeAccount {
  id: string;
  user_id: string;
  exchange_id: string;
  exchange_name?: string; // Deprecated - for backward compatibility
  account_type: AccountType;
  account_mode: AccountMode;
  api_key: string;
  secret_key: string;
  passphrase?: string;
  account_nickname: string; // Now required
  is_enabled: boolean;
  status: AccountStatus;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  exchanges?: Exchange;
}

export interface CreateExchangeAccountInput {
  exchange_id: string;
  account_type: AccountType;
  account_mode: AccountMode;
  api_key: string;
  secret_key: string;
  passphrase?: string;
  account_nickname: string; // Now required
  is_enabled?: boolean;
}

export interface UpdateExchangeAccountInput {
  exchange_id?: string;
  account_type?: AccountType;
  account_mode?: AccountMode;
  api_key?: string;
  secret_key?: string;
  passphrase?: string;
  account_nickname?: string;
  is_enabled?: boolean;
  status?: AccountStatus;
}

// VIP会员类型
export type VipTier = 'free' | 'monthly' | 'quarterly' | 'yearly';

export interface VipStatus {
  tier: VipTier;
  expiresAt: string | null;
  isActive: boolean;
}

// 兑换码类型
export type RedemptionCodeType = 'monthly' | 'quarterly' | 'yearly';
export type RedemptionCodeStatus = 'active' | 'used' | 'expired';

export interface RedemptionCode {
  id: string;
  code: string;
  type: RedemptionCodeType;
  duration_days: number;
  status: RedemptionCodeStatus;
  used_by?: string | null;
  used_at?: string | null;
  expires_at: string;
  created_at: string;
}

// 兑换记录类型
export interface RedemptionRecord {
  id: string;
  user_id: string;
  code: string;
  code_type: RedemptionCodeType;
  duration_days: number;
  redeemed_at: string;
  previous_vip_expires_at?: string | null;
  new_vip_expires_at: string;
}

// 交易员类型
export interface Trader {
  id: string;
  name: string;
  avatar_url: string;
  description?: string;  // 修改：bio -> description
  created_at: string;
  updated_at: string;
}
