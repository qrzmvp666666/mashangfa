import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { useTranslation } from '../lib/i18n';

const COLORS = {
  background: "#000000",
  surface: "#1c1c1e",
  textMain: "#ffffff",
  textSecondary: "#9ca3af",
  separator: "#2c2c2e",
  primary: "#3b82f6",
  white: "#ffffff",
};

const InviteData = [
  { id: '1', name: 'JohnDoe_99', userId: '8837219', time: '2023-10-24 14:30', type: 'gradient', colors: ['#a855f7', '#4f46e5'], initials: 'JD' },
  { id: '2', name: 'CryptoKing', userId: '5542100', time: '2023-10-23 09:15', type: 'image', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQCPO-vr4bvL8Sn6h_0ZJ7BYRCp-G3nikHK9iAf4gHdHHfMqL-YQmBcIBed38OTeDnZDxjP3MXS8xdIILQtvbC8ZSDfMESmGKQQTujkyYJRSFA9YCXK3KxVT71DNqtrTselfGSuLktR3PD5nar8cwg-rNRmgnpkokKo6oUBgDNohcqC6MAE8FGhWps3Q5Irr5ik9Nql3CUTa7VEtKzhcoJC8WYzS2K9N8G-ijGSRUpk1TK2eDN1MaJ-WufLg73bGgR2OUlww-FBg' },
  { id: '3', name: 'LuckyMoon', userId: '1102938', time: '2023-10-22 18:45', type: 'gradient', colors: ['#facc15', '#f97316'], initials: 'LM' },
  { id: '4', name: 'AliceTrader', userId: '7748392', time: '2023-10-21 11:20', type: 'image', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHE6URtBgjRlkzW3775DhyURByNnIgeD4kDjT1UcWfxFvt3_dBqnQDfzwpsvRIxtkTH7S7aQDmVoCsIeUalAOPDeZPCnc1wnkpwoq_bjdV1_yGr0xbkc_uBquzd67Ru4MPf6dAdiU5Tcudw-PP81Bn8unX0KxWfOZKqaO9jh_HSJezolZ1yHWramyz5d4LvXKZ-aK4ABgpdr3uMTt7CS7kAMDuzMIDfXWwAoBHFkrnxshwqW9tM2_tRZKyhUVdizHVIei0eDTASQ' },
  { id: '5', name: 'User_9921', userId: '9921000', time: '2023-10-20 16:10', type: 'icon', icon: 'person' },
  { id: '6', name: 'BitcoinMaxi', userId: '3321456', time: '2023-10-19 22:05', type: 'gradient', colors: ['#3b82f6', '#3b82f6'], initials: 'B' },
  { id: '7', name: 'DaveTheWave', userId: '6654321', time: '2023-10-18 08:30', type: 'image', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKjheuDYCORCjeK3rUE0IXHyeB_cPoLpYJXOSNQnk7SxVnbnMFX0XWbAxpAG2IKRlnkpTw9__QbdnVGTGX0lWlXN5cOixFjF2a5K9bp9BJ8GTWusz5hcQj2UsPocsdPtVNTIjb8ot3bz2vbTdxzlIQ7BsjyA6bFn2_n5wCO6yPfJ9SA6saNLdPTFHRgXbT2y2DAEmnvyaJmXbP_pjEqZSKtMT3or9CxQKBFtcwnn2KDMS9mOW05GmwwI7eP5PiSbm9xxK9YZpJtA' },
];

const GradientAvatar = ({ colors, initials }: { colors: string[], initials: string }) => (
  <View style={styles.avatarContainer}>
    <Svg height="40" width="40" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors[0]} stopOpacity="1" />
          <Stop offset="1" stopColor={colors[1] || colors[0]} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="40" height="40" rx="20" fill="url(#grad)" />
    </Svg>
    <Text style={styles.avatarInitials}>{initials}</Text>
  </View>
);

export default function InviteFriendsPage() {
  useProtectedRoute(); // 保护路由
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('inviteFriends.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>{t('inviteFriends.totalInvites')}</Text>
          <Text style={styles.statsValue}>128</Text>
        </View>

        {/* List Header */}
        <Text style={styles.listHeader}>{t('inviteFriends.recentInvites')}</Text>

        {/* List */}
        <View style={styles.listContainer}>
          {InviteData.map((item, index) => (
            <View key={item.id} style={[
              styles.listItem,
              index !== InviteData.length - 1 && styles.listItemBorder
            ]}>
              <View style={styles.itemLeft}>
                {item.type === 'image' ? (
                  <Image source={{ uri: item.url }} style={styles.avatarImage} />
                ) : item.type === 'gradient' ? (
                  <GradientAvatar colors={item.colors!} initials={item.initials!} />
                ) : (
                  <View style={[styles.avatarContainer, { backgroundColor: '#374151' }]}>
                    <MaterialIcons name="person" size={20} color="#d1d5db" />
                  </View>
                )}
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemId}>ID: {item.userId}</Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemLabel}>{t('inviteFriends.registerTime')}</Text>
                <Text style={styles.itemTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footerTextContainer}>
          <Text style={styles.footerText}>{t('inviteFriends.noMoreData')}</Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => router.push('/qrcode')}
        >
          <MaterialIcons name="person-add" size={20} color="black" />
          <Text style={styles.inviteButtonText}>{t('inviteFriends.inviteButton')}</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statsValue: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  listHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separator,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  avatarInitials: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    zIndex: 1,
  },
  itemName: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemId: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  itemTime: {
    color: '#d1d5db', // gray-300
    fontSize: 12,
    fontWeight: '500',
  },
  footerTextContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    color: '#4b5563', // gray-600
    fontSize: 12,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: 1,
    borderTopColor: COLORS.separator,
  },
  inviteButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  inviteButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
});
