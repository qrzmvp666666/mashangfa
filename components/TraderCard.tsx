import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { subscribeTrader, unsubscribeTrader, followTrader, unfollowTrader } from '../lib/userTraderService';
import { useTranslation } from '../lib/i18n';

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

export const TraderCard = ({
  traderId,
  name,
  avatar,
  followers,
  maxFollowers,
  description,
  roi,
  roiLabel,
  pnl,
  winRate,
  aum,
  aumLabel,
  days,
  coins,
  chartPath,
  statusColor = COLORS.yellow,
  initialIsSubscribed = false,
  initialIsFavorite = false,
  onSubscriptionChange,
  onFavoriteChange,
  onPress
}: {
  traderId: string,
  name: string,
  avatar: string,
  followers: number,
  maxFollowers: number,
  description?: string,
  roi: string,
  roiLabel?: string,
  pnl: string,
  winRate: string,
  aum: string,
  aumLabel?: string,
  days: number,
  coins: string[],
  chartPath: string,
  statusColor?: string,
  initialIsSubscribed?: boolean,
  initialIsFavorite?: boolean,
  onSubscriptionChange?: () => void,
  onFavoriteChange?: () => void,
  onPress?: () => void
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isSubscribed, setIsSubscribed] = React.useState(initialIsSubscribed);
  const [isFavorite, setIsFavorite] = React.useState(initialIsFavorite);
  const [loading, setLoading] = React.useState(false);

  // 截断描述文字，最多15个字
  const truncateDescription = (text: string | undefined, maxLength: number = 15): string => {
    if (!text) return t('traderCard.noDescription');
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

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
    <TouchableOpacity style={styles.traderCard} onPress={onPress} activeOpacity={0.9}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.traderInfo}>
          <View style={styles.traderAvatarContainer}>
            <Image source={{ uri: avatar }} style={styles.traderAvatar} />
            <View style={styles.statusIndicatorContainer}>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.traderName}>{name}</Text>
            <Text style={styles.traderDescription}>
              {truncateDescription(description)}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.starBtn} 
            onPress={handleFavoriteToggle}
            disabled={loading}
          >
            <MaterialIcons 
              name={isFavorite ? "star" : "star-border"} 
              size={20} 
              color={isFavorite ? COLORS.yellow : COLORS.textMuted} 
            />
          </TouchableOpacity>
          {/* 订阅按钮 - 暂时隐藏 */}
          {false && (
            <TouchableOpacity
              style={[styles.cardCopyBtn, isSubscribed ? styles.copyButtonSubscribed : styles.copyButtonUnsubscribed]}
              onPress={handleSubscriptionToggle}
              disabled={loading}
            >
              <Text style={styles.cardCopyBtnText}>
                {loading ? '...' : (isSubscribed ? t('traderCard.subscribed') : t('traderCard.subscribe'))}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Section - 与详情页完全一致 */}
      <View style={styles.statsSection}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsLabel}>{roiLabel || t('traderCard.totalRoi')}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={[styles.statsValue, { color: roi.includes('-') ? COLORS.danger : COLORS.primary }]}>{roi}</Text>
          <View style={styles.miniChartContainer}>
            <Svg height="100%" width="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
              <Path 
                d={chartPath} 
                fill="none" 
                stroke={COLORS.primary} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </View>
      </View>

      {/* Footer Stats - 3列布局 */}
      <View style={styles.cardFooter}>
        <View style={styles.footerStatItem}>
          <Text style={styles.footerLabel}>{t('traderCard.winRate')}</Text>
          <Text style={[styles.footerValue, { color: parseFloat(winRate) >= 50 ? COLORS.primary : COLORS.textMain }]}>{winRate}</Text>
        </View>
        <View style={[styles.footerStatItem, { alignItems: 'center' }]}>
          <Text style={styles.footerLabel}>{aumLabel || t('traderCard.profitFactor')}</Text>
          <Text style={styles.footerValue}>{aum}</Text>
        </View>
        <View style={[styles.footerStatItem, { alignItems: 'flex-end' }]}>
          <Text style={styles.footerLabel}>{t('traderCard.tradingDays')}</Text>
          <Text style={styles.footerValue}>{days}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  traderDescription: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
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
  copyButtonUnsubscribed: {
    backgroundColor: 'white',
  },
  copyButtonSubscribed: {
    backgroundColor: COLORS.yellow,
  },
  statsSection: {
    marginBottom: 16,
  },
  statsHeader: {
    marginBottom: 6,
  },
  statsLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsValue: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  miniChartContainer: {
    width: 120,
    height: 50,
  },
  cardFooter: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(37, 37, 37, 0.5)',
  },
  footerStatItem: {
    flex: 1,
  },
  footerLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  footerValue: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
