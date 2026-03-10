import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// 从环境变量获取配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qzcblykahxzktiprxhbf.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6Y2JseWthaHh6a3RpcHJ4aGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTU0MjksImV4cCI6MjA4MjQ5MTQyOX0.LSVP7CMvqOu2SBaCQjwYoxKO-B4z7Dhcvjthyorbziw';

export type UserProfile = {
  id: string;
  email: string;
  username: string | null;
  account_id: string;
  avatar_url: string | null;
  is_verified: boolean;
  vip_status: string;
  vip_expires_at: string | null;
  membership_expires_at: string | null;
  invite_code: string | null;
  subscription_count: number;
  following_count: number;
  friends_count: number;
  favorites_count: number;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: any; data?: any }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any; data?: any }>;
  signInOrSignUpWithCustomAccount: (account: string, password: string) => Promise<{ error: any; data?: any; isNewUser?: boolean }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signInWithOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  signInWithPassword: async () => ({ error: null }),
  signInOrSignUpWithCustomAccount: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// 将 Supabase 错误信息翻译为中文
const translateAuthError = (errorMessage: string): string => {
  const errorMap: { [key: string]: string } = {
    'Token has expired or is invalid': '验证码已过期或无效，请重新获取',
    'Invalid login credentials': '邮箱或密码错误',
    'Email not confirmed': '邮箱未确认',
    'User already registered': '该邮箱已注册',
    'Invalid email': '邮箱格式不正确',
    'Password should be at least 6 characters': '密码至少需要6个字符',
    'Unable to validate email address: invalid format': '邮箱格式不正确',
    'Signup requires a valid password': '请输入有效的密码',
    'Email rate limit exceeded': '发送验证码过于频繁，请稍后再试',
  };

  // 检查是否有匹配的翻译
  for (const [enMsg, zhMsg] of Object.entries(errorMap)) {
    if (errorMessage.includes(enMsg)) {
      return zhMsg;
    }
  }

  // 如果没有匹配，返回原始错误信息
  return errorMessage;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as UserProfile;
    } catch (e) {
      console.error('Exception fetching profile:', e);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const data = await fetchProfile(user.id);
      if (data) setProfile(data);
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error fetching session:', error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        // 不在启动时自动获取 profile，只在访问个人资料页面时获取
      } catch (error) {
        console.error('Exception in fetchSession:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // 不在认证状态变化时自动获取 profile
      if (!session?.user) {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });
    
    if (error) {
      // 转换为中文错误信息
      const errorMessage = translateAuthError(error.message);
      return { error: { ...error, message: errorMessage } };
    }
    
    return { error: null };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    
    if (error) {
      // 转换为中文错误信息
      const errorMessage = translateAuthError(error.message);
      return { data, error: { ...error, message: errorMessage } };
    }
    
    return { data, error: null };
  };

  const signInWithPassword = async (email: string, password: string) => {
    try {
      console.log('🔐 开始密码登录 (使用 HTTP API):', email);
      
      // 使用原生 fetch 调用 Supabase Auth API - 密码登录
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
        })
      });
      
      const result = await response.json();
      console.log('🔐 HTTP 响应状态:', response.status);
      
      // 登录成功
      if (response.ok && result.access_token) {
        console.log('✅ 密码登录成功');
        
        // 手动设置 session（SDK 会自动处理）
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
        
        if (setSessionError) {
          console.error('❌ 设置 session 失败:', setSessionError);
          return { data: null, error: { message: '登录失败，请重试' } };
        }
        
        return { data: sessionData, error: null };
      }
      
      // 登录失败 - 处理各种错误情况
      console.log('❌ 登录失败:', result);
      
      let errorMessage = '登录失败，请重试';
      
      // 密码错误
      if (result.error_description?.includes('Invalid login credentials') ||
          result.msg?.includes('Invalid login credentials')) {
        errorMessage = '邮箱或密码错误，请检查后重试';
      }
      // 用户不存在或邮箱未验证
      else if (result.error_description?.includes('Email not confirmed')) {
        errorMessage = '请先验证您的邮箱';
      }
      // 其他错误
      else if (result.error_description || result.msg) {
        errorMessage = result.error_description || result.msg;
      }
      
      return { data: null, error: { message: errorMessage } };
    } catch (error: any) {
      console.error('🔐 密码登录异常:', error);
      return { data: null, error: { message: error?.message || '网络错误，请检查网络连接' } };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      console.log('🔐 开始更新密码 (使用 HTTP API)...');
      console.log('🔐 新密码长度:', newPassword?.length || 0);
      
      // 检查当前会话（仍然使用 SDK 获取 token）
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 当前会话:', session ? '存在' : '不存在');
      
      if (sessionError || !session) {
        console.error('🔐 获取会话失败');
        return { error: { message: '会话已过期，请重新登录' } };
      }
      
      const accessToken = session.access_token;
      console.log('🔐 Access Token 长度:', accessToken.length);
      console.log('🔐 请求时间:', new Date().toISOString());
      
      // 使用原生 fetch 调用 Supabase Auth API
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          password: newPassword
        })
      });
      
      console.log('🔐 HTTP 响应状态:', response.status);
      console.log('🔐 响应时间:', new Date().toISOString());
      
      const result = await response.json();
      console.log('🔐 响应数据:', JSON.stringify(result, null, 2));
      
      // 检查 HTTP 状态码
      if (!response.ok) {
        console.error('🔐 HTTP 错误:', response.status);
        
        // 处理错误消息
        let errorMessage = result?.message || result?.error_description || result?.msg || '更新密码失败';
        
        if (errorMessage.includes('New password should be different') || 
            errorMessage.includes('same as the old password')) {
          errorMessage = '新密码不能与当前密码相同，请输入一个不同的密码';
        } else if (errorMessage.includes('Password should be at least')) {
          errorMessage = '密码长度至少为6个字符';
        } else if (errorMessage.includes('weak_password')) {
          errorMessage = '密码强度不够，请使用更复杂的密码';
        }
        
        return { error: { message: errorMessage } };
      }
      
      console.log('✅ 密码更新成功！');
      return { error: null };
    } catch (error: any) {
      console.error('🔐 更新密码异常:', error);
      return { error: { message: error?.message || '更新密码失败，请检查网络连接' } };
    }
  };

  // 登录即注册：仅支持 +86 手机号
  const signInOrSignUpWithCustomAccount = async (account: string, password: string) => {
    try {
      const normalizedAccount = account.trim();
      const mobileCnWithPrefixRegex = /^\+86(1[3-9]\d{9})$/;

      if (!mobileCnWithPrefixRegex.test(normalizedAccount)) {
        return {
          data: null,
          error: { message: '仅支持+86手机号登录/注册，例如+8613812345678' },
          isNewUser: false,
        };
      }

      console.log('🔐 开始手机号登录即注册:', normalizedAccount);

      // 将手机号转换为邮箱格式（添加固定后缀）
      const encodedAccount = encodeURIComponent(normalizedAccount);
      const email = `${encodedAccount}@mashangfa.local`;

      // 1. 先尝试登录
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!loginError && loginData.session) {
        console.log('✅ 登录成功');
        return { data: loginData, error: null, isNewUser: false };
      }

      // 2. 登录失败，检查是否是用户不存在
      if (loginError?.message?.includes('Invalid login credentials') ||
          loginError?.message?.includes('用户不存在')) {
        console.log('👤 用户不存在，尝试注册...');

        // 3. 自动注册
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // 自动确认邮箱，无需验证
            emailRedirectTo: undefined,
          }
        });

        if (signUpError) {
          console.error('❌ 注册失败:', signUpError);
          const errorMessage = translateAuthError(signUpError.message);
          return { data: null, error: { ...signUpError, message: errorMessage }, isNewUser: false };
        }

        console.log('✅ 注册成功，已自动登录');
        return { data: signUpData, error: null, isNewUser: true };
      }

      // 4. 其他错误
      const errorMessage = loginError ? translateAuthError(loginError.message) : '登录失败';
      if (errorMessage.includes('邮箱')) {
        return { data: null, error: { message: errorMessage.replace(/邮箱/g, '手机号') }, isNewUser: false };
      }
      return { data: null, error: { message: errorMessage }, isNewUser: false };
    } catch (error: any) {
      console.error('🔐 自定义账号登录即注册异常:', error);
      return { data: null, error: { message: error?.message || '操作失败，请重试' }, isNewUser: false };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signInWithOtp, verifyOtp, signInWithPassword, updatePassword, signInOrSignUpWithCustomAccount, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
