import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// 从环境变量读取 Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qzcblykahxzktiprxhbf.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6Y2JseWthaHh6a3RpcHJ4aGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTU0MjksImV4cCI6MjA4MjQ5MTQyOX0.LSVP7CMvqOu2SBaCQjwYoxKO-B4z7Dhcvjthyorbziw';

// 旧项目配置（已弃用）
// const supabaseUrl = 'https://gbspfrjxokthzvdmibuo.supabase.co';
// const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdic3Bmcmp4b2t0aHp2ZG1pYnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTA3NDIsImV4cCI6MjA4MjA2Njc0Mn0.k3ThDJVhf8yf0kw4dpbqWwQpfJMQkPgX5bwmU7zLghc';

// Web 环境下使用 localStorage
const customStorageAdapter = Platform.OS === 'web' ? {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  },
} : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorageAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
