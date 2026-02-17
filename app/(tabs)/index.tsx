import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions, LayoutChangeEvent, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect, Circle, G, Image as SvgImage, Text as SvgText, ClipPath } from 'react-native-svg';
import { AddToHomeScreen } from '../../components/AddToHomeScreen';
import { TraderCard } from '../../components/TraderCard';
import { SignalCard } from '../../components/SignalCard';
import { CopySignalModal } from '../../components/CopySignalModal';
import { SignalService, Signal } from '../../lib/signalService';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatDateTime } from '../../lib/timezoneUtils';
import { getFollowedTraders, getSubscribedTraders, subscribeTrader, unsubscribeTrader, followTrader, unfollowTrader, getUserStats } from '../../lib/userTraderService';
import {
  getTradersWithStats,
  TraderWithStats,
  getMultipleTradersRoiTrend,  // Changed from Signal
  getLeaderboard,
  LeaderboardTrader,
  getTopTradersTrendData,
  TraderTrendData
} from '../../lib/traderService';
import { getPlatformStats, PlatformStats } from '../../lib/platformStatsService';
import { supabase } from '../../lib/supabase';
import type { Trader } from '../../types';
import { useTranslation } from '../../lib/i18n';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: "#2ebd85",
  danger: "#f6465d",
  background: "#000000",
  surface: "#131313",
  surfaceLight: "#1c1c1e", // Lighter gray for cards
  textMain: "#ffffff",
  textMuted: "#9ca3af",
  border: "#27272a",
  yellow: "#eab308", // yellow-500
  yellowText: "#facc15", // yellow-400
};

// 错误边界组件：用于捕获 SVG 渲染错误（通常是因为未重新构建 App）
const ChartErrorBoundaryWithI18n = ({ children, t }: { children: React.ReactNode, t: any }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const componentDidCatch = () => setHasError(true);
    return () => {};
  }, []);

  if (hasError) {
    return (
      <View style={[styles.chartArea, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,0,0,0.05)' }]}>
        <MaterialIcons name="build" size={32} color={COLORS.danger} style={{ marginBottom: 8 }} />
        <Text style={{ color: COLORS.danger, fontWeight: 'bold', marginBottom: 4 }}>{t('homePage.chartNotLoaded')}</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{t('homePage.rebuildPrompt')}</Text>
        <View style={{ backgroundColor: '#000', padding: 8, borderRadius: 4, marginTop: 8 }}>
          <Text style={{ color: COLORS.primary, fontSize: 12, fontFamily: 'Menlo' }}>npx expo run:ios</Text>
        </View>
      </View>
    );
  }
  return <>{children}</>;
};

class ChartErrorBoundary extends React.Component<{children: React.ReactNode, t: any}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError(_: any) { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.chartArea, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,0,0,0.05)' }]}>
          <MaterialIcons name="build" size={32} color={COLORS.danger} style={{ marginBottom: 8 }} />
          <Text style={{ color: COLORS.danger, fontWeight: 'bold', marginBottom: 4 }}>{this.props.t('homePage.chartNotLoaded') || '图表组件未加载'}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{this.props.t('homePage.rebuildPrompt') || '请在终端运行以下命令重新构建：'}</Text>
          <View style={{ backgroundColor: '#000', padding: 8, borderRadius: 4, marginTop: 8 }}>
            <Text style={{ color: COLORS.primary, fontSize: 12, fontFamily: 'Menlo' }}>npx expo run:ios</Text>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

