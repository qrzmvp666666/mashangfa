import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { UserInfo } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from '../../lib/i18n';
import { isVipActive, formatVipExpiresAt } from '../../lib/redemptionService';


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

const MyPage: React.FC = () => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { language, setLanguage } = useSettings();
  const { t } = useTranslation();


  // Generate default info from user object or profile
  const defaultNickname = profile?.username || user?.email?.split('@')[0] || 'User';
  const accountId = profile?.account_id || (user?.id ? user.id.substring(0, 8).toUpperCase() : 'UNKNOWN');
  const avatarUri = profile?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuAaf9dVjkyC17LtClctTc-4sEEVvnJDQ0sqSp-elCOM8ljGaMwkhTiacOULcPPbYtSTu_lFPmnNtKsVxiOA5eHNZkJE8KHzJP-Ltx4rAvebxj5DVRDSPgWop3DQj8PuIxIIGVG_9IjKOT49af1xYWNvQQvVOeMdNj3kbhN4shXLBHo1Imm3YXyaQ_Bf8Gav9EMWI697UBzvaFwIV24Dxnf9tVPbk9jCB7kc-S_KzV8Gm3EW2a9jUrIkf3nvAt1kgTa8y1UdRtKUfg";
  const isVerified = profile?.is_verified || false;
  const vipActive = isVipActive(profile?.membership_expires_at || null);



  // 使用类型定义的数据
  const userInfo: UserInfo = {
    username: defaultNickname,
    accountId: accountId,
    verified: isVerified,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.myHeader}>
        <View style={{ width: 24 }} />
        <Text style={styles.myHeaderTitle}>{t('myPage.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.myScrollView}>
        {/* Profile Section */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
              />
              {/* VIP Badge - Bottom Right */}
              {vipActive ? (
                <View style={styles.vipBadge}>
                  <Ionicons name="diamond" size={14} color="#FFD700" />
                </View>
              ) : (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>{t('myPage.free')}</Text>
                </View>
              )}
              {/* Verified Badge - Top Right */}
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{userInfo.username}</Text>
              <View style={styles.accountRow}>
                <Text style={styles.accountId}>{t('myPage.account')}:{userInfo.accountId}</Text>
                <Ionicons name="copy-outline" size={16} color="#8A919E" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </View>
          {/* 保留向右箭头 */}
          <View style={styles.qrCode}>
            <Ionicons name="chevron-forward" size={20} color="#8A919E" />
          </View>
        </TouchableOpacity>

        {/* Promotion Banner */}
        {/* <View style={styles.promoBanner}>
          <View>
            <Text style={styles.promoTitle}>新人开户赢好礼</Text>
            <Text style={styles.promoSubtitle}>行情卡、免佣卡等你来拿！</Text>
          </View>
          <Text style={styles.promoIcon}>🎁</Text>
        </View> */}

        {/* Quick Actions */}
        {/* <View style={styles.quickActions}>
          <View style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#4A90E2' }]}>
              <Ionicons name="gift" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>活动中心</Text>
            <Text style={styles.actionSubtitle}>精彩活动等您参与</Text>
          </View>
          <View style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#E5404A' }]}>
              <Ionicons name="ticket" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>邀请好友</Text>
            <Text style={styles.actionSubtitle}>邀请越多奖励越多</Text>
          </View>
          <View style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#F5A623' }]}>
              <Ionicons name="wallet" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>我的酱币</Text>
            <Text style={styles.actionSubtitle}>用酱币兑换好礼</Text>
          </View>
        </View> */}

        {/* VIP Card */}
        <TouchableOpacity
          style={styles.vipCard}
          onPress={() => router.push('/vip-purchase')}
          activeOpacity={0.9}
        >
          <View style={styles.vipContent}>
            <View style={styles.vipTitleRow}>
              <Ionicons name="diamond" size={20} color="#ffffff" />
              <Text style={styles.vipTitle}>{t('myPage.vipCenter')}</Text>
            </View>
            {!vipActive && (
              <Text style={styles.vipSubtitle}>{t('myPage.vipSubtitle')}</Text>
            )}
            {vipActive && (
              <Text style={styles.vipExpiryText}>
                {t('myPage.expiryDate')}: {formatVipExpiresAt(profile?.membership_expires_at || null)}
              </Text>
            )}
          </View>
          <View style={styles.vipButton}>
            <Text style={styles.vipButtonText}>
              {vipActive ? t('myPage.renew') : t('myPage.activate')} {'>'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Menu List 1 */}
        <View style={styles.menuCard}>
          {/* 交易所账户菜单 - 暂时隐藏 */}
          {false && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/profile/exchange-accounts')}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="pricetag" size={22} color="#8A919E" />
                  <Text style={styles.menuText}>交易所账户</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8A919E" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
            </>
          )}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/purchase-history')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="receipt-outline" size={22} color="#8A919E" />
              <Text style={styles.menuText}>{t('myPage.purchaseHistory')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A919E" />
          </TouchableOpacity>
          {/* 兑换记录 - 暂时隐藏 */}
          {/* <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profile/redemption-history')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="gift-outline" size={22} color="#8A919E" />
              <Text style={styles.menuText}>兑换记录</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A919E" />
          </TouchableOpacity> */}
        </View>

        {/* Menu List 2 */}
        <View style={styles.menuCard}>
          {/* 邀请好友菜单 - 暂时隐藏 */}
          {/* <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/invite-friends')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="person-add-outline" size={22} color="#8A919E" />
              <Text style={styles.menuText}>邀请好友</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A919E" />
          </TouchableOpacity>
          <View style={styles.menuDivider} /> */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/qrcode')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="call-outline" size={22} color="#8A919E" />
              <Text style={styles.menuText}>{t('myPage.contactSupport')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A919E" />
          </TouchableOpacity>
          {/* 设置入口 */}
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/settings')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="settings-outline" size={22} color="#8A919E" />
              <Text style={styles.menuText}>{t('myPage.settings')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A919E" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        {/* <View style={styles.myFooter}>
          <Ionicons name="information-circle-outline" size={14} color="#8A919E" />
          <Text style={styles.footerText}>中咨证券拥有香港证券全牌照</Text>
        </View> */}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'web' ? 0 : 50,
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      touchAction: 'pan-y' as any,
    }),
  },
  myHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myHeaderTitle: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: '600',
  },

  myHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.danger,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.textMain,
    fontSize: 10,
    fontWeight: 'bold',
  },
  myScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.textMain,
    fontSize: 28,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.yellow,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  vipBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1a1a1a',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  freeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.textMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  freeBadgeText: {
    color: COLORS.background,
    fontSize: 9,
    fontWeight: 'bold',
  },
  userInfo: {
    justifyContent: 'center',
  },
  username: {
    color: COLORS.textMain,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountId: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  qrCode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: COLORS.textMain,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  promoBanner: {
    backgroundColor: '#3A2D1F',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  promoTitle: {
    color: '#F5A623',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  promoSubtitle: {
    color: '#D4A574',
    fontSize: 12,
  },
  promoIcon: {
    fontSize: 48,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    width: '31%',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    color: COLORS.textMain,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  menuCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    color: COLORS.textMain,
    fontSize: 15,
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 54,
  },
  myFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 4,
  },
  vipCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vipContent: {
    flex: 1,
  },
  vipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vipTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  vipSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
  },
  vipExpiryText: {
    color: '#FFD700',
    fontSize: 11,
    marginTop: 4,
  },
  vipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  vipButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MyPage;
