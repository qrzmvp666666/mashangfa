import { supabase } from './supabase';

export interface MembershipPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  features: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * 获取可用的会员套餐列表（通过 RPC）
 */
export async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  try {
    const { data, error } = await supabase.rpc('get_membership_plans');
    if (error) {
      console.error('Error fetching membership plans:', error);
      return [];
    }
    return data as MembershipPlan[];
  } catch (err) {
    console.error('Membership plans fetch error:', err);
    return [];
  }
}
