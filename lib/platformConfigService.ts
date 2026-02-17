import { supabase } from './supabase';

export interface PlatformConfig {
  drawHour: number;
  drawMinute: number;
  predictionHour: number;
  predictionMinute: number;
}

// 硬编码默认值（仅在数据库加载失败时使用）
const DEFAULTS: PlatformConfig = {
  drawHour: 21,
  drawMinute: 35,
  predictionHour: 15,
  predictionMinute: 0,
};

// 缓存
let cachedConfig: PlatformConfig | null = null;

/**
 * 从数据库获取平台配置，带本地缓存
 * 首次调用走网络，后续直接用缓存
 */
export async function getPlatformConfig(): Promise<PlatformConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const { data, error } = await supabase.rpc('get_platform_config');

    if (error || !data) {
      console.warn('Failed to load platform config, using defaults:', error);
      cachedConfig = DEFAULTS;
      return DEFAULTS;
    }

    const configMap: Record<string, string> = {};
    for (const row of data as { key: string; value: string }[]) {
      configMap[row.key] = row.value;
    }

    cachedConfig = {
      drawHour: parseInt(configMap['draw_hour'] || String(DEFAULTS.drawHour), 10),
      drawMinute: parseInt(configMap['draw_minute'] || String(DEFAULTS.drawMinute), 10),
      predictionHour: parseInt(configMap['prediction_hour'] || String(DEFAULTS.predictionHour), 10),
      predictionMinute: parseInt(configMap['prediction_minute'] || String(DEFAULTS.predictionMinute), 10),
    };

    return cachedConfig;
  } catch (err) {
    console.warn('Exception loading platform config:', err);
    cachedConfig = DEFAULTS;
    return DEFAULTS;
  }
}

/**
 * 清除缓存（用于需要强制刷新的场景）
 */
export function clearConfigCache() {
  cachedConfig = null;
}
