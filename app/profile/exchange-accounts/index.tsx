import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useProtectedRoute } from '../../../hooks/useProtectedRoute';
import { ExchangeAccountService } from '../../../lib/exchangeAccountService';
import { ExchangeAccount } from '../../../types';
import Toast from '../../../components/Toast';

const COLORS = {
  background: "#000000",
  card: "#1c1c1e",
  text: "#ffffff",
  textSecondary: "#9ca3af",
  border: "#27272a",
  primary: "#ffffff", // Changed to white
  success: "#2ebd85", // Green
  danger: "#f6465d", // Red
  warning: "#eab308", // Yellow
  warningBg: "rgba(234, 179, 8, 0.1)",
};

export default function ExchangeAccountsList() {
  useProtectedRoute(); // 保护路由
  const router = useRouter();
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    enabled: 0,
    normal: 0,
    expired: 0,
    suspended: 0,
  });

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      // 只调用一个接口获取账户数据
      const accountsData = await ExchangeAccountService.getExchangeAccounts();
      setAccounts(accountsData);
      
      // 在前端计算统计数据，避免重复查询数据库
      const calculatedStats = {
        total: accountsData.length,
        enabled: accountsData.filter(a => a.is_enabled).length,
        normal: accountsData.filter(a => a.status === 'normal').length,
        expired: accountsData.filter(a => a.status === 'expired').length,
        suspended: accountsData.filter(a => a.status === 'suspended').length,
      };
      setStats(calculatedStats);
    } catch (error) {
      console.error('加载账户失败:', error);
      showToast('加载账户信息失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccount = async (id: string, currentStatus: boolean) => {
    try {
      await ExchangeAccountService.toggleExchangeAccount(id, !currentStatus);
      await loadAccounts();
      showToast(`账户已${!currentStatus ? '启用' : '禁用'}`, 'success');
    } catch (error) {
      console.error('切换账户状态失败:', error);
      showToast('操作失败，请重试', 'error');
    }
  };

  const handleDeleteAccount = (id: string) => {
    Alert.alert(
      '确认删除',
      '删除后将无法恢复，确定要删除该账户吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await ExchangeAccountService.deleteExchangeAccount(id);
              await loadAccounts();
              showToast('账户已删除', 'success');
            } catch (error) {
              console.error('删除账户失败:', error);
              showToast('删除失败，请重试', 'error');
            }
          },
        },
      ]
    );
  };

  const getExchangeLogo = (exchangeName: string) => {
    const name = exchangeName.toLowerCase();
    const logos: { [key: string]: { bg: string; color: string; letter: string } } = {
      'binance': { bg: '#FCD535', color: '#000000', letter: 'B' },
      'okx': { bg: '#FFFFFF', color: '#000000', letter: 'OKX' },
      'bybit': { bg: '#F7A600', color: '#000000', letter: 'B' },
      'coinbase': { bg: '#0052FF', color: '#FFFFFF', letter: 'C' },
      'kraken': { bg: '#5741D9', color: '#FFFFFF', letter: 'K' },
      'huobi': { bg: '#2EAEF0', color: '#FFFFFF', letter: 'H' },
    };
    return logos[name] || { bg: '#666666', color: '#FFFFFF', letter: exchangeName[0]?.toUpperCase() || 'E' };
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'spot': '现货',
      'futures': '合约',
      'margin': '杠杆',
    };
    return labels[type] || type;
  };

  const getAccountModeLabel = (mode: string) => {
    const labels: { [key: string]: string } = {
      'real': '真实',
      'demo': '模拟',
    };
    return labels[mode] || mode;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'normal': '正常',
      'expired': '授权过期',
      'suspended': '已暂停',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'normal': COLORS.success,
      'expired': COLORS.danger,
      'suspended': COLORS.warning,
    };
    return colors[status] || COLORS.textSecondary;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/my')}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>交易所账户管理</Text>
          <TouchableOpacity 
            onPress={() => {
              console.log('Navigating to edit page');
              router.push('/profile/exchange-accounts/edit');
            }}
            style={styles.iconButton}
          >
            <Text style={styles.headerAction}>添加</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Stats Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>账户总数</Text>
              <Text style={styles.cardLabel}>启用中</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statsNumber}>{stats.total}</Text>
                <Text style={styles.statsUnit}>个账户</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statsNumber, { color: COLORS.success }]}>{stats.enabled}</Text>
              </View>
            </View>
          </View>

          {accounts.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>已连接账户</Text>

              {accounts.map((account) => {
                const exchangeName = account.exchanges?.display_name || account.exchanges?.name || 'Unknown';
                const logo = getExchangeLogo(account.exchanges?.name || '');
                return (
                  <TouchableOpacity
                    key={account.id}
                    style={styles.accountCard}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/profile/exchange-accounts/edit?id=${account.id}`)}
                  >
                    <View style={styles.accountInfo}>
                      <View style={[styles.logoContainer, { backgroundColor: logo.bg }]}>
                        <Text style={[styles.logoText, { color: logo.color }]}>
                          {logo.letter}
                        </Text>
                        <View style={styles.statusDotContainer}>
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor: account.is_enabled
                                  ? COLORS.success
                                  : COLORS.textSecondary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={styles.accountDetails}>
                        <View style={styles.accountNameRow}>
                          <Text style={styles.accountName}>{exchangeName}</Text>
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>
                              {getAccountTypeLabel(account.account_type)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.tag,
                              {
                                backgroundColor:
                                  account.account_mode === 'real'
                                    ? 'rgba(46, 189, 133, 0.15)'
                                    : 'rgba(234, 179, 8, 0.15)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagText,
                                {
                                  color:
                                    account.account_mode === 'real'
                                      ? COLORS.success
                                      : COLORS.warning,
                                },
                              ]}
                            >
                              {getAccountModeLabel(account.account_mode)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.accountSubtext}>
                          {account.account_nickname}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.accountAction}>
                      <Text
                        style={[
                          styles.statusLabel,
                          { color: account.is_enabled ? COLORS.success : COLORS.textSecondary },
                        ]}
                      >
                        {account.is_enabled ? '正常' : '禁用'}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="account-balance-wallet" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>暂无交易所账户</Text>
              <Text style={styles.emptySubtext}>点击右上角"添加"按钮添加您的第一个账户</Text>
            </View>
          )}

          {/* Security Warning - Hidden */}
          {/* <View style={styles.warningCard}>
            <MaterialIcons name="security" size={20} color={COLORS.warning} style={{ marginTop: 2 }} />
            <View style={styles.warningContent}>
              <Text style={styles.warningText}>
                为了您的资金安全，请确保API Key仅开启了交易权限，并未开启提现权限。
              </Text>
            </View>
          </View> */}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      touchAction: 'pan-y' as any,
      paddingTop: 0,
    }),
  },
  safeArea: {
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerAction: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: 'rgba(46, 189, 133, 0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  statsNumber: {
    fontSize: 30,
    fontWeight: 'bold',
    marginRight: 4,
    color: COLORS.text,
  },
  statsUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  statsSubNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 8,
    color: COLORS.textSecondary,
  },
  accountCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoText: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  statusDotContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accountDetails: {
    marginLeft: 16,
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    backgroundColor: '#2C2C2E',
  },
  tagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D1D5DB',
  },
  accountSubtext: {
    fontSize: 14,
    marginTop: 2,
    color: COLORS.textSecondary,
  },
  accountAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warningBg,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 8,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
