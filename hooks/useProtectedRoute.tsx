import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/**
 * 保护路由的Hook
 * 如果用户未登录，自动重定向到登录页
 */
export function useProtectedRoute() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading) return;

    // 如果没有登录且不在登录页或启动页
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'splash';
    
    if (!session && !inAuthGroup && !hasRedirected.current) {
      hasRedirected.current = true;
      // 使用 setTimeout 确保在下一个事件循环中执行，避免与其他导航冲突
      setTimeout(() => {
        router.replace('/login');
      }, 100);
    }
    
    // 重置标志当用户重新登录时
    if (session) {
      hasRedirected.current = false;
    }
  }, [session, loading, segments]);

  return { session, loading };
}
