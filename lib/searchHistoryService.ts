import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@search_history_traders';
const MAX_HISTORY_ITEMS = 10;

/**
 * 获取搜索历史
 */
export async function getSearchHistory(): Promise<string[]> {
  try {
    const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (historyJson) {
      return JSON.parse(historyJson);
    }
    return [];
  } catch (error) {
    console.error('读取搜索历史失败:', error);
    return [];
  }
}

/**
 * 添加搜索关键词到历史
 * @param keyword 搜索关键词
 */
export async function addSearchHistory(keyword: string): Promise<void> {
  try {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;

    let history = await getSearchHistory();
    
    // 如果已存在，先移除
    history = history.filter(item => item !== trimmedKeyword);
    
    // 添加到最前面
    history.unshift(trimmedKeyword);
    
    // 限制最大数量
    history = history.slice(0, MAX_HISTORY_ITEMS);
    
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('保存搜索历史失败:', error);
  }
}

/**
 * 清空搜索历史
 */
export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('清空搜索历史失败:', error);
  }
}

/**
 * 从搜索历史中删除指定项
 * @param keyword 要删除的关键词
 */
export async function removeSearchHistoryItem(keyword: string): Promise<void> {
  try {
    let history = await getSearchHistory();
    history = history.filter(item => item !== keyword);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('删除搜索历史项失败:', error);
  }
}
