import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  isFollowing, 
  isSubscribed as checkSubscribed, 
  followTrader, 
  unfollowTrader,
  subscribeTrader,
  unsubscribeTrader
} from '../lib/userTraderService';
import { formatDateTime } from '../lib/timezoneUtils';
import Toast from './Toast';

const COLORS = {
  primary: "#2ebd85",
  danger: "#f6465d",
  background: "#000000",
  surface: "#131313",
  surfaceLight: "#1c1c1e", // Lighter gray for cards
  surfaceLighter: "#2c2c2e", // Even lighter for signal box
  textMain: "#ffffff",
  textMuted: "#9ca3af",
  border: "#27272a",
  yellow: "#eab308",
  purple: "#8b5cf6",
  purpleLight: "rgba(139, 92, 246, 0.2)",
};

interface SignalCardProps {
  traderId: string;
  name: string;
  avatar: string;
  description: string;
  currency: string;
  entry: string;
  direction: 'long' | 'short';
  stopLoss: string;
  takeProfit: string;
  time: string;
  signalCount: number;
  onPress?: () => void;
  onSubscribe?: () => void;
  onStatsChange?: () => void; // 当关注/订阅状态改变时的回调
}

// 计算盈亏比的函数
const calculateRiskRewardRatio = (
  entry: string,
  stopLoss: string,
  takeProfit: string,
  direction: 'long' | 'short'
): string => {
  try {
    const stopLossPrice = parseFloat(stopLoss);
    const takeProfitPrice = parseFloat(takeProfit);

    // 验证止损和止盈价格有效性
    if (isNaN(stopLossPrice) || isNaN(takeProfitPrice)) {
      return '-';
    }

    // 检查入场价是否为区间（如 3200-3250）
    if (entry.includes('-')) {
      const [minEntry, maxEntry] = entry.split('-').map(s => parseFloat(s.trim()));
      
      // 验证入场价有效性
      if (isNaN(minEntry) || isNaN(maxEntry)) {
        return '-';
      }

      // 分别计算两个入场价的盈亏比
      const ratio1 = calculateSingleRatio(minEntry, stopLossPrice, takeProfitPrice, direction);
      const ratio2 = calculateSingleRatio(maxEntry, stopLossPrice, takeProfitPrice, direction);

      if (ratio1 === null || ratio2 === null) {
        return '-';
      }

      // 返回区间格式，较小值在前
      const minRatio = Math.min(ratio1, ratio2);
      const maxRatio = Math.max(ratio1, ratio2);
      return `${minRatio.toFixed(2)}-${maxRatio.toFixed(2)}`;
    } else {
      // 单一入场价
      const entryPrice = parseFloat(entry);
      if (isNaN(entryPrice)) {
        return '-';
      }

      const ratio = calculateSingleRatio(entryPrice, stopLossPrice, takeProfitPrice, direction);
      return ratio !== null ? ratio.toFixed(2) : '-';
    }
  } catch (error) {
    console.error('计算盈亏比出错:', error);
    return '-';
  }
};

// 计算单个入场价的盈亏比
const calculateSingleRatio = (
  entryPrice: number,
  stopLossPrice: number,
  takeProfitPrice: number,
  direction: 'long' | 'short'
): number | null => {
  let risk: number;
  let reward: number;

  if (direction === 'long') {
    // 做多：风险 = 入场价 - 止损价，收益 = 止盈价 - 入场价
    risk = entryPrice - stopLossPrice;
    reward = takeProfitPrice - entryPrice;
  } else {
    // 做空：风险 = 止损价 - 入场价，收益 = 入场价 - 止盈价
    risk = stopLossPrice - entryPrice;
    reward = entryPrice - takeProfitPrice;
  }

  // 确保风险和收益为正数
  if (risk <= 0 || reward <= 0) {
    return null;
  }

  // 计算盈亏比 = 收益 / 风险
  return reward / risk;
};

