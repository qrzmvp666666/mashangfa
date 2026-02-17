import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Image as SvgImage, Text as SvgText, ClipPath } from 'react-native-svg';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { subscribeTrader, unsubscribeTrader, followTrader, unfollowTrader } from '../../lib/userTraderService';
import { getTraderDetail, TraderDetail, getTraderSignals, getTraderRoiTrend } from '../../lib/traderService';
import { Signal } from '../../lib/signalService';
import { formatDateTime } from '../../lib/timezoneUtils';
import { supabase } from '../../lib/supabase';
import type { Trader } from '../../types';
import Toast from '../../components/Toast';
import { CopySignalModal } from '../../components/CopySignalModal';
import { useTranslation } from '../../lib/i18n';

const COLORS = {
  primary: "#2ebd85",
  danger: "#f6465d",
  background: "#000000",
  surface: "#161616",
  surfaceLight: "#252525",
  textMain: "#F0F0F0",
  textSub: "#888888",
  border: "#252525",
  yellow: "#F0B90B",
  purple: "#8B5CF6",
  white: "#FFFFFF",
};

const TraderDetailScreen = () => {
  useProtectedRoute(); // 保护路由
  const router = useRouter();
  const { user } = useAuth();
  const { timezone } = useSettings();
  const { t, language } = useTranslation();
  const params = useLocalSearchParams();
  const traderId = params.traderId as string;

  const { width: windowWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'lastWeek' | 'lastMonth' | 'lastQuarter'>('lastWeek');
  const [signalTrendPeriod, setSignalTrendPeriod] = useState<'7' | '30' | '90'>('7');
  const [trader, setTrader] = useState<TraderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentSignals, setCurrentSignals] = useState<Signal[]>([]);
  const [historySignals, setHistorySignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [roiTrendData, setRoiTrendData] = useState<Array<{ date: string; roi: number }>>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  // 监听 Supabase Realtime 变更 (实时更新交易员统计数据)
  useEffect(() => {
    if (!traderId) return;

    console.log('🔌 [Realtime] 正在订阅交易员变更:', traderId);
    const channel = supabase
      .channel(`trader-detail-${traderId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'traders', 
          filter: `id=eq.${traderId}` 
        },
        (payload) => {
          console.log('🔄 [Realtime] 收到交易员数据更新:', payload.new);
          // 增量更新 trader 状态
          setTrader((prev) => {
            if (!prev) return null;
            // payload.new 中的字段是下划线命名，TraderDetail 接口也主要是下划线
            // 我们直接合并，但要注意 payload.new 仅包含 DB 字段
            // 不包含 RPC 生成的字段 (如 is_subscribed)。
            // 所以必须保留 prev 中的原有字段。
            return {
              ...prev,
              ...(payload.new as any), 
              // 确保保留前端计算或 RPC 返回的状态
              is_subscribed: prev.is_subscribed,
              is_followed: prev.is_followed
            };
          });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [Realtime] 取消订阅交易员数据:', traderId);
      supabase.removeChannel(channel);
    };
  }, [traderId]);

  // 监听 Supabase Realtime 变更 (实时更新信号数据)
  useEffect(() => {
    if (!traderId) return;

    console.log('🔌 [Realtime] 正在订阅信号变更:', traderId);
    
    // 智能判断是否需要刷新信号列表
    const checkIfShouldRefreshSignals = (eventType: string, newData: any, oldData?: any): boolean => {
      // INSERT: 新信号属于当前交易员
      if (eventType === 'INSERT') {
        const shouldRefresh = newData.trader_id === traderId;
        console.log('📊 [Realtime] INSERT事件:', {
          signal_id: newData.id,
          currency: newData.currency,
          status: newData.status,
          shouldRefresh
        });
        return shouldRefresh;
      }

      // DELETE: 删除的信号属于当前交易员
      if (eventType === 'DELETE' && oldData) {
        const shouldRefresh = oldData.trader_id === traderId;
        console.log('📊 [Realtime] DELETE事件:', {
          signal_id: oldData.id,
          shouldRefresh
        });
        return shouldRefresh;
      }

      // UPDATE: 检查关键字段变化
      if (eventType === 'UPDATE' && oldData && newData.trader_id === traderId) {
        // status 改变 (active -> closed 等)
        const statusChanged = newData.status !== oldData.status;
        
        // 收益数据改变
        const pnlChanged = newData.realized_pnl !== oldData.realized_pnl || 
                          newData.roi !== oldData.roi;
        
        // 价格数据改变
        const priceChanged = newData.entry_price !== oldData.entry_price ||
                            newData.exit_price !== oldData.exit_price ||
                            newData.stop_loss !== oldData.stop_loss ||
                            newData.take_profit !== oldData.take_profit;

        const shouldRefresh = statusChanged || pnlChanged || priceChanged;
        
        console.log('📊 [Realtime] UPDATE事件:', {
          signal_id: newData.id,
          currency: newData.currency,
          statusChanged,
          pnlChanged,
          priceChanged,
          shouldRefresh
        });
        
        return shouldRefresh;
      }

      return false;
    };

    const signalChannel = supabase
      .channel(`signals-${traderId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件 (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'signals',
          filter: `trader_id=eq.${traderId}`
        },
        (payload) => {
          console.log('⚡️ [Realtime] 收到信号变更事件:', payload.eventType);
          
          // 智能判断是否需要刷新
          const shouldRefresh = checkIfShouldRefreshSignals(
            payload.eventType,
            payload.new,
            payload.old
          );

          if (shouldRefresh) {
            console.log('🔄 [Realtime] 触发信号列表刷新');
            // 重新加载信号列表
            loadSignals();
          } else {
            console.log('⏭️ [Realtime] 无需刷新信号列表');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [Realtime] 取消订阅信号数据:', traderId);
      supabase.removeChannel(signalChannel);
    };
  }, [traderId]);

  // 【优化】加载交易员数据 - 使用单次优化查询
  useEffect(() => {
    loadTraderData();
    loadSignals();
    loadRoiTrend();
  }, [traderId]);

  // 当时间周期改变时,重新加载趋势数据
  useEffect(() => {
    if (traderId) {
      loadRoiTrend();
    }
  }, [signalTrendPeriod]);

  const loadTraderData = async () => {
    if (!traderId) return;
    
    try {
      setLoading(true);
      
      // 使用新的 RPC 函数：getTraderDetail 获取完整的交易员信息及统计数据
      const traderDetail = await getTraderDetail(traderId, user?.id);
      
      if (traderDetail) {
        setTrader(traderDetail);
        setIsSubscribed(traderDetail.is_subscribed || false);
        setIsFavorite(traderDetail.is_followed || false);
      }
    } catch (error) {
      console.error('加载交易员数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSignals = async () => {
    if (!traderId) return;
    
    try {
      setSignalsLoading(true);
      
      // 加载历史信号（包含 closed, closed_profit, closed_loss）
      // 注意：这里我们为了兼容多种 closed 状态，不传入 status 筛选，而是在前端或通过传 null 获取所有非 active 
      // 或者我们可以修改 getTraderSignals 支持数组，但 RPC 目前只支持单字符串。
      // 临时方案：这里暂时通过不传状态（获取所有）然后在前端过滤，或者依赖后端 RPC 的模糊匹配。
      // 更优方案是：前端传 'closed'，后端 RPC 将 'closed%' 视为包含 'closed_profit', 'closed_loss'
      // 让我们先检查 get_trader_signals 的 RPC 实现。
      
      // 实际上，如果后端 RPC 是精确匹配 'closed'，那就会漏掉 'closed_profit'。
      // 我们在前端暂时尝试获取所有，然后过滤。
      const allSignals = await getTraderSignals(traderId, undefined, 50, 0); 
      
      const activeSignals = allSignals.filter((s: Signal) => s.status === 'active');
      const closedSignals = allSignals.filter((s: Signal) => 
        s.status === 'closed' || 
        s.status === 'closed_profit' || 
        s.status === 'closed_loss' || 
        s.status === 'cancelled'
      );
      
      setCurrentSignals(activeSignals);
      setHistorySignals(closedSignals);
      
      console.log('✅ 成功加载信号数据:', { 
        active: activeSignals.length, 
        closed: closedSignals.length 
      });
    } catch (error) {
      console.error('加载信号数据失败:', error);
    } finally {
      setSignalsLoading(false);
    }
  };

  const loadRoiTrend = async () => {
    if (!traderId) return;
    
    try {
      setTrendLoading(true);
      const days = parseInt(signalTrendPeriod);
      const trendData = await getTraderRoiTrend(traderId, days);
      setRoiTrendData(trendData);
      
      console.log('✅ 成功加载 ROI 趋势数据:', { 
        period: signalTrendPeriod, 
        dataPoints: trendData.length 
      });
    } catch (error) {
      console.error('加载 ROI 趋势失败:', error);
      setRoiTrendData([]); // 出错时设置为空数组
    } finally {
      setTrendLoading(false);
    }
  };

  // 处理订阅/取消订阅
  const handleSubscriptionToggle = async () => {
    if (!user?.id || !trader) {
      console.log('请先登录');
      return;
    }

    if (subscribeLoading) return;

    try {
      setSubscribeLoading(true);
      
      if (isSubscribed) {
        const result = await unsubscribeTrader(user.id, trader.id);
        if (result.success) {
          setIsSubscribed(false);
        }
      } else {
        const result = await subscribeTrader(user.id, trader.id);
        if (result.success) {
          setIsSubscribed(true);
        }
      }
    } catch (error) {
      console.error('订阅操作失败:', error);
    } finally {
      setSubscribeLoading(false);
    }
  };

  // 处理关注/取消关注
  const handleFavoriteToggle = async () => {
    if (!user?.id || !trader) {
      console.log('请先登录');
      return;
    }

    if (favoriteLoading) return;

    try {
      setFavoriteLoading(true);
      
      if (isFavorite) {
        const result = await unfollowTrader(user.id, trader.id);
        if (result.success) {
          setIsFavorite(false);
        }
      } else {
        const result = await followTrader(user.id, trader.id);
        if (result.success) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error('关注操作失败:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleCopy = (signal: Signal) => {
    setSelectedSignal(signal);
    setShowCopyModal(true);
  };

  const handleConfirmCopy = () => {
    setShowCopyModal(false);
    setToastMessage(t('toast.copySuccess'));
    setToastVisible(true);
  };

  // 生成SVG图表路径
  const generateChartPath = () => {
    if (trendLoading) {
      return "M 0,20 L 100,20"; // 加载中显示直线
    }
    
    if (!roiTrendData || roiTrendData.length === 0) {
      return "M 0,20 L 100,20"; // 无数据显示直线
    }

    // 计算ROI范围用于归一化
    const rois = roiTrendData.map(d => d.roi);
    const maxRoi = Math.max(...rois);
    const minRoi = Math.min(...rois);
    const range = maxRoi - minRoi;
    
    // 计算每个点的坐标
    const points = roiTrendData.map((data, index) => {
      const x = (index / (roiTrendData.length - 1)) * 100;
      
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

  // 渲染单个信号卡片
  const renderSignalCard = (signal: Signal) => {
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
    const signalTypeText = signal.signal_type === 'spot' ? t('traderDetail.spot') :
                          signal.signal_type === 'futures' ? t('traderDetail.futures') : t('traderDetail.leverage');

    // 判断是否为历史信号
    const isHistory = signal.status !== 'active';
    let resultText = '';
    let resultColor = COLORS.textSub;
    let resultBgColor = 'rgba(255,255,255,0.1)';

    if (signal.status === 'closed_profit') {
      resultText = t('traderDetail.takeProfit');
      resultColor = COLORS.primary;
      resultBgColor = 'rgba(46, 189, 133, 0.15)';
    } else if (signal.status === 'closed_loss') {
      resultText = t('traderDetail.stopLoss');
      resultColor = COLORS.danger;
      resultBgColor = 'rgba(246, 70, 93, 0.15)';
    } else if (signal.status === 'closed') {
       resultText = t('traderDetail.breakEven');
       resultColor = COLORS.textSub;
    } else if (signal.status === 'cancelled') {
        resultText = t('traderDetail.cancelled');
    }

    // 获取信号时长
    const getDuration = () => {
        if (!isHistory) return '-';
        
        let durationHours = 0;
        
        // 优先使用数据库的duration字段
        if (signal.duration !== undefined && signal.duration !== null) {
            durationHours = signal.duration;
        } else if (signal.closed_at) {
            // 回退：计算时长
            const start = new Date(signal.signal_time).getTime();
            const end = new Date(signal.closed_at).getTime();
            const diffMs = end - start;
            if (diffMs < 0) return '-';
            durationHours = diffMs / (1000 * 60 * 60);
        } else {
            return '-';
        }
        
        // 格式化显示
        const totalMinutes = durationHours * 60;
        const totalSeconds = Math.floor(totalMinutes * 60);
        
        if (durationHours >= 1) {
            // 大于等于1小时：显示"X小时Y分"
            const hours = Math.floor(durationHours);
            const minutes = Math.floor((durationHours % 1) * 60);
            if (minutes > 0) {
                return `${hours}小时${minutes}分`;
            }
            return `${hours}小时`;
        } else if (totalMinutes >= 1) {
            // 1分钟到1小时之间：显示"X分Y秒"
            const minutes = Math.floor(totalMinutes);
            const seconds = totalSeconds % 60;
            if (seconds > 0) {
                return `${minutes}分${seconds}秒`;
            }
            return `${minutes}分`;
        } else {
            // 小于1分钟：显示"X秒"
            return `${totalSeconds}秒`;
        }
    };

    const roiValue = signal.roi ? (signal.roi * 100).toFixed(2) + '%' : '-';
    // 根据 ROI 正负决定显示颜色
    const roiColor = (signal.roi && signal.roi > 0) ? COLORS.primary : 
                     (signal.roi && signal.roi < 0) ? COLORS.danger : COLORS.textMain;

    return (
      <View key={signal.id} style={[styles.signalCard, { overflow: 'hidden' }]}>
        {/* 历史状态 - 右上角角标样式 */}
        {isHistory && resultText && (
             <View style={{
                position: 'absolute',
                top: 8,
                right: -28,
                width: 90,
                backgroundColor: resultColor,
                paddingVertical: 4,
                transform: [{ rotate: '45deg' }],
                zIndex: 10,
                alignItems: 'center',
                justifyContent: 'center',
             }}>
                 <Text style={{ 
                    color: '#FFFFFF', 
                    fontSize: 10, 
                    fontWeight: 'bold',
                 }}>{resultText}</Text>
             </View>
        )}

        <View style={styles.signalCardHeader}>
          <Text style={styles.signalPairText}>{signal.currency} {signalTypeText}</Text>
          <View style={[styles.signalStatusTag, { backgroundColor: statusBgColor }]}>
            <Text style={[styles.signalStatusText, { color: statusTextColor }]}>
              {isLong ? t('traderDetail.long') : t('traderDetail.short')}
            </Text>
          </View>
          <View style={[styles.signalLeverageTag, { marginRight: 'auto' }]}>
            <Text style={styles.signalLeverageText}>{signal.leverage.replace(/x$/i, '')}x</Text>
          </View>
          
          {/* Copy 按钮 - 暂时隐藏 */}
          {!isHistory && false && (
              <TouchableOpacity style={styles.signalCopyButton} onPress={() => handleCopy(signal)}>
                <Text style={styles.signalCopyButtonText}>Copy</Text>
              </TouchableOpacity>
          )}
        </View>

        <View style={styles.signalInfoGrid}>
          <View style={styles.signalGridItem}>
            <Text style={styles.signalInfoLabel}>{t('traderDetail.entryPrice')}</Text>
            <Text style={styles.signalInfoValue}>{signal.entry_price}</Text>
          </View>
          <View style={styles.signalGridItem}>
            <Text style={styles.signalInfoLabel}>{t('traderDetail.positionMode')}</Text>
            <Text style={styles.signalInfoValue}>{t('traderDetail.fullPosition')}</Text>
          </View>
          <View style={styles.signalGridItem}>
            {isHistory ? (
                <>
                <Text style={styles.signalInfoLabel}>{t('traderDetail.roi')}</Text>
                <Text style={[styles.signalInfoValue, { color: roiColor, fontWeight: 'bold' }]}>{roiValue}</Text>
                </>
            ) : (
                <>
                <Text style={styles.signalInfoLabel}>{t('traderDetail.orderTime')}</Text>
                <Text style={styles.signalInfoValue}>{formatTime(signal.signal_time)}</Text>
                </>
            )}
          </View>
        </View>

        <View style={styles.signalInfoGrid}>
          <View style={styles.signalGridItem}>
            <Text style={styles.signalInfoLabel}>{t('traderDetail.takeProfitPrice')}</Text>
            <Text style={[styles.signalInfoValue, { color: COLORS.primary }]}>{signal.take_profit}</Text>
          </View>
          <View style={styles.signalGridItem}>
            <Text style={styles.signalInfoLabel}>{t('traderDetail.stopLossPrice')}</Text>
            <Text style={[styles.signalInfoValue, { color: COLORS.danger }]}>{signal.stop_loss}</Text>
          </View>
          <View style={styles.signalGridItem}>
            <Text style={styles.signalInfoLabel}>{t('traderDetail.profitLossRatio')}</Text>
            <Text style={[styles.signalInfoValue, { color: COLORS.yellow }]}>{profitLossRatio}</Text>
          </View>
        </View>

        {isHistory && (
            <View style={[styles.signalInfoGrid, { marginTop: 4 }]}>
                <View style={styles.signalGridItem}>
                    <Text style={styles.signalInfoLabel}>{t('traderDetail.signalDuration')}</Text>
                    <Text style={styles.signalInfoValue}>{getDuration()}</Text>
                </View>
                <View style={styles.signalGridItem}>
                    <Text style={styles.signalInfoLabel}>{t('traderDetail.orderTime')}</Text>
                    <Text style={styles.signalInfoValue}>{formatTime(signal.signal_time).split(' ')[0]}</Text>
                    <Text style={[styles.signalInfoValue, { fontSize: 10, color: COLORS.textSub }]}>{formatTime(signal.signal_time).split(' ')[1]}</Text>
                </View>
                <View style={styles.signalGridItem}>
                    <Text style={styles.signalInfoLabel}>{t('traderDetail.exitTime')}</Text>
                    <Text style={styles.signalInfoValue}>{signal.closed_at ? formatTime(signal.closed_at).split(' ')[0] : '-'}</Text>
                    <Text style={[styles.signalInfoValue, { fontSize: 10, color: COLORS.textSub }]}>{signal.closed_at ? formatTime(signal.closed_at).split(' ')[1] : ''}</Text>
                </View>
            </View>
        )}
      </View>
    );
  };

  // Mock Chart Data
  const rawChartData = [
    { date: '10-21', value: 100 },
    { date: '10-22', value: 115 },
    { date: '10-23', value: 125 },
    { date: '10-24', value: 110 },
    { date: '10-25', value: 90 },
    { date: '10-26', value: 80 },
    { date: '10-27', value: 105 },
    { date: '10-28', value: 95 },
    { date: '10-29', value: 85 },
    { date: '10-30', value: 75 },
    { date: '10-31', value: 65 },
  ];

  const chartData = React.useMemo(() => {
    let data = rawChartData;
    if (timeFilter === 'lastWeek') {
      data = rawChartData.slice(-7);
    }
    
    // Normalize data so start is 0%
    if (data.length > 0) {
      const startValue = data[0].value;
      return data.map(d => ({ ...d, value: d.value - startValue }));
    }
    return data;
  }, [timeFilter]);

  // Calculate Min/Max Y dynamically
  const { yAxisMax, yAxisMin, yRange } = React.useMemo(() => {
    const allValues = chartData.map(d => d.value);
    const dataMax = Math.max(...allValues);
    const dataMin = Math.min(...allValues);
    
    // Add ~10% padding
    const range = dataMax - dataMin;
    const padding = range * 0.1 || 5;
    
    const max = Math.ceil(dataMax + padding);
    // If dataMin >= 0, start axis at 0. Otherwise add padding at bottom.
    let min = dataMin >= 0 ? 0 : Math.floor(dataMin - padding);
    
    return { yAxisMax: max, yAxisMin: min, yRange: max - min };
  }, [chartData]);

  const chartAreaWidth = windowWidth - 64 - 40; // 16*2 content padding + 16*2 card padding + 40 yAxis
  const dataLength = chartData.length;
  
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

  const getY = (val: number) => {
    const availableHeight = chartHeight - (verticalPadding * 2);
    const normalizedVal = (val - yAxisMin) / (yRange || 1);
    return chartHeight - verticalPadding - normalizedVal * availableHeight;
  };

  // Calculate intermediate ticks
  const positiveStep1 = Math.ceil(yAxisMax / 3);
  const positiveStep2 = Math.ceil(yAxisMax * 2 / 3);
  const negativeStep1 = yAxisMin < 0 ? Math.floor(yAxisMin / 3) : 0;
  const negativeStep2 = yAxisMin < 0 ? Math.floor(yAxisMin * 2 / 3) : 0;

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={() => {
            // 返回到首页的 Traders tab
            router.push({
              pathname: '/(tabs)',
              params: { tab: 'copy' }
            });
          }}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('traderDetail.title')}</Text>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="share" size={20} color={COLORS.textSub} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : !trader ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.textSub }}>{t('traderDetail.notFound')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          
          {/* Trader Info Section */}
          <View style={styles.card}>
            <View style={styles.traderHeader}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: trader.avatar_url }}
                  style={styles.avatar}
                />
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={14} color={COLORS.yellow} />
                </View>
              </View>
              
              <View style={styles.traderInfo}>
                <View style={styles.nameRow}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.traderName} numberOfLines={1}>{trader.name}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.starButton} 
                      onPress={handleFavoriteToggle}
                      disabled={favoriteLoading}
                    >
                      {favoriteLoading ? (
                        <ActivityIndicator size="small" color={COLORS.yellow} />
                      ) : (
                        <MaterialIcons 
                          name={isFavorite ? "star" : "star-border"} 
                          size={24} 
                          color={isFavorite ? COLORS.yellow : COLORS.textSub} 
                        />
                      )}
                    </TouchableOpacity>
                    {/* 订阅按钮 - 暂时隐藏 */}
                    {false && (
                      <TouchableOpacity
                        style={[styles.copyButton, isSubscribed ? styles.copyButtonSubscribed : styles.copyButtonUnsubscribed]}
                        onPress={handleSubscriptionToggle}
                        disabled={subscribeLoading}
                      >
                        {subscribeLoading ? (
                          <ActivityIndicator size="small" color={isSubscribed ? COLORS.textSub : COLORS.background} />
                        ) : (
                          <Text style={styles.copyButtonText}>
                            {isSubscribed ? t('traderDetail.subscribed') : t('traderDetail.subscribe')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">{trader.description || t('traderDetail.noDescription')}</Text>
              </View>
            </View>

          <View style={styles.statsContainer}>
            <View style={styles.roiSection}>
              <View style={styles.roiHeader}>
                <View style={styles.roiHeaderLeft}>
                  <Text style={styles.roiLabel}>{t('traderDetail.totalRoi')}</Text>
                  <MaterialIcons name="info-outline" size={14} color="rgba(136, 136, 136, 0.5)" />
                </View>
                <View style={styles.periodSelector}>
                  <TouchableOpacity
                    style={[styles.periodButton, signalTrendPeriod === '7' && styles.periodButtonActive]}
                    onPress={() => setSignalTrendPeriod('7')}
                  >
                    <Text style={[styles.periodButtonText, signalTrendPeriod === '7' && styles.periodButtonTextActive]}>{t('traderDetail.last7Days')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.periodButton, signalTrendPeriod === '30' && styles.periodButtonActive]}
                    onPress={() => setSignalTrendPeriod('30')}
                  >
                    <Text style={[styles.periodButtonText, signalTrendPeriod === '30' && styles.periodButtonTextActive]}>{t('traderDetail.last30Days')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.periodButton, signalTrendPeriod === '90' && styles.periodButtonActive]}
                    onPress={() => setSignalTrendPeriod('90')}
                  >
                    <Text style={[styles.periodButtonText, signalTrendPeriod === '90' && styles.periodButtonTextActive]}>{t('traderDetail.last90Days')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.roiRow}>
                <View style={styles.roiValues}>
                  <Text style={[styles.roiPercent, { color: (trader?.total_roi || 0) >= 0 ? COLORS.primary : COLORS.danger }]}>
                    {trader?.total_roi !== undefined ? `${trader.total_roi > 0 ? '+' : ''}${trader.total_roi.toFixed(2)}%` : '0.00%'}
                  </Text>
                </View>
                <View style={styles.miniChartContainer}>
                  {trendLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                  ) : (
                    <Svg height="100%" width="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <Path 
                        d={generateChartPath()} 
                        fill="none" 
                        stroke={COLORS.primary} 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </Svg>
                  )}
                </View>
              </View>
            </View>

            {/* 展开/收起按钮 */}
            <TouchableOpacity 
              style={{ alignItems: 'center', paddingVertical: 4, marginTop: -8 }}
              onPress={() => setShowStats(!showStats)}
            >
              <MaterialIcons 
                name={showStats ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={24} 
                color={COLORS.textSub} 
              />
            </TouchableOpacity>

            {showStats && (
              <>
                <View style={[styles.gridStats, { paddingTop: 4, borderTopColor: 'transparent' }]}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('traderDetail.winRate')}</Text>
                    <Text style={[styles.statValue, { color: (trader?.win_rate || 0) >= 50 ? COLORS.primary : COLORS.textMain }]}>
                      {trader?.win_rate !== undefined ? `${trader.win_rate.toFixed(1)}%` : '-'}
                    </Text>
                  </View>
                  <View style={[styles.statItem, { alignItems: 'center' }]}>
                    <Text style={styles.statLabel}>{t('traderDetail.profitFactor')}</Text>
                    <Text style={styles.statValue}>{trader?.profit_factor ? trader.profit_factor.toFixed(2) : '0'}</Text>
                  </View>
                  <View style={[styles.statItem, { alignItems: 'flex-end' }]}>
                    <Text style={styles.statLabel}>{t('traderDetail.tradingDays')}</Text>
                    <Text style={styles.statValue}>{trader?.trading_days !== undefined && trader?.trading_days !== null ? trader.trading_days : '-'}</Text>
                  </View>
                </View>

                <View style={[styles.gridStats, { marginTop: 4, paddingTop: 0, borderTopWidth: 0 }]}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('traderDetail.totalSignals')}</Text>
                    <Text style={styles.statValue}>{trader?.total_signals || 0}</Text>
                  </View>
                  <View style={[styles.statItem, { alignItems: 'center' }]}>
                    <Text style={styles.statLabel}>{t('traderDetail.longSignals')}</Text>
                    <Text style={styles.statValue}>{trader?.long_signals || 0}</Text>
                  </View>
                  <View style={[styles.statItem, { alignItems: 'flex-end' }]}>
                    <Text style={styles.statLabel}>{t('traderDetail.shortSignals')}</Text>
                    <Text style={styles.statValue}>{trader?.short_signals || 0}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Rank Section - 暂时隐藏 */}
        {/* <View style={[styles.card, styles.rankCard]}>
          <View style={[styles.rankItem, styles.borderRight]}>
            <Text style={styles.rankLabel}>日排行</Text>
            <View style={styles.rankValueRow}>
              <Text style={styles.rankValue}>2</Text>
              <View style={styles.rankChangeGreen}>
                <Text style={styles.rankChangeTextGreen}>▲ 1</Text>
              </View>
            </View>
          </View>
          <View style={[styles.rankItem, styles.borderRight]}>
            <Text style={styles.rankLabel}>月排行</Text>
            <View style={styles.rankValueRow}>
              <Text style={styles.rankValue}>123</Text>
              <View style={styles.rankChangeRed}>
                <Text style={styles.rankChangeTextRed}>▼ 5</Text>
              </View>
            </View>
          </View>
          <View style={styles.rankItem}>
            <Text style={styles.rankLabel}>总排行</Text>
            <View style={styles.rankValueRow}>
              <Text style={styles.rankValue}>10</Text>
            </View>
          </View>
          <View style={styles.rankArrow}>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.textSub} />
          </View>
        </View> */}

        {/* Profit Trend Section - 暂时隐藏 */}
        {/* <View style={styles.card}>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>收益走势</Text>
          ... 
        </View> */}

        {/* Signals Section - 信号列表 */}
        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          <View style={styles.tabsHeader}>
            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => setActiveTab('current')}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, activeTab === 'current' ? styles.tabTextActive : null]}>{t('traderDetail.currentSignals')}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{currentSignals.length}</Text>
                </View>
              </View>
              {activeTab === 'current' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tabItem}
              onPress={() => setActiveTab('history')}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, activeTab === 'history' ? styles.tabTextActive : null]}>{t('traderDetail.historySignals')}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{historySignals.length}</Text>
                </View>
              </View>
              {activeTab === 'history' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {signalsLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ color: COLORS.textSub, fontSize: 12, marginTop: 8 }}>
                  {t('traderDetail.loadingSignals')}
                </Text>
              </View>
            ) : (
              <>
                {activeTab === 'current' && (
                  <>
                    {currentSignals.length === 0 ? (
                      <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.textSub, fontSize: 14 }}>{t('traderDetail.noCurrentSignals')}</Text>
                      </View>
                    ) : (
                      currentSignals.map(signal => renderSignalCard(signal))
                    )}
                  </>
                )}

                {activeTab === 'history' && (
                  <>
                    {historySignals.length === 0 ? (
                      <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.textSub, fontSize: 14 }}>{t('traderDetail.noHistorySignals')}</Text>
                      </View>
                    ) : (
                      historySignals.map(signal => renderSignalCard(signal))
                    )}
                  </>
                )}
              </>
            )}
          </View>
        </View>

      </ScrollView>
      )}
      <Toast 
        visible={toastVisible} 
        message={toastMessage} 
        type="success" 
        duration={1500}
        onHide={() => setToastVisible(false)} 
      />
      <CopySignalModal
        visible={showCopyModal}
        signal={selectedSignal}
        onClose={() => setShowCopyModal(false)}
        onConfirm={handleConfirmCopy}
      />
    </SafeAreaView>
  );
};

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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerTitle: {
    color: COLORS.textMain,
    fontSize: 15,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 5,
  },
  // Trader Info Styles
  traderHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(37, 37, 37, 0.5)',
    backgroundColor: COLORS.surfaceLight,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: 'black',
    borderRadius: 10,
    padding: 2,
  },
  traderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  traderName: {
    color: COLORS.textMain,
    fontSize: 17,
    fontWeight: 'bold',
    maxWidth: 120,
  },
  tagContainer: {
    backgroundColor: 'rgba(37, 37, 37, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.textSub,
    fontSize: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  copyButtonUnsubscribed: {
    backgroundColor: COLORS.white,
  },
  copyButtonSubscribed: {
    backgroundColor: COLORS.yellow,
  },
  copyButtonText: {
    color: 'black',
    fontSize: 13,
    fontWeight: 'bold',
  },
  description: {
    color: COLORS.textSub,
    fontSize: 12,
  },
  statsContainer: {
    gap: 12,
  },
  roiSection: {
    gap: 6,
  },
  roiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roiLabel: {
    color: COLORS.textSub,
    fontSize: 12,
  },
  roiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roiValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  roiPercent: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  roiAmount: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 37, 37, 0.5)',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    color: COLORS.textSub,
    fontSize: 10,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: COLORS.background,
  },
  miniChartContainer: {
    width: 150,
    height: 50,
  },
  gridStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(37, 37, 37, 0.5)',
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: COLORS.textSub,
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Rank Card Styles
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rankItem: {
    flex: 1,
    alignItems: 'center',
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(37, 37, 37, 0.5)',
  },
  rankLabel: {
    color: COLORS.textSub,
    fontSize: 12,
    marginBottom: 4,
  },
  rankValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankValue: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: 'bold',
  },
  rankChangeGreen: {
    backgroundColor: 'rgba(46, 189, 133, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankChangeTextGreen: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '500',
  },
  rankChangeRed: {
    backgroundColor: 'rgba(246, 70, 93, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankChangeTextRed: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '500',
  },
  rankArrow: {
    paddingLeft: 8,
  },
  // Chart Section Styles
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartLabel: {
    color: COLORS.textSub,
    fontSize: 12,
  },
  sectionTitle: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: 'bold',
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textSub,
    fontSize: 10,
  },
  timeFilterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 4,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(37, 37, 37, 0.5)',
  },
  timeFilterBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeFilterBtnActive: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  timeFilterText: {
    color: COLORS.textSub,
    fontSize: 12,
  },
  timeFilterTextActive: {
    color: COLORS.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    width: '100%',
    marginBottom: 8,
  },
  yAxis: {
    position: 'relative',
    width: 40,
    height: '100%',
  },
  axisText: {
    color: COLORS.textSub,
    fontSize: 10,
    fontWeight: '500',
  },
  chartContent: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(37, 37, 37, 0.3)',
    borderStyle: 'dashed',
    marginBottom: (192 - 24) / 4,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 40,
  },
  // Tabs & List Styles
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(37, 37, 37, 0.5)',
    paddingHorizontal: 20,
  },
  tabItem: {
    marginRight: 24,
    paddingVertical: 14,
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    color: COLORS.textSub,
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.textMain,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 37, 37, 0.5)',
  },
  badgeText: {
    color: COLORS.textSub,
    fontSize: 11,
  },
  badgeTransparent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeTextTransparent: {
    color: 'rgba(136, 136, 136, 0.6)',
    fontSize: 12,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.white,
  },
  listContainer: {
    padding: 16,
    minHeight: 220,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listHeaderLabel: {
    color: COLORS.textSub,
    fontSize: 11,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(37, 37, 37, 0.5)',
    marginVertical: 8,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pairText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: 'bold',
  },
  typeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  leverageTagGreen: {
    backgroundColor: 'rgba(46, 189, 133, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leverageTextGreen: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  leverageTagRed: {
    backgroundColor: 'rgba(246, 70, 93, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leverageTextRed: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: 'bold',
  },
  amountText: {
    color: COLORS.textSub,
    fontSize: 11,
  },
  priceText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: '500',
  },
  subPriceText: {
    color: COLORS.textSub,
    fontSize: 11,
    marginTop: 4,
  },
  pnlTextGreen: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pnlPercentGreen: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  pnlTextRed: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pnlPercentRed: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  statusTag: {
    backgroundColor: 'rgba(240, 185, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.yellow,
    fontSize: 10,
    fontWeight: '500',
  },
  // Signal Card Styles
  signalCard: {
    backgroundColor: COLORS.surfaceLight,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 12,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 37, 37, 0.5)',
  },
  signalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 'auto',
  },
  signalCopyButtonText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  signalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  signalInfoItem: {
    flex: 1,
  },
  signalInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  signalGridItem: {
    flex: 1,
  },
  signalInfoLabel: {
    color: COLORS.textSub,
    fontSize: 11,
    marginBottom: 4,
  },
  signalInfoValue: {
    color: COLORS.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TraderDetailScreen;