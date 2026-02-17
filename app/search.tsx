import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TraderCard } from '../components/TraderCard';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { searchTraders, TraderWithStats, getMultipleTradersRoiTrend } from '../lib/traderService';
import { getSearchHistory, addSearchHistory, clearSearchHistory } from '../lib/searchHistoryService';

import { useTranslation } from '../lib/i18n';

const COLORS = {
  primary: "#2ebd85",
  danger: "#f6465d",
  background: "#000000",
  surface: "#131313",
  surfaceLight: "#1c1c1e",
  textMain: "#ffffff",
  textMuted: "#9ca3af",
  border: "#27272a",
  yellow: "#eab308",
};

// 生成图表路径的辅助函数（与交易员列表一致）
const generateChartPath = (trendData: Array<{ date: string; roi: number }>): string => {
  if (!trendData || trendData.length === 0) {
    // 默认平滑曲线
    return 'M0,20 Q10,18 20,15 T40,12 T60,10 T80,8 L100,5';
  }

  const width = 100;
  const height = 40;
  const points = trendData.length;
  
  if (points === 0) {
    return `M0,${height / 2} L${width},${height / 2}`;
  }

  // 找出最大和最小ROI值
  const roiValues = trendData.map(d => d.roi);
  const minRoi = Math.min(...roiValues);
  const maxRoi = Math.max(...roiValues);
  const roiRange = maxRoi - minRoi || 1;

  let path = '';
  trendData.forEach((point, index) => {
    const x = (index / (points - 1 || 1)) * width;
    const normalizedRoi = (point.roi - minRoi) / roiRange;
    const y = height - (normalizedRoi * height * 0.8 + height * 0.1);
    
    if (index === 0) {
      path += `M${x},${y}`;
    } else {
      path += ` L${x},${y}`;
    }
  });
  
  return path;
};