export const SignalCard = ({
  traderId,
  name,
  avatar,
  description,
  currency,
  entry,
  direction,
  stopLoss,
  takeProfit,
  time,
  signalCount,
  onPress,
  onSubscribe,
  onStatsChange
}: SignalCardProps) => {
  const { user } = useAuth();
  const { timezone } = useSettings();
  const isLong = direction === 'long';
  const directionText = isLong ? '多单' : '空单';
  const directionColor = isLong ? COLORS.primary : COLORS.danger;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // 计算盈亏比
  const riskRewardRatio = calculateRiskRewardRatio(entry, stopLoss, takeProfit, direction);

  // 暂时注释掉关注和订阅状态查询，避免大量请求
  // 加载关注和订阅状态（基于交易员维度）
  // 只在用户登录且有traderId时才查询
  // useEffect(() => {
  //   const loadStatus = async () => {
  //     // 如果用户未登录，直接设置为false，不发送请求
  //     if (!user?.id || !traderId) {
  //       setIsFavorite(false);
  //       setIsSubscribed(false);
  //       return;
  //     }
      
  //     try {
  //       const [followed, subscribed] = await Promise.all([
  //         isFollowing(user.id, traderId),
  //         checkSubscribed(user.id, traderId)
  //       ]);
        
  //       setIsFavorite(followed);
  //       setIsSubscribed(subscribed);
  //     } catch (error) {
  //       // 出错时设置为false，避免显示错误状态
  //       console.error('加载关注/订阅状态失败:', error);
  //       setIsFavorite(false);
  //       setIsSubscribed(false);
  //     }
  //   };

  //   loadStatus();
  // }, [user?.id, traderId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleFollow = async () => {
    if (!user?.id) {
      showToast('请先登录', 'error');
      return;
    }

    const newFollowState = !isFavorite;
    setIsFavorite(newFollowState);

    const result = newFollowState 
      ? await followTrader(user.id, traderId)
      : await unfollowTrader(user.id, traderId);

    if (result.success) {
      showToast(newFollowState ? '关注成功' : '已取消关注', 'success');
      onStatsChange?.(); // 通知父组件更新统计
    } else {
      setIsFavorite(!newFollowState); // 恢复状态
      showToast(result.message || '操作失败', 'error');
    }
  };

  const handleSubscribe = async () => {
    if (!user?.id) {
      showToast('请先登录', 'error');
      return;
    }

    const newSubscribeState = !isSubscribed;
    setIsSubscribed(newSubscribeState);

    const result = newSubscribeState
      ? await subscribeTrader(user.id, traderId)
      : await unsubscribeTrader(user.id, traderId);

    if (result.success) {
      showToast(newSubscribeState ? '订阅成功' : '已取消订阅', 'success');
      onSubscribe?.();
      onStatsChange?.(); // 通知父组件更新统计
    } else {
      setIsSubscribed(!newSubscribeState); // 恢复状态
      showToast(result.message || '操作失败', 'error');
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: avatar }} 
                style={styles.avatar}
                onError={(e) => {
                  console.log('头像加载失败:', avatar);
                }}
              />
              <View style={styles.statusIndicatorContainer}>
                <View style={styles.statusDot} />
              </View>
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
              <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">{description}</Text>
            </View>
          </View>
          {/* Copy按钮 */}
          <TouchableOpacity 
            style={styles.copyButton}
            onPress={() => {
              // TODO: 实现copy功能
              showToast('Copy成功', 'success');
            }}
          >
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
          {/* 暂时隐藏关注和订阅按钮，避免大量查询请求 */}
          {/* <View style={styles.cardActions}>
            <TouchableOpacity style={styles.starBtn} onPress={handleFollow}>
              <MaterialIcons 
                name={isFavorite ? "star" : "star-border"} 
                size={20} 
                color={isFavorite ? COLORS.yellow : COLORS.textMuted} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.cardCopyBtn, isSubscribed ? styles.copyButtonSubscribed : styles.copyButtonUnsubscribed]}
              onPress={handleSubscribe}
            >
              <Text style={styles.cardCopyBtnText}>{isSubscribed ? '已订阅' : '订阅'}</Text>
            </TouchableOpacity>
          </View> */}
        </View>

      {/* Signal Box */}
      <View style={styles.signalBox}>
        <View style={styles.signalHeader}>
          <Text style={styles.signalTitle}>【交易信号】</Text>
          <View style={[styles.directionBadge, { backgroundColor: isLong ? 'rgba(46, 189, 133, 0.1)' : 'rgba(246, 70, 93, 0.1)' }]}>
            <MaterialIcons name={isLong ? "arrow-upward" : "arrow-downward"} size={12} color={directionColor} />
            <Text style={[styles.directionText, { color: directionColor }]}>做{isLong ? '多' : '空'}</Text>
          </View>
        </View>
        <View style={styles.signalRow}>
          <Text style={styles.signalLabel}>币种：</Text>
          <Text style={styles.signalValue}>{currency}</Text>
        </View>
        <View style={styles.signalRow}>
          <Text style={styles.signalLabel}>入场：</Text>
          <Text style={styles.signalValue}>{entry}</Text>
        </View>
        <View style={styles.signalRow}>
          <Text style={styles.signalLabel}>方向：</Text>
          <Text style={[styles.signalValue, { color: directionColor }]}>{directionText}</Text>
        </View>
        <View style={styles.signalRow}>
          <Text style={styles.signalLabel}>杠杆：</Text>
          <Text style={styles.signalValue}>10x</Text>
        </View>
        <View style={styles.signalRow}>
          <Text style={styles.signalLabel}>止损：</Text>
          <Text style={styles.signalValue}>{stopLoss}</Text>
        </View>
        <View style={styles.signalRow}>
          <Text style={styles.signalLabel}>止盈：</Text>
          <Text style={styles.signalValue}>{takeProfit}</Text>
        </View>
        <View style={styles.signalRow}>
          <Text style={styles.signalLabel}>盈亏：</Text>
          <Text style={styles.riskRewardValue}>
            {riskRewardRatio !== '-' ? (
              riskRewardRatio.includes('-') 
                ? `${riskRewardRatio}:1` 
                : `${riskRewardRatio}:1`
            ) : '-'}
          </Text>
        </View>
        <View style={styles.signalTimeContainer}>
          <Text style={styles.timeText}>
            {formatDateTime(time, timezone.offset, 'datetime')}
          </Text>
        </View>
      </View>

      {/* Footer - Removed as time is moved */}
      {/* <View style={styles.footer}>
        <Text style={styles.timeText}>{time}</Text>
      </View> */}
      </TouchableOpacity>

      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'white',
  },
  copyButtonText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
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
  copyButtonUnsubscribed: {
    backgroundColor: 'white',
  },
  copyButtonSubscribed: {
    backgroundColor: COLORS.yellow,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusIndicatorContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  nameContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    maxWidth: '100%',
  },
  name: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 2,
  },
  directionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  signalBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  signalTitle: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: 'bold',
  },
  signalRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  signalTimeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  signalLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    width: 45,
  },
  signalValue: {
    color: COLORS.textMain,
    fontSize: 13,
    fontWeight: '500',
  },
  riskRewardValue: {
    color: COLORS.yellow,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalCountBadge: {
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  signalCountText: {
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: '600',
  },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  subscribeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailText: {
    color: COLORS.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
});
