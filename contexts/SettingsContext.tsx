import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'zh' | 'en';
export type Timezone = {
  label: string;
  value: string;
  offset: number; // 相对于UTC的小时偏移量
};

// 常用时区列表
export const TIMEZONES: Timezone[] = [
  { label: 'UTC+0 (伦敦)', value: 'UTC+0', offset: 0 },
  { label: 'UTC+1 (柏林)', value: 'UTC+1', offset: 1 },
  { label: 'UTC+2 (开罗)', value: 'UTC+2', offset: 2 },
  { label: 'UTC+3 (莫斯科)', value: 'UTC+3', offset: 3 },
  { label: 'UTC+4 (迪拜)', value: 'UTC+4', offset: 4 },
  { label: 'UTC+5 (伊斯兰堡)', value: 'UTC+5', offset: 5 },
  { label: 'UTC+5.5 (新德里)', value: 'UTC+5.5', offset: 5.5 },
  { label: 'UTC+6 (达卡)', value: 'UTC+6', offset: 6 },
  { label: 'UTC+7 (曼谷)', value: 'UTC+7', offset: 7 },
  { label: 'UTC+8 (北京/香港)', value: 'UTC+8', offset: 8 },
  { label: 'UTC+9 (东京)', value: 'UTC+9', offset: 9 },
  { label: 'UTC+10 (悉尼)', value: 'UTC+10', offset: 10 },
  { label: 'UTC+11 (所罗门群岛)', value: 'UTC+11', offset: 11 },
  { label: 'UTC+12 (奥克兰)', value: 'UTC+12', offset: 12 },
  { label: 'UTC-5 (纽约)', value: 'UTC-5', offset: -5 },
  { label: 'UTC-6 (芝加哥)', value: 'UTC-6', offset: -6 },
  { label: 'UTC-7 (丹佛)', value: 'UTC-7', offset: -7 },
  { label: 'UTC-8 (洛杉矶)', value: 'UTC-8', offset: -8 },
  { label: 'UTC-4 (圣地亚哥)', value: 'UTC-4', offset: -4 },
  { label: 'UTC-3 (圣保罗)', value: 'UTC-3', offset: -3 },
];

type SettingsContextType = {
  language: Language;
  timezone: Timezone;
  setLanguage: (lang: Language) => Promise<void>;
  setTimezone: (tz: Timezone) => Promise<void>;
  loading: boolean;
};

const SettingsContext = createContext<SettingsContextType>({
  language: 'zh',
  timezone: TIMEZONES.find(tz => tz.value === 'UTC+8') || TIMEZONES[8],
  setLanguage: async () => {},
  setTimezone: async () => {},
  loading: true,
});

const STORAGE_KEYS = {
  LANGUAGE: '@app_language',
  TIMEZONE: '@app_timezone',
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh');
  const [timezone, setTimezoneState] = useState<Timezone>(
    TIMEZONES.find(tz => tz.value === 'UTC+8') || TIMEZONES[8]
  );
  const [loading, setLoading] = useState(true);

  // 初始化时从 AsyncStorage 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [storedLanguage, storedTimezone] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.getItem(STORAGE_KEYS.TIMEZONE),
      ]);

      if (storedLanguage) {
        setLanguageState(storedLanguage as Language);
      }

      if (storedTimezone) {
        const parsedTimezone = JSON.parse(storedTimezone);
        setTimezoneState(parsedTimezone);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('保存语言设置失败:', error);
      throw error;
    }
  };

  const setTimezone = async (tz: Timezone) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TIMEZONE, JSON.stringify(tz));
      setTimezoneState(tz);
    } catch (error) {
      console.error('保存时区设置失败:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        language,
        timezone,
        setLanguage,
        setTimezone,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings 必须在 SettingsProvider 内使用');
  }
  return context;
};