// 排行榜列表项组件
const LeaderboardItem = ({
  rank,
  traderId,
  name,
  roi,
  avatar,
  isTop = false,
  initialIsSubscribed = false,
  initialIsFavorite = false,
  onSubscriptionChange,
  onFavoriteChange
}: {
  rank: number,
  traderId: string,
  name: string,
  roi: string,
  avatar: string,
  isTop?: boolean,
  initialIsSubscribed?: boolean,
  initialIsFavorite?: boolean,
  onSubscriptionChange?: () => void,
  onFavoriteChange?: () => void
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = React.useState(initialIsSubscribed);
  const [isFavorite, setIsFavorite] = React.useState(initialIsFavorite);
  const [loading, setLoading] = React.useState(false);

  // 当外部状态改变时更新本地状态
  React.useEffect(() => {
    setIsSubscribed(initialIsSubscribed);
  }, [initialIsSubscribed]);

  React.useEffect(() => {
    setIsFavorite(initialIsFavorite);
  }, [initialIsFavorite]);

  // 处理订阅/取消订阅
  const handleSubscriptionToggle = async () => {
    if (!user?.id) {
      console.log('请先登录');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      
      if (isSubscribed) {
        const result = await unsubscribeTrader(user.id, traderId);
        if (result.success) {
          setIsSubscribed(false);
          onSubscriptionChange?.();
        }
      } else {
        const result = await subscribeTrader(user.id, traderId);
        if (result.success) {
          setIsSubscribed(true);
          onSubscriptionChange?.();
        }
      }
    } catch (error) {
      console.error('订阅操作失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理关注/取消关注
  const handleFavoriteToggle = async () => {
    if (!user?.id) {
      console.log('请先登录');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      
      if (isFavorite) {
        const result = await unfollowTrader(user.id, traderId);
        if (result.success) {
          setIsFavorite(false);
          onFavoriteChange?.();
        }
      } else {
        const result = await followTrader(user.id, traderId);
        if (result.success) {
          setIsFavorite(true);
          onFavoriteChange?.();
        }
      }
    } catch (error) {
      console.error('关注操作失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.leaderboardItem, isTop && styles.topLeaderboardItem]}
      onPress={() => router.push(`/trader/detail?traderId=${traderId}`)}
      activeOpacity={0.7}
    >
      {isTop && (
        <View style={styles.topBadgeIcon}>
           <MaterialIcons name="emoji-events" size={60} color={COLORS.yellow} style={{ opacity: 0.1 }} />
        </View>
      )}

      <View style={styles.rankContainer}>
        <Text style={[
          styles.rankText,
          rank === 1 ? { color: COLORS.yellow } :
          rank === 2 ? { color: '#9ca3af' } :
          rank === 3 ? { color: '#c2410c' } :
          { color: COLORS.textMuted, fontSize: 14 }
        ]}>
          {rank}
        </Text>
      </View>

      <View style={styles.avatarContainer}>
        <Image source={{ uri: avatar }} style={[styles.avatar, isTop && { width: 48, height: 48, borderColor: COLORS.yellow }]} />
        {isTop && (
          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>TOP 1</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={[styles.nameText, isTop && { color: COLORS.yellowText }]} numberOfLines={1}>{name}</Text>
        </View>
        <View style={styles.roiRow}>
          <Text style={[styles.roiValue, isTop && { fontSize: 16 }]}>{roi}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleFavoriteToggle}
        disabled={loading}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons
          name={isFavorite ? "star" : "star-border"}
          size={24}
          color={isFavorite ? COLORS.yellow : COLORS.textMuted}
        />
      </TouchableOpacity>

      {/* 订阅按钮 - 暂时隐藏 */}
      {false && (
        <TouchableOpacity
          style={[styles.copyButton, isSubscribed ? styles.copyButtonSubscribed : styles.copyButtonUnsubscribed]}
          onPress={handleSubscriptionToggle}
          disabled={loading}
        >
          <Text style={styles.copyButtonText}>{loading ? '...' : (isSubscribed ? '已订阅' : '订阅')}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const OverviewTabContent = ({ onMorePress, currentTab }: { onMorePress: () => void, currentTab?: string }) => {
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { timezone, language } = useSettings();
  const { t } = useTranslation();
  const [timeFilter, setTimeFilter] = React.useState(language === 'zh' ? '近一周' : 'Last Week');
  const [hiddenTraders, setHiddenTraders] = React.useState<string[]>([]);
  const [leaderboardData, setLeaderboardData] = React.useState<LeaderboardTrader[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = React.useState(true);
  
  // 平台统计数据
  const [platformStats, setPlatformStats] = React.useState<PlatformStats>({
    todaySignalCount: 0,
    longSignalCount: 0,
    shortSignalCount: 0,
    activeTraderCount: 0,
    tradingPairCount: 0,
  });

  // 关注博主数量
  const [followCount, setFollowCount] = React.useState<number>(0);

  // 收益趋势数据
  const [trendData, setTrendData] = React.useState<TraderTrendData[]>([]);
  const [trendLoading, setTrendLoading] = React.useState(true);

  const toggleTrader = (name: string) => {
    setHiddenTraders(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  // 加载排行榜数据和平台统计数据
  const loadData = React.useCallback(async () => {
    try {
      // 初始加载时loading为true，后续focus时静默更新，不设置loading为true以避免闪烁

      // 直接传入 user.id，获取带有状态的排行榜数据 (limit=5,只获取前5名)
      const data = await getLeaderboard(user?.id, 5);
      setLeaderboardData(data);

      // 加载平台统计数据（使用用户设置的时区）
      const stats = await getPlatformStats(timezone.offset);
      setPlatformStats(stats);

      // 加载关注博主数量
      if (user?.id) {
        const userStats = await getUserStats(user.id);
        setFollowCount(userStats.followCount);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [user?.id, timezone.offset]);

  // 加载收益趋势数据
  const loadTrendData = React.useCallback(async () => {
    try {
      setTrendLoading(true);
      const lastWeekText = language === 'zh' ? '近一周' : 'Last Week';
      const days = timeFilter === lastWeekText ? 7 : 30;
      const data = await getTopTradersTrendData(days);
      setTrendData(data);
      console.log('✅ 成功加载收益趋势数据，交易员数量:', data.length);
    } catch (error) {
      console.error('❌ 加载收益趋势数据失败:', error);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  }, [timeFilter, language]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      loadTrendData();
    }, [loadData, loadTrendData])
  );

  // 当切换回Overview标签时刷新数据
  React.useEffect(() => {
    if (currentTab === 'overview') {
      loadData();
    }
  }, [currentTab, loadData]);

  // 监听 Supabase Realtime 变更 (实时更新排行榜和趋势数据)
  React.useEffect(() => {
    // 仅在当前标签为 'overview' 时监听
    if (currentTab !== 'overview') return;

    // 辅助函数：判断 traders 变更是否需要刷新排行榜
    const checkIfShouldRefreshLeaderboard = (payload: any): boolean => {
      const { eventType, new: newRow, old: oldRow } = payload;
      
      // INSERT: 新增交易员,如果可见则需要刷新
      if (eventType === 'INSERT' && newRow?.is_visible === true) {
        console.log('✅ [Realtime] 新增可见交易员,刷新排行榜');
        return true;
      }
      
      // DELETE: 删除交易员,直接刷新
      if (eventType === 'DELETE') {
        console.log('✅ [Realtime] 删除交易员,刷新排行榜');
        return true;
      }
      
      // UPDATE: 检查关键字段是否变化
      if (eventType === 'UPDATE') {
        // 可见性变化
        if (oldRow?.is_visible !== newRow?.is_visible) {
          console.log('✅ [Realtime] 交易员可见性变化,刷新排行榜');
          return true;
        }
        
        // ROI 变化 (影响排名)
        if (oldRow?.total_roi !== newRow?.total_roi) {
          console.log('✅ [Realtime] 交易员ROI变化,刷新排行榜');
          return true;
        }
        
        // 其他展示字段变化 (名称、头像等)
        if (
          oldRow?.name !== newRow?.name ||
          oldRow?.avatar_url !== newRow?.avatar_url ||
          oldRow?.win_rate !== newRow?.win_rate ||
          oldRow?.signal_count !== newRow?.signal_count ||
          oldRow?.followers_count !== newRow?.followers_count
        ) {
          console.log('✅ [Realtime] 交易员展示字段变化,刷新排行榜');
          return true;
        }
      }
      
      return false;
    };

    // 防抖节流：合并频繁变更，同时避免"正在加载时又触发"的抽搐
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let isRefreshing = false; // 防止刷新期间再次触发
    const scheduleRefresh = (opts: { data?: boolean; trend?: boolean }) => {
      if (isRefreshing) {
        console.log('⏸️  [Realtime] 刷新中，跳过本次触发');
        return; // 已经在刷新中，跳过
      }
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(async () => {
        isRefreshing = true;
        try {
          if (opts.data) {
            console.log('🔄 [Realtime] 触发刷新：loadData()');
            await loadData();
          }
          if (opts.trend) {
            console.log('🔄 [Realtime] 触发刷新：loadTrendData()');
            await loadTrendData();
          }
        } finally {
          isRefreshing = false; // 刷新完成，解锁
        }
      }, 500); // 500ms 防抖
    };

    console.log('🔌 [Realtime] 正在订阅 traders / signals 变更...');
    const channel = supabase
      .channel('overview-realtime')
      // traders：排行榜字段、头像、名称、total_roi 等变化；也可能影响 Top5 的选择
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT | UPDATE | DELETE
          schema: 'public',
          table: 'traders',
        },
        (payload) => {
          console.log('⚡️ [Realtime] traders 变更:', {
            eventType: payload.eventType,
            table: payload.table,
            trader_id: (payload as any).new?.id || (payload as any).old?.id,
            trader_name: (payload as any).new?.name || (payload as any).old?.name,
          });
          
          // 智能过滤：只有真正影响排行榜的变更才刷新
          const shouldRefreshLeaderboard = checkIfShouldRefreshLeaderboard(payload);
          if (shouldRefreshLeaderboard) {
            // traders 变化：刷新排行榜 + 趋势（Top5 可能变化）
            scheduleRefresh({ data: true, trend: true });
          } else {
            console.log('⏭️  [Realtime] traders 变更不影响排行榜,跳过刷新');
          }
        }
      )
      // signals：收益趋势来自 signals 的累计（closed% + roi + closed_at），所以 signals 变更必须刷新趋势
      .on(
        'postgres_changes',
        {
          event: '*', // signals 建议同样监听 '*': INSERT/UPDATE/DELETE
          schema: 'public',
          table: 'signals',
        },
        (payload) => {
          const newRow = (payload as any).new;
          const oldRow = (payload as any).old;
          console.log('⚡️ [Realtime] signals 变更:', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            // 只打印关键字段，避免日志过大
            trader_id: newRow?.trader_id ?? oldRow?.trader_id,
            status: newRow?.status ?? oldRow?.status,
            closed_at: newRow?.closed_at ?? oldRow?.closed_at,
            roi: newRow?.roi ?? oldRow?.roi,
            id: newRow?.id ?? oldRow?.id,
          });
          
          // 智能过滤：只对影响趋势的变更才刷新
          // 1. INSERT 且 status 是 closed% → 新增平仓信号，影响趋势
          // 2. UPDATE 且 status/roi/closed_at 字段变化 → 影响趋势
          // 3. DELETE → 删除了平仓信号，也影响趋势
          const isRelevant = 
            payload.eventType === 'INSERT' && newRow?.status?.startsWith('closed') ||
            payload.eventType === 'UPDATE' && (
              newRow?.status !== oldRow?.status ||
              newRow?.roi !== oldRow?.roi ||
              newRow?.closed_at !== oldRow?.closed_at
            ) ||
            payload.eventType === 'DELETE' && oldRow?.status?.startsWith('closed');
          
          if (isRelevant) {
            console.log('✅ [Realtime] signals 相关变更，触发趋势刷新');
            scheduleRefresh({ trend: true });
          } else {
            console.log('⏭️  [Realtime] signals 无关变更（非平仓/字段未变），跳过');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [Realtime] overview 订阅状态:', status);
      });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      console.log('🔌 [Realtime] 取消订阅 overview');
      supabase.removeChannel(channel);
    };
  }, [currentTab, loadData, loadTrendData]);

  // 当用户订阅/取消订阅后刷新状态
  const handleSubscriptionChange = async () => {
    // 重新加载数据以更新状态
    loadData();
  };

  // 当用户关注/取消关注后刷新状态
  const handleFavoriteChange = async () => {
    // 重新加载数据以更新状态
    loadData();
  };

  // 为排行榜前5名交易员分配颜色
  const TRADER_COLORS = [
    COLORS.primary,  // 第1名 - 绿色
    '#3b82f6',       // 第2名 - 蓝色
    COLORS.yellow,   // 第3名 - 黄色
    '#f97316',       // 第4名 - 橙色
    '#8b5cf6'        // 第5名 - 紫色
  ];

  // 将真实数据转换为图表格式
  const traders = React.useMemo(() => {
    if (trendData.length === 0) return [];

    return trendData.map((trader, index) => {
      // 格式化日期：从 YYYY-MM-DD 转换为 MM-DD
      const formattedData = trader.data.map(d => ({
        date: d.date.substring(5), // 只保留 MM-DD 部分
        value: d.roi
      }));

      return {
        name: trader.name,
        color: TRADER_COLORS[index % TRADER_COLORS.length],
        avatar: trader.avatarUrl,
        // 累计收益率模式：使用真实累计 ROI（不做减首日归一化）
        data: formattedData
      };
    });
  }, [trendData]);

  // Calculate Min/Max Y dynamically - 累计收益率模式：从所有点位计算范围
  const { yAxisMax, yAxisMin, yRange } = React.useMemo(() => {
    if (trendData.length === 0) {
      return { yAxisMax: 10, yAxisMin: -10, yRange: 20 };
    }

    const allValues: number[] = [];
    trendData.forEach(t => {
      t.data.forEach(p => {
        if (p.roi === null || p.roi === undefined) return;
        const v = Number(p.roi);
        if (!Number.isFinite(v)) return;
        allValues.push(v);
      });
    });

    if (allValues.length === 0) {
      return { yAxisMax: 10, yAxisMin: -10, yRange: 20 };
    }

    const dataMax = Math.max(...allValues);
    const dataMin = Math.min(...allValues);

    // 轻微 padding，避免折线贴边
    const range = dataMax - dataMin;
    const padding = range * 0.12 || 5;
    const roughMax = dataMax + padding;
    const roughMin = dataMin - padding;

    // 计算数量级并扩展到“漂亮”数字
    const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(roughMax), Math.abs(roughMin))))) || 1;
    const max = Math.ceil(roughMax / magnitude) * magnitude;
    const min = Math.floor(roughMin / magnitude) * magnitude;

    return { yAxisMax: max, yAxisMin: min, yRange: max - min };
  }, [trendData]);

  const chartAreaWidth = windowWidth - 64 - 40; // 16*2 margin + 16*2 padding + 40 yAxis
  const dataLength = traders.length > 0 ? traders[0].data.length : 0;

  let xStep = 0;
  let chartWidth = chartAreaWidth;

  if (dataLength > 1) {
    if (dataLength <= 7) {
      // Fit in screen, leave ~30px for avatar at the end
      xStep = (chartAreaWidth - 30) / (dataLength - 1);
      chartWidth = chartAreaWidth;
    } else {
      // Scrollable
      xStep = 60;
      chartWidth = (dataLength - 1) * xStep + 60; // Ensure enough space at end
    }
  } else {
    xStep = 0;
    chartWidth = chartAreaWidth;
  }

  const chartHeight = 200;
  const verticalPadding = 20;

  // === 累计收益率：symlog 压缩刻度 ===
  // 说明：
  // - 轴标签仍显示原始 ROI(%)
  // - 绘制时使用 symlog 映射后的比例，避免极端值“压扁”其它曲线
  // - k 越大：线性区越宽（更像线性）；k 越小：压缩更强
  const SYMLOG_K = 50; // 建议口径：-100%~300% 更接近线性，1000% 级别开始明显压缩

  const symlog = (x: number, k: number) => {
    if (!Number.isFinite(x)) return 0;
    const ax = Math.abs(x);
    const s = x < 0 ? -1 : 1;
    return s * Math.log1p(ax / k);
  };

  const yMinT = symlog(yAxisMin, SYMLOG_K);
  const yMaxT = symlog(yAxisMax, SYMLOG_K);
  const yRangeT = yMaxT - yMinT || 1;

  const getY = (val: number) => {
    const availableHeight = chartHeight - (verticalPadding * 2);
    const vt = symlog(val, SYMLOG_K);
    const normalizedVal = (vt - yMinT) / yRangeT;
    return chartHeight - verticalPadding - normalizedVal * availableHeight;
  };

  // Calculate Y-axis ticks (symlog): 在变换空间里等分，再反解回原始值
  const symlogInverse = (y: number, k: number) => {
    if (!Number.isFinite(y)) return 0;
    const s = y < 0 ? -1 : 1;
    const ay = Math.abs(y);
    return s * k * (Math.expm1(ay));
  };

  const formatPct = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 100000) return `${Math.round(v).toLocaleString()}%`;
    if (abs >= 1000) return `${Math.round(v)}%`;
    if (abs >= 100) return `${Math.round(v * 10) / 10}%`;
    return `${Math.round(v * 10) / 10}%`;
  };

  const calculateSymlogTicks = () => {
    const ticks: number[] = [];
    const divisions = 5;
    const stepT = yRangeT / divisions;

    for (let i = 0; i <= divisions; i++) {
      const t = yMinT + stepT * i;
      const raw = symlogInverse(t, SYMLOG_K);
      // 让 0 更“粘”在刻度上
      const snapped = Math.abs(raw) < 0.0001 ? 0 : raw;
      // 小数保留 1 位（ROI 常见口径），大值直接整数
      const rounded = Math.abs(snapped) >= 100 ? Math.round(snapped) : (Math.round(snapped * 10) / 10);
      ticks.push(rounded);
    }

    // 若 0 不在 ticks 中，且范围跨越 0，则强制插入 0
    const crossesZero = yAxisMin < 0 && yAxisMax > 0;
    if (crossesZero && !ticks.some(v => v === 0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }

    return ticks;
  };

  const yAxisTicks = calculateSymlogTicks();

  // Generate Smooth Path
  const generatePath = (data: any[]) => {
    return data.reduce((acc, point, i) => {
      const x = i * xStep; // Start at 0
      const y = getY(point.value);
      if (i === 0) return `M ${x} ${y}`;
      const prev = data[i - 1];
      const prevX = (i - 1) * xStep;
      const prevY = getY(prev.value);
      const cp1x = prevX + xStep / 2;
      const cp1y = prevY;
      const cp2x = x - xStep / 2;
      const cp2y = y;
      return `${acc} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y}`;
    }, '');
  };

  return (
  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
    {/* Platform Statistics Section */}
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { fontSize: 14, fontWeight: '600' }]}>{t('homePage.platformOverview')}</Text>
      </View>
    </View>

    {/* Statistics Section - 3 columns 2 rows */}
    <View style={styles.statsContainer}>
      <View style={styles.statItemGrid}>
        <Text style={styles.statValue}>{platformStats.todaySignalCount}</Text>
        <Text style={styles.statLabelSmall}>{t('homePage.todaySignals')}</Text>
      </View>
      <View style={styles.statItemGrid}>
        <Text style={styles.statValue}>{platformStats.longSignalCount}</Text>
        <Text style={styles.statLabelSmall}>{t('homePage.longSignals')}</Text>
      </View>
      <View style={styles.statItemGrid}>
        <Text style={styles.statValue}>{platformStats.shortSignalCount}</Text>
        <Text style={styles.statLabelSmall}>{t('homePage.shortSignals')}</Text>
      </View>
      <View style={styles.statItemGrid}>
        <Text style={styles.statValue}>{platformStats.activeTraderCount}</Text>
        <Text style={styles.statLabelSmall}>{t('homePage.activeTraders')}</Text>
      </View>
      <View style={styles.statItemGrid}>
        <Text style={styles.statValue}>{followCount}</Text>
        <Text style={styles.statLabelSmall}>{t('homePage.followedTraders')}</Text>
      </View>
      <View style={styles.statItemGrid}>
        <Text style={styles.statValue}>{platformStats.tradingPairCount}</Text>
        <Text style={styles.statLabelSmall}>{t('homePage.tradingPairs')}</Text>
      </View>
    </View>

    {/* Profit Trend Section - 暂时隐藏 */}
    {false && (
    <View style={styles.card}>
      <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>收益走势</Text>
      
      <View style={styles.timeFilter}>
        {['近一周', '近一月'].map((filter) => (
          <TouchableOpacity 
            key={filter}
            style={timeFilter === filter ? styles.timeBtnActive : styles.timeBtn}
            onPress={() => setTimeFilter(filter)}
          >
            <Text style={timeFilter === filter ? styles.timeBtnTextActive : styles.timeBtnText}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 12, marginBottom: 12 }}>
        {traders.map((trader, index) => {
          const isHidden = hiddenTraders.includes(trader.name);
          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.chartLegend, { opacity: isHidden ? 0.5 : 1 }]}
              onPress={() => toggleTrader(trader.name)}
            >
              <View style={[styles.legendColor, { backgroundColor: trader.color }]} />
              <Text style={styles.legendText}>{trader.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.chartHeader}>
        <Text style={styles.chartLabel}>累计收益率(%)（压缩刻度）</Text>
      </View>

      {/* 加载状态 */}
      {trendLoading && (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}>加载中...</Text>
        </View>
      )}

      {/* 空数据状态 */}
      {!trendLoading && traders.length === 0 && (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>暂无收益数据</Text>
        </View>
      )}

      {/* 图表 */}
      {!trendLoading && traders.length > 0 && (
      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {/* Dynamic Y-Axis Labels using smart ticks */}
          {yAxisTicks.map((tick) => (
            <Text
              key={`tick-${tick}`}
              style={[
                styles.axisText,
                {
                  position: 'absolute',
                  top: getY(tick) - 6,
                  color: tick === 0 ? COLORS.textMain : COLORS.textMuted
                }
              ]}
            >
              {formatPct(tick)}
            </Text>
          ))}
        </View>
        
        <ChartErrorBoundary>
          <View style={styles.chartArea}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ width: chartWidth, height: chartHeight }}>
                <Svg height="100%" width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  <Defs>
                    <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.3" />
                      <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0" />
                    </LinearGradient>
                  </Defs>

                  {/* Zero Line */}
                  {yAxisMin < 0 && (
                    <Path
                      d={`M 0 ${getY(0)} L ${chartWidth} ${getY(0)}`}
                      stroke={COLORS.textMuted}
                      strokeWidth="1"
                      strokeDasharray="5, 5"
                      opacity="0.3"
                    />
                  )}

                  {/* Lines */}
                  {traders.map((trader, index) => {
                    if (hiddenTraders.includes(trader.name)) return null;
                    return (
                      <Path
                        key={`line-${index}`}
                        d={generatePath(trader.data)}
                        fill="none"
                        stroke={trader.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  {/* Avatars at the end of each line */}
                  {traders.map((trader, index) => {
                    if (hiddenTraders.includes(trader.name)) return null;
                    const lastPoint = trader.data[trader.data.length - 1];
                    const i = trader.data.length - 1;
                    const x = i * xStep;
                    const y = getY(lastPoint.value);

                    return (
                      <G key={`avatar-${index}`}>
                        {/* Avatar Border */}
                        <Circle
                          cx={x}
                          cy={y}
                          r={14}
                          fill={COLORS.surface}
                          stroke={trader.color}
                          strokeWidth={2}
                        />

                        {/* Avatar Image with ClipPath */}
                        <Defs>
                          <ClipPath id={`clip-trader-${index}`}>
                            <Circle cx={x} cy={y} r={12} />
                          </ClipPath>
                        </Defs>
                        <SvgImage
                          x={x - 12}
                          y={y - 12}
                          width={24}
                          height={24}
                          href={{ uri: trader.avatar }}
                          clipPath={`url(#clip-trader-${index})`}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      </G>
                    );
                  })}

                  {/* X Axis Labels inside ScrollView */}
                  {traders[0].data.map((point, i) => (
                    <SvgText
                      key={`label-${i}`}
                      x={i * xStep}
                      y={chartHeight - 5}
                      fill={COLORS.textMuted}
                      fontSize="10"
                      textAnchor={i === 0 ? "start" : i === traders[0].data.length - 1 ? "end" : "middle"}
                    >
                      {point.date}
                    </SvgText>
                  ))}
                </Svg>
              </View>
            </ScrollView>
          </View>
        </ChartErrorBoundary>
      </View>
      )}
    </View>
    )}

    {/* Leaderboard Section */}
    <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 24 }}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { fontSize: 14, fontWeight: '600' }]}>{t('homePage.leaderboard')}</Text>
        <TouchableOpacity onPress={onMorePress}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>{t('homePage.more')} {'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.leaderboardList}>
        {leaderboardLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : leaderboardData.length > 0 ? (
          leaderboardData.map((trader, index) => (
            <LeaderboardItem
              key={trader.id}
              rank={index + 1}
              traderId={trader.id}
              name={trader.name}
              roi={trader.total_roi !== undefined ? `${trader.total_roi > 0 ? '+' : ''}${trader.total_roi.toFixed(2)}%` : '0.00%'}
              avatar={trader.avatar_url || 'https://randomuser.me/api/portraits/men/1.jpg'}
              isTop={index === 0}
              initialIsSubscribed={!!trader.is_subscribed}
              initialIsFavorite={!!trader.is_followed}
              onSubscriptionChange={handleSubscriptionChange}
              onFavoriteChange={handleFavoriteChange}
            />
          ))
        ) : (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textMuted }}>暂无数据</Text>
          </View>
        )}
      </View>
    </View>
  </ScrollView>
  );
};

interface TabContentProps {
  activeFilters: string[];
  setActiveFilters: (filters: string[]) => void;
  refreshTrigger?: number; // 用于外部触发刷新
  currentTab?: 'overview' | 'copy' | 'signal'; // 当前激活的标签
}

// 生成SVG图表路径的辅助函数
const generateChartPath = (trendData: Array<{ date: string; roi: number }>) => {
  if (!trendData || trendData.length === 0) {
    return "M 0,20 L 100,20"; // 无数据显示直线
  }

  // 计算ROI范围用于归一化
  const rois = trendData.map(d => d.roi);
  const maxRoi = Math.max(...rois);
  const minRoi = Math.min(...rois);
  const range = maxRoi - minRoi;

  // 计算每个点的坐标
  const points = trendData.map((data, index) => {
    const x = (index / (trendData.length - 1)) * 100;
    
    // Y轴倒置(SVG坐标系), 归一化到5-35范围(留出边距)
    let normalizedY = 0.5; // 默认居中
    if (range > 0) {
      normalizedY = (data.roi - minRoi) / range;
    }
    
    const y = 35 - (normalizedY * 30);
    return { x, y };
  });

  // 生成平滑曲线路径
  if (points.length === 1) {
    return `M ${points[0].x},${points[0].y} L ${points[0].x},${points[0].y}`;
  }

  let path = `M ${points[0].x},${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    // 使用二次贝塞尔曲线进行平滑
    const controlX = (current.x + next.x) / 2;
    const controlY = (current.y + next.y) / 2;
    
    path += ` Q ${controlX},${current.y} ${(current.x + next.x) / 2},${controlY}`;
    path += ` T ${next.x},${next.y}`;
  }
  
  return path;
};

const TradersTabContent = ({ activeFilters, setActiveFilters, currentTab = 'copy' }: TabContentProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useSettings();
  const { t } = useTranslation();
  // 更新筛选条件
  const filters = [
    t('homePage.sortByRoi'),
    t('homePage.sortByWinRate'),
    t('homePage.followed')
  ];
  const [traders, setTraders] = useState<TraderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribedTraders, setSubscribedTraders] = useState<Set<string>>(new Set());
  const [followedTraders, setFollowedTraders] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false); // 添加加载状态标志
  const [traderTrendData, setTraderTrendData] = useState<Map<string, Array<{ date: string; roi: number }>>>(new Map());
  const PAGE_SIZE = 10; // 每页10条交易员数据

  // 当筛选条件变化时，重新加载数据
  useEffect(() => {
    if (currentTab === 'copy') {
      console.log('🔄 [TradersTabContent] 筛选条件变化，重新加载:', activeFilters);
      loadTraders(true);
    }
  }, [activeFilters]);

  // 【优化】批量加载交易员的7天趋势数据 (ROI)
  const loadTrendDataForTraders = async (traders: TraderWithStats[]) => {
    if (traders.length === 0) return;
    
    try {
      // 提取所有交易员ID
      const traderIds = traders.map(t => t.id);
      
      // 批量查询 - 只需1次RPC调用!
      const trendMap = await getMultipleTradersRoiTrend(traderIds, 7);
      
      // 更新状态
      setTraderTrendData(prevMap => {
        const newMap = new Map(prevMap);
        trendMap.forEach((value, key) => {
          newMap.set(key, value);
        });
        return newMap;
      });
      
      console.log('✅ 成功批量加载', trendMap.size, '个交易员的 ROI 趋势数据');
    } catch (error) {
      console.error('批量加载 ROI 趋势数据失败:', error);
    }
  };

  // 【优化】加载交易员数据和用户的订阅/关注状态
  // 使用分页加载，每次加载20条
  const loadTraders = async (reset: boolean = false, isRefreshing: boolean = false) => {
    // 防止重复请求
    if (isLoadingData && !isRefreshing) {
      console.log('⚠️ [TradersTabContent] 正在加载中，跳过重复请求');
      return;
    }

    try {
      setIsLoadingData(true); // 设置加载状态
      
      if (reset) {
        // 下拉刷新时不设置 loading，只设置 refreshing
        if (!isRefreshing) {
          setLoading(true);
        }
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const offset = reset ? 0 : (currentPage - 1) * PAGE_SIZE;
      
      console.log('🔍 [TradersTabContent] 加载交易员，筛选条件:', activeFilters);

      // 解析筛选条件
      const sortByRoi = activeFilters.includes(t('homePage.sortByRoi'));
      const sortByWinRate = activeFilters.includes(t('homePage.sortByWinRate'));
      const filterSubscribed = activeFilters.includes(t('homePage.subscribed'));
      const filterFollowed = activeFilters.includes(t('homePage.followed'));

      // 使用新的 RPC 函数：getTradersWithStats，传入筛选参数
      const tradersWithStatus = await getTradersWithStats(
        user?.id,
        PAGE_SIZE,
        offset,
        {
          sortByRoi: sortByRoi,
          sortByWinRate: sortByWinRate,
          filterSubscribed: filterSubscribed,
          filterFollowed: filterFollowed
        }
      );
      
      // 判断是否还有更多数据
      const hasMoreData = tradersWithStatus.length === PAGE_SIZE;
      setHasMore(hasMoreData);

      if (reset) {
        setTraders(tradersWithStatus);
      } else {
        // 追加数据并去重
        const existingIds = new Set(traders.map(t => t.id));
        const newTraders = tradersWithStatus.filter(t => !existingIds.has(t.id));
        setTraders([...traders, ...newTraders]);
      }
      
      // 提取订阅和关注状态
      const subscribed = new Set<string>();
      const followed = new Set<string>();
      
      tradersWithStatus.forEach(trader => {
        if (trader.is_subscribed) subscribed.add(trader.id);
        if (trader.is_followed) followed.add(trader.id);
      });
      
      setSubscribedTraders(subscribed);
      setFollowedTraders(followed);

      // 加载每个交易员的7天趋势数据
      loadTrendDataForTraders(tradersWithStatus);

      if (!reset) {
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('加载交易员数据失败:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      setIsLoadingData(false); // 重置加载状态
    }
  };

  // 组件挂载时加载数据 - 只在当前标签是 copy 时才加载
  useEffect(() => {
    if (currentTab === 'copy' && !isLoadingData) {
      console.log('🟢 [TradersTabContent] 组件挂载或标签切换，开始加载交易员列表');
      loadTraders(true);
    }
  }, [currentTab]);

  // 监听 Supabase Realtime 变更 (实时更新交易员列表数据)
  useEffect(() => {
    // 仅在当前标签为 'copy' 时监听
    if (currentTab !== 'copy') return;

    console.log('🔌 [Realtime] 正在订阅交易员列表变更...');
    
    // 智能判断是否需要刷新交易员列表
    const checkIfShouldRefreshTradersList = (eventType: string, newData: any, oldData?: any): boolean => {
      // INSERT: 新交易员必须 is_visible = true 才需要刷新
      if (eventType === 'INSERT') {
        const shouldRefresh = newData.is_visible === true;
        console.log('📊 [Realtime] INSERT事件:', {
          trader_name: newData.name,
          is_visible: newData.is_visible,
          shouldRefresh
        });
        return shouldRefresh;
      }

      // DELETE: 任何交易员删除都需要刷新列表
      if (eventType === 'DELETE') {
        console.log('📊 [Realtime] DELETE事件: 交易员被删除，需要刷新列表');
        return true;
      }

      // UPDATE: 检查关键字段变化
      if (eventType === 'UPDATE' && oldData) {
        // is_visible 改变
        const visibilityChanged = newData.is_visible !== oldData.is_visible;
        
        // total_roi 改变（影响排序）
        const roiChanged = newData.total_roi !== oldData.total_roi;
        
        // win_rate 改变（影响排序）
        const winRateChanged = newData.win_rate !== oldData.win_rate;
        
        // 显示字段改变（name, avatar_url, description等）
        const displayFieldsChanged = 
          newData.name !== oldData.name ||
          newData.avatar_url !== oldData.avatar_url ||
          newData.description !== oldData.description ||
          newData.is_online !== oldData.is_online ||
          newData.is_online_today !== oldData.is_online_today;

        const shouldRefresh = visibilityChanged || roiChanged || winRateChanged || displayFieldsChanged;
        
        console.log('📊 [Realtime] UPDATE事件:', {
          trader_name: newData.name,
          visibilityChanged,
          roiChanged,
          winRateChanged,
          displayFieldsChanged,
          shouldRefresh
        });
        
        return shouldRefresh;
      }

      return false;
    };

    const subscription = supabase
      .channel('traders-list-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件
          schema: 'public',
          table: 'traders',
        },
        (payload: any) => {
          console.log('⚡️ [Realtime] 收到交易员表变更事件:', payload.eventType);
          
          // 智能判断是否需要刷新
          const shouldRefresh = checkIfShouldRefreshTradersList(
            payload.eventType,
            payload.new,
            payload.old
          );

          if (shouldRefresh) {
            console.log('🔄 [Realtime] 触发交易员列表刷新');
            // 重新加载列表以保持正确的排序和分页
            loadTraders(true);
          } else {
            console.log('⏭️ [Realtime] 无需刷新交易员列表（无关键字段变化）');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [Realtime] 取消订阅交易员列表变更');
      supabase.removeChannel(subscription);
    };
  }, [currentTab, activeFilters]);

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    await loadTraders(true, true);
  };

  // 滚动到底部加载更多
  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadTraders(false);
    }
  };

  // 当用户订阅/取消订阅后刷新状态
  const handleSubscriptionChange = async () => {
    if (!user?.id) return;
    // 如果当前启用了筛选"已订阅"，则可能需要刷新列表移除该项
    if (activeFilters.includes(t('homePage.subscribed'))) {
       loadTraders(true); // 重新加载以更新列表
    } else {
        // 仅刷新状态集合
        try {
            const subscribed = await getSubscribedTraders(user.id);
            setSubscribedTraders(new Set(subscribed.map(item => item.trader_id)));
        } catch (error) {
            console.error('刷新订阅状态失败:', error);
        }
    }
  };

  // 当用户关注/取消关注后刷新状态
  const handleFavoriteChange = async () => {
    if (!user?.id) return;
    // 如果当前启用了筛选"已关注"，则可能需要刷新列表移除该项
    if (activeFilters.includes(t('homePage.followed'))) {
        loadTraders(true);
    } else {
        try {
          const followed = await getFollowedTraders(user.id);
          setFollowedTraders(new Set(followed.map(item => item.trader_id)));
        } catch (error) {
          console.error('刷新关注状态失败:', error);
        }
    }
  };

  const handleFilterPress = (filter: string) => {
    let newFilters = [...activeFilters];

    const sortByRoi = t('homePage.sortByRoi');
    const sortByWinRate = t('homePage.sortByWinRate');

    if (filter === sortByRoi) {
        if (newFilters.includes(sortByRoi)) {
             // 如果已经选中，且没有选中其他排序，则不能取消（至少保持一个排序? 或者允许无排序默认ROI）
             // 策略：允许取消，取消后相当于无显式排序(RPC默认ROI)
             newFilters = newFilters.filter(f => f !== sortByRoi);
        } else {
             // 选中ROI，取消胜率（互斥）
             newFilters = newFilters.filter(f => f !== sortByWinRate);
             newFilters.push(sortByRoi);
        }
    } else if (filter === sortByWinRate) {
        if (newFilters.includes(sortByWinRate)) {
             newFilters = newFilters.filter(f => f !== sortByWinRate);
        } else {
             // 选中胜率，取消ROI（互斥）
             newFilters = newFilters.filter(f => f !== sortByRoi);
             newFilters.push(sortByWinRate);
        }
    } else {
        // 处理 Subscribed / Followed，普通 Toggle
        if (newFilters.includes(filter)) {
            newFilters = newFilters.filter(f => f !== filter);
        } else {
            newFilters.push(filter);
        }
    }

    // 更新筛选状态，useEffect 会监听到变化并触发 loadTraders
    setActiveFilters(newFilters);
  };

  const getRoiLabel = () => {
    return '信号总数';
  };

  // 检查是否滚动到底部
  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    const paddingToBottom = 20;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };
  
  return (
  <View style={{ flex: 1 }}>
    {/* Fixed Filter Bar */}
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: COLORS.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flex: 1 }}>
        {filters.map((filter) => {
          const isActive = activeFilters.includes(filter);
          return (
          <TouchableOpacity 
            key={filter} 
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: isActive ? COLORS.surfaceLight : 'transparent',
              borderWidth: 1,
              borderColor: isActive ? COLORS.primary : COLORS.border,
            }}
            onPress={() => handleFilterPress(filter)}
          >
            <Text style={{
              color: isActive ? COLORS.primary : COLORS.textMuted,
              fontSize: 12,
              fontWeight: isActive ? 'bold' : 'normal',
            }}>{filter}</Text>
          </TouchableOpacity>
        )})}
      </ScrollView>
      <TouchableOpacity style={{ padding: 4 }} onPress={() => router.push('/search')}>
        <MaterialIcons name="search" size={24} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>

    {/* Scrollable Content */}
    <ScrollView 
      style={{ flex: 1 }} 
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
          handleLoadMore();
        }
      }}
      scrollEventThrottle={400}
    >
      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : traders.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>{t('homePage.noTraders')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.traderList}>
            {traders.map((trader) => (
              <TraderCard
                key={trader.id}
                traderId={trader.id}
                roiLabel={t('traderCard.totalRoi')}
                name={trader.name}
                avatar={trader.avatar_url}
                description={trader.description}
                initialIsSubscribed={subscribedTraders.has(trader.id)}
                initialIsFavorite={followedTraders.has(trader.id)}
                onSubscriptionChange={handleSubscriptionChange}
                onFavoriteChange={handleFavoriteChange}
                // 使用真实数据库数据
                followers={trader.followers_count || 0}
                maxFollowers={100}
                roi={trader.total_roi !== undefined && trader.total_roi !== null ? `${trader.total_roi > 0 ? '+' : ''}${trader.total_roi.toFixed(2)}%` : '0.00%'}
                pnl=""
                winRate={trader.win_rate !== undefined && trader.win_rate !== null ? `${trader.win_rate.toFixed(1)}%` : '-'}
                aum={trader.profit_factor ? trader.profit_factor.toFixed(2) : '0'}
                aumLabel={t('traderCard.profitFactor')}
                days={trader.trading_days || 0}
                coins={[
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuATVNwivtQOZ2npc_w1PrcrX_4y17f4sOiNkn0PcY8zqp0YLkQ3QuxIkuDHNbTjM1ZyrnwY3GKd7UVSYfoETg68d3DNq3yliS1uwFDzri7UqYgzB5fN2Ju5KYY8plwkhuhEWVym03IBsLlyKhgTloiJKTujcHXIe_z-lpDvnkbxcYGocB5nfG-PQGKRLQ1b7pknYTUavPCwz1iU0-cRBaTMqb597A3OgbOCuT2YYwBSVl3V5yGQaMdwr6lBh9K9vzREuJyuOGn7Tg",
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuBqVLgtNIEpUr5EnOPS_CgkITlq0vVjaigO9jnxDPyQnAokTkWkEOTGXrlpCYF9sNvRwze7xjCTLCxaNfb3DiTbcvBgZhA5rJt4lyW5zxbfuPyai7ANHCgpXluqDnWr9ATykGdJ9X5sTLPyJND5T5bvWN7ciyMIvkT-OAUvZG8khWTSrhiGjPrSs-AL0ZpdNIzo2pRweRiGqFRbsmXXfg4024-qe1haFHvijyQhWvK--a2M_RHLjsnDeVusKni_aeEZwEa9cuvmxA",
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuAEcAV67993OCt0DPtM2p8O2VOufk16pTKp8rXdxYzZU8G7G59l0CDW4oL01HveVAtNT8Kh31Z9GKhffkuQDVAasrQHuE6ebVN23WctH5f7nUebYYIynGAqCZBHm1obLP8vwJwmcWrJZWa6EMfh2j2DJYl9_nwAh14I6lW2R3ZM_WibvUnRtI2a_v96J6JPW2yEh_yFxhIxz-NjuG02m8tjKWN6rti6CP0T5pyv_yhFsEtAHivwBNN7IhN3qg66P95nZngpHi5fcQ"
                ]}
                chartPath={generateChartPath(traderTrendData.get(trader.id) || [])}
                statusColor={trader.is_online ? COLORS.primary : COLORS.yellow}
                onPress={() => router.push({
                  pathname: '/trader/detail',
                  params: { 
                    traderId: trader.id
                  }
                })}
              />
            ))}
          </View>
          
          {/* 加载更多指示器 */}
          {loadingMore && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}>
                {t('homePage.loading')}
              </Text>
            </View>
          )}

          {/* 没有更多数据提示 */}
          {!hasMore && traders.length > 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                {t('homePage.noMoreData')}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  </View>
  );
};

const SignalTabContent = ({ activeFilters, setActiveFilters, refreshTrigger, currentTab = 'signal' }: TabContentProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { timezone } = useSettings();
  const { t } = useTranslation();
  // 更新筛选条件：全部、做多、做空、已关注
  const filters = [
    t('homePage.all'),
    t('homePage.long'),
    t('homePage.short'),
    t('homePage.followed')
  ];
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadedCount, setLoadedCount] = useState(0);
  const [showLoadedMessage, setShowLoadedMessage] = useState(false);
  const PAGE_SIZE = 20;
  const [isLoadingData, setIsLoadingData] = useState(false); // 添加加载状态标志，防止重复请求
  
  // Copy Modal 状态
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  
  // 默认头像 - 简单的灰色圆形头像 (1x1 像素的灰色图片 base64)
  const DEFAULT_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mM8/x8AAn8B9h12xqwAAAAASUVORK5CYII=';

  // 合并所有加载逻辑到一个 useEffect，避免重复触发
  useEffect(() => {
    // 只在当前是 signal 标签且没有正在加载时才执行
    if (currentTab === 'signal' && !isLoadingData) {
      console.log('🔵 [SignalTab] 标签激活或筛选条件变化，加载信号');
      loadSignals(true);
    }
  }, [activeFilters, currentTab, refreshTrigger]);

  // 注释掉独立的 refreshTrigger useEffect，已合并到上面
  // useEffect(() => {
  //   if (refreshTrigger && refreshTrigger > 0 && currentTab === 'signal' && !isLoadingData) {
  //     console.log('🔵 [SignalTab] 外部触发刷新');
  //     loadSignals(true);
  //   }
  // }, [refreshTrigger, currentTab]);

  // 当页面获得焦点时刷新数据 - 确保每次切换到主Tab时都刷新
  // 注释掉这个，因为已经有 currentTab 变化的监听了
  // useFocusEffect(
  //   React.useCallback(() => {
  //     // 只在用户已登录且当前在 signal 标签时刷新
  //     if (user?.id && currentTab === 'signal') {
  //       console.log('🔵 [SignalTab] 页面获得焦点，刷新数据');
  //       loadSignals(true);
  //     }
  //   }, [user?.id, currentTab])
  // );

  const loadSignals = async (reset: boolean = false, isRefreshing: boolean = false) => {
    // 防止重复请求
    if (isLoadingData && !isRefreshing) {
      console.log('⚠️ [SignalTab] 正在加载中，跳过重复请求');
      return;
    }

    try {
      setIsLoadingData(true); // 设置加载状态
      
      if (reset) {
        // 下拉刷新时不设置 loading，只设置 refreshing
        if (!isRefreshing) {
          setLoading(true);
        }
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const offset = reset ? 0 : (currentPage - 1) * PAGE_SIZE;
      let data: Signal[] = [];

      // 检查筛选条件
      const hasLong = activeFilters.includes(t('homePage.long'));
      const hasShort = activeFilters.includes(t('homePage.short'));
      const hasSubscribed = activeFilters.includes(t('homePage.subscribed'));
      const hasFollowed = activeFilters.includes(t('homePage.followed'));

      // 根据筛选条件获取信号 - 使用新的 RPC 函数
      let direction: 'long' | 'short' | undefined = undefined;
      if (hasLong && !hasShort) {
        direction = 'long';
      } else if (hasShort && !hasLong) {
        direction = 'short';
      }

      // 使用新的 getSignalsWithTraders RPC 函数，直接在数据库层面筛选已关注
      data = await SignalService.getSignalsWithTraders(
        'active',
        direction,
        undefined, // signal_type
        PAGE_SIZE,
        offset,
        user?.id, // 传入用户ID
        hasFollowed // 是否筛选已关注的交易员
      );

      // 如果需要筛选已订阅的交易员（前端筛选）
      if (hasSubscribed && user?.id) {
        const subscribedTraders = await getSubscribedTraders(user.id);
        const subscribedTraderIds = subscribedTraders.map(item => item.trader_id);
        if (subscribedTraderIds.length > 0) {
          data = data.filter(signal => subscribedTraderIds.includes(signal.trader_id));
        }
      }

      // 判断是否还有更多数据
      const hasMoreData = data.length === PAGE_SIZE;
      setHasMore(hasMoreData);

      if (reset) {
        setSignals(data);
        setLoadedCount(data.length);
      } else {
        // 追加数据并去重
        const existingIds = new Set(signals.map(s => s.id));
        const newSignals = data.filter(s => !existingIds.has(s.id));
        setSignals([...signals, ...newSignals]);
        setLoadedCount(signals.length + newSignals.length);
      }

      if (!reset) {
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('加载信号失败:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsLoadingData(false); // 重置加载状态
    }
  };

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    setShowLoadedMessage(false);
    await loadSignals(true, true); // 传递 isRefreshing = true
    setRefreshing(false);
    // 显示加载完成消息
    setShowLoadedMessage(true);
    setTimeout(() => {
      setShowLoadedMessage(false);
    }, 2000);
  };

  // Web端滚动处理 - 检测下拉手势
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    
    // 当滚动到顶部并继续下拉时触发刷新
    if (contentOffset.y < -50 && !refreshing && !loading) {
      onRefresh();
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadSignals(false);
    }
  };

  // 打开Copy Modal
  const handleCopySignal = (signal: Signal) => {
    setSelectedSignal(signal);
    setShowCopyModal(true);
  };

  // 确认Copy
  const handleConfirmCopy = (editedData: { entryPrice: string; takeProfit: string; stopLoss: string }) => {
    // TODO: 实现实际的copy功能，比如复制到剪贴板或提交到交易所
    console.log('确认Copy:', {
      signal: selectedSignal,
      editedData,
    });
  };

  const handleFilterPress = (filter: string) => {
    const allFilter = t('homePage.all');
    const longFilter = t('homePage.long');
    const shortFilter = t('homePage.short');

    if (filter === allFilter) {
      setActiveFilters([allFilter]);
      return;
    }

    let newFilters = [...activeFilters];
    if (newFilters.includes(allFilter)) {
      newFilters = newFilters.filter(f => f !== allFilter);
    }

    // 处理做多/做空的互斥逻辑
    if (filter === longFilter || filter === shortFilter) {
      // 如果点击做多，移除做空；如果点击做空，移除做多
      const oppositeFilter = filter === longFilter ? shortFilter : longFilter;
      newFilters = newFilters.filter(f => f !== oppositeFilter);

      // 切换当前筛选项
      if (newFilters.includes(filter)) {
        newFilters = newFilters.filter(f => f !== filter);
      } else {
        newFilters.push(filter);
      }
    } else {
      // 处理"已关注"等其他筛选项，可以独立切换
      if (newFilters.includes(filter)) {
        newFilters = newFilters.filter(f => f !== filter);
      } else {
        newFilters.push(filter);
      }
    }

    // 如果没有任何筛选项，恢复为"全部"
    if (newFilters.length === 0) {
      setActiveFilters([allFilter]);
    } else {
      setActiveFilters(newFilters);
    }
  };

  const getRoiLabel = () => {
    return '信号总数';
  };
  
  return (
  <View style={{ flex: 1 }}>
    {/* Fixed Filter Bar - 移除了 borderBottomWidth 和 borderBottomColor */}
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: COLORS.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flex: 1 }}>
        {filters.map((filter) => {
          const isActive = activeFilters.includes(filter);
          return (
          <TouchableOpacity 
            key={filter} 
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: isActive ? COLORS.surfaceLight : 'transparent',
              borderWidth: 1,
              borderColor: isActive ? COLORS.primary : COLORS.border,
            }}
            onPress={() => handleFilterPress(filter)}
          >
            <Text style={{
              color: isActive ? COLORS.primary : COLORS.textMuted,
              fontSize: 12,
              fontWeight: isActive ? 'bold' : 'normal',
            }}>{filter}</Text>
          </TouchableOpacity>
        )})}
      </ScrollView>
    </View>

    {/* 加载完成提示 */}
    {showLoadedMessage && (
      <View style={{
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
      }}>
        <View style={{
          backgroundColor: 'rgba(22, 22, 22, 0.95)',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(46, 189, 133, 0.3)',
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
          <Text style={{
            fontSize: 14,
            color: COLORS.primary,
            marginLeft: 8,
            fontWeight: '500',
          }}>
            {t('homePage.loadedCount', { count: loadedCount })}
          </Text>
        </View>
      </View>
    )}

    {/* 下拉刷新加载中提示 */}
    {refreshing && (
      <View style={{
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: COLORS.background,
      }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={{
          color: COLORS.primary,
          fontSize: 12,
          marginTop: 8,
        }}>
          {t('homePage.chartLoading')}
        </Text>
      </View>
    )}

    {/* Scrollable Content */}
    <ScrollView 
      style={{ flex: 1 }} 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
      refreshControl={
        Platform.OS === 'web' ? undefined : (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={COLORS.surface}
          />
        )
      }
      onScroll={Platform.OS === 'web' ? handleScroll : undefined}
      scrollEventThrottle={Platform.OS === 'web' ? 16 : undefined}
    >
      <View style={styles.traderList}>
      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : signals.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: COLORS.textMuted }}>{t('homePage.noSignals')}</Text>
        </View>
      ) : (
        <>
          {signals.map((signal) => {
            // RPC函数返回的是扁平化的数据结构，字段名为 trader_name, trader_avatar_url 等
            const signalWithTrader = signal as any;
            
            // 渲染单个信号卡片 - 与交易员详情页样式一致
            const isLong = signal.direction === 'long';
            const statusBgColor = isLong ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)';
            const statusTextColor = isLong ? COLORS.primary : COLORS.danger;
            
            // 计算盈亏比
            const entryPrice = parseFloat(signal.entry_price);
            const takeProfit = parseFloat(signal.take_profit);
            const stopLoss = parseFloat(signal.stop_loss);
            
            let profitLossRatio = '0:0';
            if (isLong) {
              const profit = takeProfit - entryPrice;
              const loss = entryPrice - stopLoss;
              if (loss > 0) {
                profitLossRatio = `${(profit / loss).toFixed(2)}:1`;
              }
            } else {
              const profit = entryPrice - takeProfit;
              const loss = stopLoss - entryPrice;
              if (loss > 0) {
                profitLossRatio = `${(profit / loss).toFixed(2)}:1`;
              }
            }

            // 格式化时间 - 使用时区工具
            const formatTime = (dateString: string) => {
              return formatDateTime(dateString, timezone.offset, 'full');
            };

            // 信号类型显示
            const signalTypeText = signal.signal_type === 'spot' ? t('homePage.spot') :
                                  signal.signal_type === 'futures' ? t('homePage.futures') : t('homePage.leverage');

            return (
              <View key={signal.id} style={styles.signalCard}>
                {/* 交易员信息头部 */}
                <View style={styles.signalTraderHeader}>
                  <TouchableOpacity 
                    style={styles.signalTraderInfo}
                    activeOpacity={0.8}
                    onPress={() => router.push({
                      pathname: '/trader/detail',
                      params: { 
                        traderId: signal.trader_id
                      }
                    })}
                  >
                    <View style={styles.signalTraderAvatarContainer}>
                      <Image 
                        source={{ uri: signalWithTrader.trader_avatar_url || DEFAULT_AVATAR }}
                        style={styles.signalTraderAvatar}
                      />
                      <View style={styles.signalOnlineIndicator} />
                    </View>
                    <View style={styles.signalTraderTextContainer}>
                      <Text style={styles.signalTraderName}>{signalWithTrader.trader_name || t('homePage.unknownTrader')}</Text>
                      <Text style={styles.signalTraderDesc} numberOfLines={1}>
                        {signalWithTrader.trader_description || t('homePage.professionalTrader')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Copy 按钮 - 暂时隐藏 */}
                  {false && (
                    <TouchableOpacity
                      style={styles.signalCopyButton}
                      onPress={() => handleCopySignal(signal)}
                    >
                      <Text style={styles.signalCopyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 信号详情 */}
                <View style={styles.signalDetailBox}>
                  <View style={styles.signalCardHeader}>
                    <Text style={styles.signalPairText}>{signal.currency} {signalTypeText}</Text>
                    <View style={[styles.signalStatusTag, { backgroundColor: statusBgColor }]}>
                      <Text style={[styles.signalStatusText, { color: statusTextColor }]}>
                        {isLong ? t('homePage.long') : t('homePage.short')}
                      </Text>
                    </View>
                    <View style={[styles.signalLeverageTag, { marginRight: 'auto' }]}>
                      <Text style={styles.signalLeverageText}>{signal.leverage.replace(/x$/i, '')}x</Text>
                    </View>
                  </View>

                  <View style={styles.signalInfoGrid}>
                    <View style={styles.signalGridItem}>
                      <Text style={styles.signalInfoLabel}>{t('homePage.entryPrice')}</Text>
                      <Text style={styles.signalInfoValue}>{signal.entry_price}</Text>
                    </View>
                    <View style={styles.signalGridItem}>
                      <Text style={styles.signalInfoLabel}>{t('homePage.positionMode')}</Text>
                      <Text style={styles.signalInfoValue}>{t('homePage.fullPosition')}</Text>
                    </View>
                    <View style={styles.signalGridItem}>
                      <Text style={styles.signalInfoLabel}>{t('homePage.orderTime')}</Text>
                      <Text style={styles.signalInfoValue}>{formatTime(signal.signal_time)}</Text>
                    </View>
                  </View>

                  <View style={styles.signalInfoGrid}>
                    <View style={styles.signalGridItem}>
                      <Text style={styles.signalInfoLabel}>{t('homePage.takeProfitPrice')}</Text>
                      <Text style={[styles.signalInfoValue, { color: COLORS.primary }]}>{signal.take_profit}</Text>
                    </View>
                    <View style={styles.signalGridItem}>
                      <Text style={styles.signalInfoLabel}>{t('homePage.stopLossPrice')}</Text>
                      <Text style={[styles.signalInfoValue, { color: COLORS.danger }]}>{signal.stop_loss}</Text>
                    </View>
                    <View style={styles.signalGridItem}>
                      <Text style={styles.signalInfoLabel}>{t('homePage.profitLossRatio')}</Text>
                      <Text style={[styles.signalInfoValue, { color: COLORS.yellow }]}>{profitLossRatio}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
          
          {/* 加载更多按钮/指示器 */}
          {hasMore && (
            <TouchableOpacity 
              style={{ 
                padding: 20, 
                alignItems: 'center'
              }}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={COLORS.textMain} />
              ) : (
                <Text style={{ color: COLORS.textMain, fontSize: 14 }}>
                  {t('homePage.loadMore')}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!hasMore && signals.length > 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                {t('homePage.allSignalsLoaded')}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
    </ScrollView>

    {/* Copy Modal */}
    <CopySignalModal
      visible={showCopyModal}
      signal={selectedSignal}
      onClose={() => setShowCopyModal(false)}
      onConfirm={handleConfirmCopy}
    />
  </View>
  );
};

export default function HomePage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { timezone, language } = useSettings();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = React.useState(windowWidth);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'copy' | 'signal'>('overview');
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [heights, setHeights] = React.useState({ overview: 0, copy: 0, signal: 0 });
  // 分别管理每个 Tab 的筛选状态，确保持久化和默认选中
  const [signalFilters, setSignalFilters] = React.useState<string[]>([language === 'zh' ? '全部' : 'All']);
  const [traderFilters, setTraderFilters] = React.useState<string[]>([language === 'zh' ? '按收益率' : 'By ROI']);
  
  const isScrollingRef = React.useRef(false); // 用于标记是否正在滚动
  const [refreshSignalTab, setRefreshSignalTab] = React.useState(0); // 用于触发信号Tab刷新

  const handleMorePress = () => {
    handleTabPress('copy');
    // 跳转到 copy tab 时，可以保持当前选中状态，或者根据需求重置
    // 这里保持当前状态
  };

  // 移除 Tab 切换时重置筛选条件的逻辑，以保持状态持久化
  /* 
  React.useEffect(() => {
    if (activeTab === 'signal') {
      setActiveFilters(['全部']);
    } else if (activeTab === 'copy') {
      setActiveFilters(['全部']);
    }
  }, [activeTab]);
  */

  // 处理从其他页面跳转到特定标签
  React.useEffect(() => {
    if (params.tab === 'copy') {
      handleTabPress('copy');
      if (params.filter) {
        setTraderFilters([params.filter as string]);
      }
    }
  }, [params.tab, params.filter]);

  const updateTabFromScroll = (offsetX: number) => {
    // 如果是手动触发的滚动动画，不更新状态
    if (isScrollingRef.current) {
      return;
    }

    const index = Math.round(offsetX / containerWidth);
    const newTab = index === 0 ? 'overview' : index === 1 ? 'signal' : 'copy';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    updateTabFromScroll(offsetX);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    updateTabFromScroll(offsetX);
  };

  const handleTabPress = (tab: 'overview' | 'copy' | 'signal') => {
    setActiveTab(tab);
    isScrollingRef.current = true; // 标记正在滚动
    
    // 当切换到信号Tab时，触发刷新
    if (tab === 'signal') {
      setRefreshSignalTab(prev => prev + 1);
    }
    
    let x = 0;
    if (tab === 'signal') x = containerWidth;
    if (tab === 'copy') x = containerWidth * 2;

    scrollViewRef.current?.scrollTo({
      x,
      animated: true,
    });

    // 滚动动画完成后重置标记（适配不同平台）
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 350);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AddToHomeScreen />
      
      {/* Fixed Sticky Nav Tabs */}
      <View style={styles.stickyNavTabs}>
        <View style={styles.navBarContent}>
          <View style={styles.navTabs}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabPress('overview')}
            >
              <Text style={activeTab === 'overview' ? styles.tabTextActive : styles.tabText}>{t('homePage.overview')}</Text>
              {activeTab === 'overview' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabPress('signal')}
            >
              <Text style={activeTab === 'signal' ? styles.tabTextActive : styles.tabText}>{t('homePage.signal')}</Text>
              {activeTab === 'signal' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabPress('copy')}
            >
              <Text style={activeTab === 'copy' ? styles.tabTextActive : styles.tabText}>{t('homePage.traders')}</Text>
              {activeTab === 'copy' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <View style={{ flex: 1 }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          nestedScrollEnabled={true}
          directionalLockEnabled={true}
          style={{ flex: 1 }}
        >
          <View style={{ width: containerWidth, height: '100%' }} onLayout={(e) => {
            const height = e.nativeEvent.layout.height;
            setHeights(h => ({ ...h, overview: height }));
          }}>
            <OverviewTabContent onMorePress={handleMorePress} currentTab={activeTab} />
          </View>
          <View style={{ width: containerWidth, height: '100%' }} onLayout={(e) => {
            const height = e.nativeEvent.layout.height;
            setHeights(h => ({ ...h, signal: height }));
          }}>
            <SignalTabContent 
              activeFilters={signalFilters} 
              setActiveFilters={setSignalFilters} 
              refreshTrigger={refreshSignalTab}
              currentTab={activeTab}
            />
          </View>
          <View style={{ width: containerWidth, height: '100%' }} onLayout={(e) => {
            const height = e.nativeEvent.layout.height;
            setHeights(h => ({ ...h, copy: height }));
          }}>
            <TradersTabContent 
              activeFilters={traderFilters} 
              setActiveFilters={setTraderFilters} 
              currentTab={activeTab}
            />
          </View>
        </ScrollView>
      </View>
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
  scrollView: {
    flex: 1,
  },
  headerTopContainer: {
    backgroundColor: COLORS.background,
    paddingTop: 16,
  },
  stickyNavTabs: {
    backgroundColor: COLORS.background,
    zIndex: 100,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarContainer: {
    position: 'relative',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  userDetails: {
    justifyContent: 'center',
  },
  userNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    color: COLORS.textMain,
    fontWeight: 'bold',
    fontSize: 14,
  },
  userBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  vipBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vipText: {
    color: COLORS.yellowText,
    fontSize: 10,
    fontWeight: 'bold',
  },
  uidText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    padding: 4,
  },
  navBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  navTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 32,
    alignItems: 'flex-end',
  },
  searchBtn: {
    padding: 4,
  },
  tabItem: {
    paddingBottom: 12,
    position: 'relative',
  },
  tabTextActive: {
    color: COLORS.textMain,
    fontWeight: '600',
    fontSize: 18,
  },
  tabText: {
    color: COLORS.textMuted,
    fontWeight: '500',
    fontSize: 15,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.textMain,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 16,
  },
  sectionTitle: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeFilter: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 4,
    borderRadius: 8,
    marginBottom: 24,
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnActive: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  timeBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  timeBtnTextActive: {
    color: COLORS.textMain,
    fontSize: 12,
    fontWeight: 'bold',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 10,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    width: '100%',
  },
  yAxis: {
    position: 'relative',
    width: 40,
    height: '100%',
  },
  axisText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.5)',
  },
  gridLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(229, 231, 235, 0.1)',
    marginBottom: (256 - 32) / 4, // Approximate spacing
    borderStyle: 'dashed', // React Native doesn't support borderStyle on View like CSS, need SVG or just opacity
    opacity: 0.3,
  },
  gridLineTransparent: {
    width: '100%',
    height: 1,
    backgroundColor: 'transparent',
  },
  svgContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingBottom: 24,
    paddingTop: 8,
    paddingLeft: 8,
  },
  chartPoint: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32, // 给定一个宽度，避免布局塌缩
    height: 32,
    transform: [{ translateX: -16 }, { translateY: -16 }], // Center the point
  },
  pointAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    zIndex: 10,
  },
  pointTooltip: {
    position: 'absolute',
    top: -34, // 稍微调高一点
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 20,
    minWidth: 60, // 增加最小宽度防止换行
    alignItems: 'center',
  },
  pointTooltipText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  crownIcon: {
    position: 'absolute',
    top: -10,
    right: -4,
    zIndex: 20,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 40, // Match yAxis width
    paddingRight: 8,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterBtnActive: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
  },
  filterBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  filterBtnTextActive: {
    color: COLORS.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
  leaderboardList: {
    gap: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  topLeaderboardItem: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)', // yellow-500/10
    borderColor: 'rgba(234, 179, 8, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  topBadgeIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 0,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#9ca3af', // gray-400
  },
  topBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  topBadgeText: {
    color: 'black',
    fontSize: 8,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameText: {
    color: COLORS.textMain,
    fontWeight: 'bold',
    fontSize: 13,
    maxWidth: 100,
  },
  roiRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  roiLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  roiValue: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  copyButtonUnsubscribed: {
    backgroundColor: 'white',
  },
  copyButtonSubscribed: {
    backgroundColor: COLORS.yellow,
  },
  copyButtonOutline: {
    // Deprecated, keeping for safety but unused
    backgroundColor: 'white',
  },
  copyButtonText: {
    color: 'black',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Copy Tab Styles
  copyTabContainer: {
    paddingBottom: 20,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginRight: 2,
  },
  traderList: {
    gap: 8,
  },
  traderCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  traderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  traderAvatarContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  traderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  statusIndicatorContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 2,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  traderName: {
    color: COLORS.textMain,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  followerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followerText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },
  cardCopyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cardCopyBtnText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  roiText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pnlText: {
    color: COLORS.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
  miniChartContainer: {
    width: 100,
    height: 40,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerLeft: {
    gap: 4,
  },
  footerRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 120,
    justifyContent: 'space-between',
  },
  footerLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  footerValue: {
    color: COLORS.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
  daysInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  coinIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
  },
  coinIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    backgroundColor: COLORS.surface,
  },
  moreCoinsBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCoinsText: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.surfaceLight,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statItemGrid: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statValue: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabelSmall: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  // Signal Card Styles - 与交易员详情页一致
  signalCard: {
    backgroundColor: COLORS.surface,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // 交易员信息头部
  signalTraderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  signalTraderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  signalTraderAvatarContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  signalTraderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
  },
  signalOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  signalTraderTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  signalTraderName: {
    color: COLORS.textMain,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  signalTraderDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  // 交易信号标题行
  signalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  signalTitleText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: 'bold',
  },
  signalDirectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  signalDirectionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 信号详情框
  signalDetailBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 12,
  },
  signalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  signalPairText: {
    color: COLORS.textMain,
    fontSize: 15,
    fontWeight: 'bold',
  },
  signalStatusTag: {
    backgroundColor: 'rgba(46, 189, 133, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  signalStatusText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '500',
  },
  signalLeverageTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  signalLeverageText: {
    color: COLORS.textMain,
    fontSize: 11,
  },
  signalCopyButton: {
    backgroundColor: COLORS.textMain,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  signalCopyButtonText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  signalInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  signalGridItem: {
    flex: 1,
  },
  signalInfoLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  signalInfoValue: {
    color: COLORS.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
});
