import { supabase } from './supabase';

export interface AdminUser {
  id: number;
  auth_user_id: string | null;
  email: string;
  display_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  is_correct_override?: boolean | null;
}

export interface AdminRecommendation {
  lottery_results?: { special_animal?: string; special_num?: number } | null | { special_animal?: string; special_num?: number }[];
  id: number;
  issue_no: string;
  issue_date: string;
  title: string | null;
  description: string | null;
  recommendation_content: string | null;
  is_visible: boolean;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  is_correct_override?: boolean | null;
}

export interface AdminRecommendationInput {
  special_animal?: string;
  special_num?: string;
  issue_no: string;
  issue_date: string;
  title: string;
  description: string;
  recommendation_content: string;
  is_visible: boolean;
  updated_by?: number | null;
  is_correct_override?: boolean | null;
}

type ServiceResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

function toErrorMessage(error: any, fallback: string) {
  const rawMessage = error?.message || fallback;

  if (rawMessage.includes('Invalid login credentials')) {
    return '邮箱或密码错误';
  }
  if (rawMessage.includes('ADMIN_ACCESS_DENIED')) {
    return '该账号没有后台权限';
  }
  if (rawMessage.includes('NOT_AUTHENTICATED')) {
    return '请先登录后台账号';
  }
  if (rawMessage.includes('duplicate key value')) {
    return '期号或日期已存在，请勿重复创建';
  }

  return rawMessage;
}

export async function signInAdmin(email: string, password: string): Promise<ServiceResult<AdminUser>> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return {
        data: null,
        error: { message: toErrorMessage(error, '后台登录失败') },
      };
    }

    const { data, error: linkError } = await supabase.rpc('link_admin_user');

    if (linkError) {
      await supabase.auth.signOut();
      return {
        data: null,
        error: { message: toErrorMessage(linkError, '该账号没有后台权限') },
      };
    }

    return {
      data: data as AdminUser,
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: { message: toErrorMessage(error, '后台登录失败，请稍后重试') },
    };
  }
}

export async function ensureAdminAccess(): Promise<ServiceResult<AdminUser>> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      return {
        data: null,
        error: { message: '请先登录后台账号' },
      };
    }

    const { data, error } = await supabase.rpc('link_admin_user');

    if (error) {
      return {
        data: null,
        error: { message: toErrorMessage(error, '该账号没有后台权限') },
      };
    }

    return {
      data: data as AdminUser,
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: { message: toErrorMessage(error, '后台鉴权失败') },
    };
  }
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

export async function fetchAdminRecommendations(): Promise<ServiceResult<AdminRecommendation[]>> {
  try {
    const { data, error } = await supabase
      .from('tiandi_recommendations')
      .select('*')
      .order('issue_date', { ascending: false });

    if (error) {
      return {
        data: null,
        error: { message: toErrorMessage(error, '读取推荐列表失败') },
      };
    }

    const recs = (data || []) as AdminRecommendation[];
    
    if (recs.length > 0) {
      const issueNos = recs.map(r => r.issue_no);
      const { data: lotteryResults } = await supabase
        .from('lottery_results')
        .select('issue_no, special_animal, special_num')
        .in('issue_no', issueNos);

      if (lotteryResults && lotteryResults.length > 0) {
        const resultMap = new Map(lotteryResults.map(l => [l.issue_no, l]));
        recs.forEach(r => {
          const lResult = resultMap.get(r.issue_no);
          if (lResult) {
            r.lottery_results = {
              special_animal: lResult.special_animal,
              special_num: lResult.special_num,
            };
          }
        });
      }
    }

    return {
      data: recs,
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: { message: toErrorMessage(error, '读取推荐列表失败') },
    };
  }
}

export async function fetchAdminRecommendationById(id: number): Promise<ServiceResult<AdminRecommendation>> {
  try {
    const { data, error } = await supabase
      .from('tiandi_recommendations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return {
        data: null,
        error: { message: toErrorMessage(error, '读取推荐详情失败') },
      };
    }

    return {
      data: data as AdminRecommendation,
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: { message: toErrorMessage(error, '读取推荐详情失败') },
    };
  }
}

export async function saveAdminRecommendation(
  input: AdminRecommendationInput,
  id?: number
): Promise<ServiceResult<AdminRecommendation>> {
  try {
    const payload = {
      issue_no: input.issue_no.trim(),
      issue_date: input.issue_date.trim(),
      title: input.title.trim() || null,
      description: input.description.trim() || null,
      recommendation_content: input.recommendation_content.trim() || null,
      is_visible: input.is_visible,
      updated_by: input.updated_by ?? null,
      is_correct_override: input.is_correct_override !== undefined ? input.is_correct_override : null,
    };

    const query = id
      ? supabase.from('tiandi_recommendations').update(payload).eq('id', id)
      : supabase.from('tiandi_recommendations').insert(payload);

    const { data, error } = await query.select('*').single();

    if (error) {
      return {
        data: null,
        error: { message: toErrorMessage(error, '保存推荐失败') },
      };
    }

    if (input.special_animal || input.special_num) {
      await supabase.from('lottery_results').upsert({
        issue_no: input.issue_no.trim(),
        draw_date: input.issue_date.trim(),
        special_animal: input.special_animal ? input.special_animal.trim() : null,
        special_num: input.special_num ? parseInt(input.special_num, 10) : null,
      }, { onConflict: 'issue_no' });
    }

    return {
      data: data as AdminRecommendation,
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: { message: toErrorMessage(error, '保存推荐失败') },
    };
  }
}

export function subscribeToAdminRecommendations(onUpdate: () => void) {
  const channel = supabase
    .channel(`admin:tiandi_recommendations:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tiandi_recommendations',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
export async function deleteAdminRecommendation(id: number): Promise<ServiceResult<null>> {
  try {
    const { data: item } = await supabase.from("tiandi_recommendations").select("issue_no").eq("id", id).single();
    if (item && item.issue_no) {
      await supabase.from("lottery_results").update({ special_animal: null, special_num: null }).eq("issue_no", item.issue_no);
    }
    const { error } = await supabase.from("tiandi_recommendations").update({ recommendation_content: null, is_correct_override: null }).eq("id", id);
    if (error) {
      return { data: null, error: { message: toErrorMessage(error, 'ɾ��ʧ��') } };
    }
    return { data: null, error: null };
  } catch (error: any) {
    return { data: null, error: { message: toErrorMessage(error, 'ɾ��ʧ��') } };
  }
}

