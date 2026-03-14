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
}

export interface AdminRecommendation {
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
}

export interface AdminRecommendationInput {
  issue_no: string;
  issue_date: string;
  title: string;
  description: string;
  recommendation_content: string;
  is_visible: boolean;
  updated_by?: number | null;
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

    return {
      data: (data || []) as AdminRecommendation[],
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
    const { error } = await supabase.from('tiandi_recommendations').delete().eq('id', id);
    if (error) {
      return { data: null, error: { message: toErrorMessage(error, 'ɾ��ʧ��') } };
    }
    return { data: null, error: null };
  } catch (error: any) {
    return { data: null, error: { message: toErrorMessage(error, 'ɾ��ʧ��') } };
  }
}