export default function SearchScreen() {
  useProtectedRoute();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [results, setResults] = useState<TraderWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [traderTrendData, setTraderTrendData] = useState<Map<string, Array<{ date: string; roi: number }>>>(new Map());
  
  const PAGE_SIZE = 10;

  // 加载搜索历史
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const savedHistory = await getSearchHistory();
      setHistory(savedHistory);
    } catch (error) {
      console.error('加载搜索历史失败:', error);
    }
  };

  // 批量加载交易员的趋势数据
  const loadTrendDataForTraders = async (traders: TraderWithStats[]) => {
    if (traders.length === 0) return;
    
    try {
      const traderIds = traders.map(t => t.id);
      const trendDataMap = await getMultipleTradersRoiTrend(traderIds, 7);
      setTraderTrendData(trendDataMap);
    } catch (error) {
      console.error('❌ [Search] 批量加载趋势数据失败:', error);
    }
  };

  // 筛选选项
  const filters = [
    t('homePage.sortByRoi'),
    t('homePage.sortByWinRate'),
    t('homePage.followed')
  ];

  // 执行搜索
  const performSearch = useCallback(async (searchQuery: string, reset: boolean = true) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasMore(true);
      setTraderTrendData(new Map());
      return;
    }

    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const offset = reset ? 0 : (page - 1) * PAGE_SIZE;
      const searchResults = await searchTraders(searchQuery, user?.id, PAGE_SIZE, offset);
      
      const hasMoreData = searchResults.length === PAGE_SIZE;
      setHasMore(hasMoreData);

      if (reset) {
        setResults(searchResults);
        // 加载趋势数据
        await loadTrendDataForTraders(searchResults);
      } else {
        // 追加数据并去重
        const existingIds = new Set(results.map(t => t.id));
        const newTraders = searchResults.filter(t => !existingIds.has(t.id));
        const updatedResults = [...results, ...newTraders];
        setResults(updatedResults);
        // 加载新交易员的趋势数据
        await loadTrendDataForTraders(newTraders);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      if (reset) {
        setResults([]);
        setTraderTrendData(new Map());
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id, page, results]);

  // 下拉刷新
  const onRefresh = async () => {
    if (!query.trim()) return;
    
    setRefreshing(true);
    await performSearch(query, true);
    setRefreshing(false);
  };

  // 加载更多
  const loadMore = () => {
    if (!loadingMore && hasMore && query.trim()) {
      setPage(prev => prev + 1);
      performSearch(query, false);
    }
  };

  // 输入变化时，使用防抖
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query.trim() === '') {
      setResults([]);
      setLoading(false);
      setHasMore(true);
      setTraderTrendData(new Map());
    } else {
      setLoading(true);
      const timeout = setTimeout(() => {
        performSearch(query, true);
      }, 500); // 500ms 防抖
      setSearchTimeout(timeout);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [query]);

  const handleSearch = (text: string) => {
    setQuery(text);
  };

  const handleSelectHistory = async (text: string) => {
    setQuery(text);
    await addSearchHistory(text);
    await loadSearchHistory();
  };

  const handleClearHistory = async () => {
    await clearSearchHistory();
    setHistory([]);
  };

  const handleTraderPress = async (trader: TraderWithStats) => {
    // 保存搜索历史
    if (query.trim()) {
      await addSearchHistory(query.trim());
      await loadSearchHistory();
    }
    
    // 跳转到交易员详情页
    router.push({
      pathname: '/trader/detail',
      params: { traderId: trader.id }
    });
  };

  const handleSubscriptionChange = () => {
    // 订阅状态变化处理
  };

  const handleFavoriteChange = () => {
    // 关注状态变化处理
  };

  // 检查是否接近底部
  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    const paddingToBottom = 20;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)?tab=copy')} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder={t('search.placeholder')}
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim() === '' ? (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>{t('search.searchHistory')}</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory}>
                <MaterialIcons name="delete-outline" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {history.length > 0 ? (
            <View style={styles.historyTags}>
              {history.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyTag}
                  onPress={() => handleSelectHistory(item)}
                >
                  <Text style={styles.historyTagText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('search.noHistory')}</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onScroll={({ nativeEvent }) => {
            if (isCloseToBottom(nativeEvent)) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {loading && results.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>{t('search.searching')}</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{t('search.noResults')}</Text>
              <Text style={styles.emptySubtext}>{t('search.tryOtherKeywords')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.traderList}>
                {results.map((trader) => (
                  <TraderCard
                    key={trader.id}
                    traderId={trader.id}
                    roiLabel={t('traderCard.totalRoi')}
                    name={trader.name}
                    avatar={trader.avatar_url}
                    description={trader.description}
                    initialIsSubscribed={trader.is_subscribed || false}
                    initialIsFavorite={trader.is_followed || false}
                    onSubscriptionChange={handleSubscriptionChange}
                    onFavoriteChange={handleFavoriteChange}
                    followers={trader.followers_count || 0}
                    maxFollowers={100}
                    roi={trader.total_roi !== undefined && trader.total_roi !== null ? `${trader.total_roi > 0 ? '+' : ''}${trader.total_roi.toFixed(2)}%` : '0.00%'}
                    pnl=""
                    winRate={trader.win_rate !== undefined && trader.win_rate !== null ? `${trader.win_rate.toFixed(1)}%` : '-'}
                    aum={trader.profit_factor ? trader.profit_factor.toFixed(2) : '0'}
                    aumLabel={t('traderCard.profitFactor')}
                    days={trader.trading_days || 0}
                    coins={[]}
                    chartPath={generateChartPath(traderTrendData.get(trader.id) || [])}
                    statusColor={trader.is_online ? COLORS.primary : COLORS.yellow}
                    onPress={() => handleTraderPress(trader)}
                  />
                ))}
              </View>
              
              {/* 加载更多指示器 */}
              {loadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingMoreText}>{t('search.loadingMore')}</Text>
                </View>
              )}

              {/* 没有更多数据提示 */}
              {!hasMore && results.length > 0 && (
                <View style={styles.endContainer}>
                  <Text style={styles.endText}>{t('search.noMoreData')}</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      touchAction: 'pan-y' as any,
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    color: COLORS.textMain,
    fontSize: 16,
    padding: 0,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  historyContainer: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyTag: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  historyTagText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  resultsList: {
    flex: 1,
  },
  traderList: {
    gap: 0,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  endContainer: {
    padding: 20,
    alignItems: 'center',
  },
  endText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
