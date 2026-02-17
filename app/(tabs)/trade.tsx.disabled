import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ExchangeAccountService } from '../../lib/exchangeAccountService';
import { ExchangeAccount } from '../../types';

// 可用的交易对选项
const AVAILABLE_CURRENCY_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'XRP/USDT',
  'DOGE/USDT',
  'ADA/USDT',
  'AVAX/USDT',
  'DOT/USDT',
  'MATIC/USDT',
  'LINK/USDT',
];

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

const NumberTicker = ({ value, style, duration = 1000 }: { value: string, style?: any, duration?: number }) => {
  const [displayValue, setDisplayValue] = useState("0.00");
  
  useEffect(() => {
    const isNegative = value.includes('-');
    const isPositive = value.includes('+');
    const cleanValue = value.replace(/,/g, '').replace(/[+\-]/g, '');
    const targetValue = parseFloat(cleanValue);
    
    if (isNaN(targetValue)) {
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    let animationFrameId: number;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4); // Ease out quart
      
      const currentValue = targetValue * ease;
      let formatted = currentValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      
      if (isPositive) formatted = '+' + formatted;
      if (isNegative) formatted = '-' + formatted;
      
      setDisplayValue(formatted);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return <Text style={style}>{displayValue}</Text>;
};

const TradePage: React.FC = () => {
  const router = useRouter();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'current_signals' | 'history_signals'>('current_signals');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [exchangeAccounts, setExchangeAccounts] = useState<ExchangeAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ExchangeAccount | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // 跟单设置状态
  const [maxCopyAmount, setMaxCopyAmount] = useState('1000');
  const [copyCurrencyPairs, setCopyCurrencyPairs] = useState<string[]>(AVAILABLE_CURRENCY_PAIRS);
  const [maxLeverage, setMaxLeverage] = useState('20');
  const [stopLossPercentage, setStopLossPercentage] = useState('5');
  const [maxSlippage, setMaxSlippage] = useState('0.5');

  // Real Data State
  const [balance, setBalance] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Aliases for compatibility
  const positionData = positions;

  const fetchExchangeData = async () => {
    if (!selectedAccount) return;
    
    if (!session?.access_token) {
      console.log('No access token available');
      return;
    }

    setLoadingData(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-exchange-data', {
        body: { exchangeAccountId: selectedAccount.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        return;
      }
      
      // Process Balance
      if (data.balance && !data.balance.error) {
          setBalance(data.balance);
      }
      
      // Process Positions
      if (data.positions && !data.positions.error) {
          const mappedPositions = Array.isArray(data.positions) ? data.positions.map((pos: any, index: number) => ({
              id: index,
              symbol: pos.symbol,
              name: pos.symbol.split('/')[0],
              shares: pos.contracts || pos.amount || 0,
              avgPrice: pos.entryPrice || 0,
              currentPrice: pos.markPrice || pos.lastPrice || 0,
              marketValue: (pos.contracts || pos.amount || 0) * (pos.markPrice || pos.lastPrice || 0),
              profit: pos.unrealizedPnl || 0,
              profitRate: pos.percentage || 0,
              isProfit: (pos.unrealizedPnl || 0) >= 0
          })) : [];
          setPositions(mappedPositions);
      } else {
          setPositions([]);
      }

      // Process Open Orders
      if (data.openOrders && !data.openOrders.error) {
           const mappedOrders = Array.isArray(data.openOrders) ? data.openOrders.map((order: any) => ({
               id: order.id,
               symbol: order.symbol,
               name: order.symbol.split('/')[0],
               type: order.side,
               orderType: order.type,
               shares: order.amount,
               orderPrice: order.price,
               status: order.status,
               time: order.datetime
           })) : [];
           setOpenOrders(mappedOrders);
      } else {
          setOpenOrders([]);
      }

      // Process History Orders
      if (data.historyOrders && !data.historyOrders.error) {
           const mappedHistory = Array.isArray(data.historyOrders) ? data.historyOrders.map((order: any) => ({
               id: order.id,
               symbol: order.symbol,
               name: order.symbol.split('/')[0],
               type: order.side,
               orderType: order.type,
               shares: order.amount,
               orderPrice: order.price,
               avgPrice: order.average,
               status: order.status,
               time: order.datetime
           })) : [];
           setHistoryOrders(mappedHistory);
      } else {
          setHistoryOrders([]);
      }

    } catch (err) {
      console.error('Error fetching exchange data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedAccount && session?.access_token) {
      fetchExchangeData();
    }
  }, [selectedAccount, session]);

  const orderData = openOrders;
  const historyData = historyOrders;

  // 加载交易所账户
  useEffect(() => {
    loadExchangeAccounts();
  }, []);

  const loadExchangeAccounts = async () => {
    try {
      setLoadingAccounts(true);
      // 直接获取已启用的账户
      const enabledAccounts = await ExchangeAccountService.getEnabledExchangeAccounts();
      setExchangeAccounts(enabledAccounts);
      
      // 如果当前选中的账户已经被禁用或删除，则重新选择第一个账户
      if (selectedAccount) {
        const stillExists = enabledAccounts.find(acc => acc.id === selectedAccount.id);
        if (!stillExists && enabledAccounts.length > 0) {
          setSelectedAccount(enabledAccounts[0]);
        } else if (stillExists) {
          // 更新选中账户的数据（可能昵称等信息已更改）
          setSelectedAccount(stillExists);
        }
      } else if (enabledAccounts.length > 0) {
        // 如果之前没有选中账户，选择第一个
        setSelectedAccount(enabledAccounts[0]);
      }
    } catch (error) {
      console.error('加载交易所账户失败:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSelectAccount = (account: ExchangeAccount) => {
    setSelectedAccount(account);
    setShowAccountModal(false);
  };

  const handleOpenAccountModal = () => {
    setShowAccountModal(true);
    // 每次打开模态框时重新获取最新数据
    loadExchangeAccounts();
  };

  const getExchangeIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    const icons: { [key: string]: { icon: string; bg: string; color: string } } = {
      'binance': { icon: 'B', bg: '#FCD535', color: '#000000' },
      'bitget': { icon: 'Bg', bg: '#00F0E6', color: '#000000' },
      'okx': { icon: 'O', bg: '#FFFFFF', color: '#000000' },
      'bybit': { icon: 'B', bg: '#F7A600', color: '#000000' },
      'coinbase': { icon: 'C', bg: '#0052FF', color: '#FFFFFF' },
      'kraken': { icon: 'K', bg: '#5741D9', color: '#FFFFFF' },
      'huobi': { icon: 'H', bg: '#2EAEF0', color: '#FFFFFF' },
    };
    return icons[lowerName] || { icon: name[0]?.toUpperCase() || 'E', bg: '#666666', color: '#FFFFFF' };
  };

  return (
    <View style={styles.container}>
      {/* Header with Account Selector */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.accountInfo} 
          onPress={handleOpenAccountModal}
        >
          {selectedAccount && selectedAccount.exchanges ? (
            <>
              <View style={[
                styles.exchangeIconSmall,
                { backgroundColor: getExchangeIcon(selectedAccount.exchanges.name).bg }
              ]}>
                <Text style={[
                  styles.exchangeIconTextSmall,
                  { color: getExchangeIcon(selectedAccount.exchanges.name).color }
                ]}>
                  {getExchangeIcon(selectedAccount.exchanges.name).icon}
                </Text>
              </View>
              <Text style={styles.accountName}>{selectedAccount.account_nickname}</Text>
              <Ionicons name="chevron-down" size={18} color="#8A919E" style={{ marginLeft: 4 }} />
            </>
          ) : (
            <>
              <View style={styles.okxIcon}>
                <Text style={styles.okxText}>OKX</Text>
              </View>
              <Text style={styles.accountName}>我的账户(1001)</Text>
              <Ionicons name="chevron-down" size={18} color="#8A919E" style={{ marginLeft: 4 }} />
            </>
          )}
        </TouchableOpacity>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={24} color="#EAEBEF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/profile/exchange-accounts/edit')}
          >
            <Ionicons name="add" size={28} color="#EAEBEF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>

        {/* Primary Navigation - 暂时隐藏 */}
        {/* <View style={styles.primaryNav}>
          <TouchableOpacity style={styles.navItemActive}>
            <Text style={styles.navTextActive}>资产</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navText}>分析</Text>
          </TouchableOpacity>
        </View> */}

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={[styles.cardHeader, { marginBottom: 4 }]}>
            <View style={styles.assetLabel}>
              <Text style={styles.assetLabelText}>累计跟单收益 (USDT)</Text>
              <Ionicons name="eye-outline" size={16} color="#666" style={{ marginLeft: 8 }} />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 0 }}>
            <NumberTicker 
              value="0.00" 
              style={[styles.mainBalance, { marginBottom: 4 }]} 
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 0 }}>
            <Text style={{ color: '#999', fontSize: 14 }}>跟单收益率</Text>
            <Text style={{ color: '#2ebd85', fontSize: 14, marginLeft: 8 }}>+0.00%</Text>
            <Ionicons name="chevron-forward" size={14} color="#666" style={{ marginLeft: 4 }} />
          </View>
          
          <View style={{ height: 1, backgroundColor: '#2A2A2A', marginVertical: 12 }} />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ width: '50%', marginBottom: 16 }}>
              <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>总跟单金额</Text>
              <NumberTicker 
                value={balance?.total?.USDT ? parseFloat(balance.total.USDT).toFixed(2) : "0.00"} 
                style={{ color: '#fff', fontSize: 16, fontWeight: '600' }} 
              />
            </View>
            <View style={{ width: '50%', marginBottom: 16 }}>
              <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>累计跟单笔数</Text>
              <NumberTicker 
                value="0" 
                style={{ color: '#fff', fontSize: 16, fontWeight: '600' }} 
              />
            </View>
            <View style={{ width: '50%' }}>
              <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>胜率</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>0%</Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>盈亏比</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>0.0</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {/* <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>入金</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>充币</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>交易</Text>
          </TouchableOpacity>
        </View> */}

        {/* Secondary Navigation */}
        <View style={styles.secondaryNav}>
          <TouchableOpacity 
            style={activeTab === 'current_signals' ? styles.navItemActive : styles.navItem}
            onPress={() => setActiveTab('current_signals')}
          >
            <Text style={activeTab === 'current_signals' ? styles.navTextActive : styles.navText}>当前跟单</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={activeTab === 'history_signals' ? styles.navItemActive : styles.navItem}
            onPress={() => setActiveTab('history_signals')}
          >
            <Text style={activeTab === 'history_signals' ? styles.navTextActive : styles.navText}>历史跟单</Text>
          </TouchableOpacity>
        </View>

        {/* 当前跟单信号列表 (模拟数据) */}
        {activeTab === 'current_signals' && [
          { id: 1, symbol: 'BTC/USDT', type: 'long', entryPrice: 98000, currentPrice: 98500, pnl: 500, pnlRate: 0.51, time: '2026-01-05 10:00', leverage: 20, takeProfit: 100000, stopLoss: 95000 },
          { id: 2, symbol: 'ETH/USDT', type: 'short', entryPrice: 3500, currentPrice: 3480, pnl: 20, pnlRate: 0.57, time: '2026-01-05 11:30', leverage: 10, takeProfit: 3300, stopLoss: 3600 },
        ].map((signal) => {
          const isLong = signal.type === 'long';
          const statusBgColor = isLong ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)';
          const statusTextColor = isLong ? COLORS.primary : COLORS.danger;
          
          return (
            <View key={signal.id} style={styles.signalCard}>
              <View style={styles.signalCardHeader}>
                <Text style={styles.signalPairText}>{signal.symbol} 永续</Text>
                <View style={[styles.signalStatusTag, { backgroundColor: statusBgColor }]}>
                  <Text style={[styles.signalStatusText, { color: statusTextColor }]}>
                    {isLong ? '做多' : '做空'}
                  </Text>
                </View>
                <View style={styles.signalLeverageTag}>
                  <Text style={styles.signalLeverageText}>{signal.leverage}x</Text>
                </View>
              </View>

              <View style={styles.signalInfoGrid}>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>入场价</Text>
                  <Text style={styles.signalInfoValue}>{signal.entryPrice}</Text>
                </View>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>仓位模式</Text>
                  <Text style={styles.signalInfoValue}>全仓</Text>
                </View>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>委托时间</Text>
                  <Text style={styles.signalInfoValue}>{signal.time.split(' ')[1]}</Text>
                </View>
              </View>

              <View style={styles.signalInfoGrid}>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>止盈价</Text>
                  <Text style={[styles.signalInfoValue, { color: COLORS.primary }]}>{signal.takeProfit}</Text>
                </View>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>止损价</Text>
                  <Text style={[styles.signalInfoValue, { color: COLORS.danger }]}>{signal.stopLoss}</Text>
                </View>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>盈亏比</Text>
                  <Text style={[styles.signalInfoValue, { color: '#F0B90B' }]}>2.5:1</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* 历史跟单信号列表 (模拟数据) */}
        {activeTab === 'history_signals' && [
          { id: 3, symbol: 'SOL/USDT', type: 'long', entryPrice: 190, exitPrice: 195, pnl: 5, pnlRate: 2.63, time: '2026-01-04 14:00', status: '已平仓', leverage: 20, takeProfit: 200, stopLoss: 180 },
          { id: 4, symbol: 'XRP/USDT', type: 'short', entryPrice: 2.55, exitPrice: 2.54, pnl: 0.01, pnlRate: 0.39, time: '2026-01-03 09:15', status: '已平仓', leverage: 10, takeProfit: 2.4, stopLoss: 2.6 },
        ].map((signal) => {
          const isLong = signal.type === 'long';
          const statusBgColor = isLong ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)';
          const statusTextColor = isLong ? COLORS.primary : COLORS.danger;

          return (
            <View key={signal.id} style={styles.signalCard}>
              <View style={styles.signalCardHeader}>
                <Text style={styles.signalPairText}>{signal.symbol} 永续</Text>
                <View style={[styles.signalStatusTag, { backgroundColor: statusBgColor }]}>
                  <Text style={[styles.signalStatusText, { color: statusTextColor }]}>
                    {isLong ? '做多' : '做空'}
                  </Text>
                </View>
                <View style={styles.signalLeverageTag}>
                  <Text style={styles.signalLeverageText}>{signal.leverage}x</Text>
                </View>
              </View>

              <View style={styles.signalInfoGrid}>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>入场价</Text>
                  <Text style={styles.signalInfoValue}>{signal.entryPrice}</Text>
                </View>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>仓位模式</Text>
                  <Text style={styles.signalInfoValue}>全仓</Text>
                </View>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>委托时间</Text>
                  <Text style={styles.signalInfoValue}>{signal.time.split(' ')[1]}</Text>
                </View>
              </View>

              <View style={styles.signalInfoGrid}>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>止盈价</Text>
                  <Text style={[styles.signalInfoValue, { color: COLORS.primary }]}>{signal.takeProfit}</Text>
                </View>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>止损价</Text>
                  <Text style={[styles.signalInfoValue, { color: COLORS.danger }]}>{signal.stopLoss}</Text>
                </View>
                <View style={styles.signalGridItem}>
                  <Text style={styles.signalInfoLabel}>盈亏比</Text>
                  <Text style={[styles.signalInfoValue, { color: '#F0B90B' }]}>2.5:1</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Account Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAccountModal}
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAccountModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>选择交易所账户</Text>
                <TouchableOpacity onPress={() => setShowAccountModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>

              {/* Account List */}
              <ScrollView style={styles.modalScroll}>
                {loadingAccounts ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.textMain} />
                  </View>
                ) : exchangeAccounts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>暂无已启用的交易所账户</Text>
                    <TouchableOpacity
                      style={styles.createAccountButton}
                      onPress={() => {
                        setShowAccountModal(false);
                        router.push('/profile/exchange-accounts/edit');
                      }}
                    >
                      <Text style={styles.createAccountButtonText}>创建账户</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  exchangeAccounts.map((account) => {
                    const exchangeIcon = account.exchanges
                      ? getExchangeIcon(account.exchanges.name)
                      : { icon: 'E', bg: '#666666', color: '#FFFFFF' };
                    const isSelected = selectedAccount?.id === account.id;
                    return (
                      <TouchableOpacity
                        key={account.id}
                        style={[
                          styles.accountItem,
                          isSelected && styles.accountItemSelected
                        ]}
                        onPress={() => handleSelectAccount(account)}
                      >
                        <View style={styles.accountLeft}>
                          <View style={[
                            styles.accountIcon,
                            { backgroundColor: exchangeIcon.bg }
                          ]}>
                            <Text style={[
                              styles.accountIconText,
                              { color: exchangeIcon.color }
                            ]}>
                              {exchangeIcon.icon}
                            </Text>
                          </View>
                          <Text style={styles.accountNameText}>{account.account_nickname}</Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.textMain} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Copy Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSettingsModal}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowSettingsModal(false)}
          />
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>账户跟单设置</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* 最大跟单金额 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>最大跟单金额 (USDT)</Text>
                <TextInput
                  style={styles.formInput}
                  value={maxCopyAmount}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9]/g, '');
                    setMaxCopyAmount(filtered);
                  }}
                  keyboardType="number-pad"
                  placeholder="请输入最大跟单金额"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {/* 跟单币种范围 - 两列布局 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>跟单币种范围</Text>
                <View style={styles.currencyPairsGrid}>
                  {AVAILABLE_CURRENCY_PAIRS.map((pair) => {
                    const isSelected = copyCurrencyPairs.includes(pair);
                    return (
                      <TouchableOpacity
                        key={pair}
                        style={[
                          styles.currencyPairItem,
                          isSelected && styles.currencyPairItemSelected,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setCopyCurrencyPairs(copyCurrencyPairs.filter(p => p !== pair));
                          } else {
                            setCopyCurrencyPairs([...copyCurrencyPairs, pair]);
                          }
                        }}
                      >
                        <Text style={[
                          styles.currencyPairText,
                          isSelected && styles.currencyPairTextSelected,
                        ]}>
                          {pair}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 最大杠杆 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>最大杠杆 (倍)</Text>
                <TextInput
                  style={styles.formInput}
                  value={maxLeverage}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9]/g, '');
                    setMaxLeverage(filtered);
                  }}
                  keyboardType="number-pad"
                  placeholder="请输入最大杠杆倍数"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {/* 单笔止损百分比 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>单笔止损百分比 (%)</Text>
                <TextInput
                  style={styles.formInput}
                  value={stopLossPercentage}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9.]/g, '');
                    setStopLossPercentage(filtered);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="请输入止损百分比"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {/* 允许最大滑点 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>允许最大滑点 (%)</Text>
                <TextInput
                  style={styles.formInput}
                  value={maxSlippage}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9.]/g, '');
                    setMaxSlippage(filtered);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="请输入最大滑点"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => {
                  // TODO: 保存设置到数据库
                  console.log('保存跟单设置:', {
                    maxCopyAmount,
                    copyCurrencyPairs,
                    maxLeverage,
                    stopLossPercentage,
                    maxSlippage,
                  });
                  setShowSettingsModal(false);
                }}
              >
                <Text style={styles.modalConfirmButtonText}>保存设置</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  headerTitle: {
    color: COLORS.textMain,
    fontSize: 20,
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  okxIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  okxText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  accountName: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryNav: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
    marginTop: -8,
    marginHorizontal: 16,
    gap: 24,
  },
  navItem: {
    paddingVertical: 8,
  },
  navItemActive: {
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.textMain,
  },
  navText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  navTextActive: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assetLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetLabelText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  currencyBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencyText: {
    color: COLORS.textMain,
    fontSize: 12,
  },
  arrow: {
    color: COLORS.textMuted,
    fontSize: 20,
  },
  mainBalance: {
    color: COLORS.textMain,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '30%',
    marginBottom: 12,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: COLORS.textMain,
    fontSize: 13,
  },
  greenText: {
    color: COLORS.primary,
  },
  redText: {
    color: COLORS.danger,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.textMain,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryNav: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
    marginHorizontal: 16,
    gap: 24,
  },
  positionCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  symbolTitle: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: '600',
  },
  symbolSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: 'normal',
  },
  profitText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  positionMetrics: {
    gap: 16,
  },
  orderMetrics: {
    gap: 16,
    marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: '600',
  },
  strategyCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
  },
  strategyTitle: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: '600',
  },
  strategySubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: 'normal',
  },
  strategyProfit: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  strategyStatus: {
    alignItems: 'flex-end',
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  strategyMetrics: {
    gap: 16,
  },
  metricRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCol: {
    flex: 1,
  },
  strategyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '35%',
    maxHeight: '70%',
  },
  modalContent: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    minHeight: 280,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  modalScroll: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  createAccountButton: {
    backgroundColor: COLORS.textMain,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createAccountButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  accountItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountIconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  accountNameText: {
    fontSize: 16,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  exchangeIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exchangeIconTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Signal Card Styles
  signalCard: {
    backgroundColor: COLORS.surfaceLight,
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
    fontSize: 16,
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 'auto',
  },
  signalCopyButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
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
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  signalInfoValue: {
    color: COLORS.textMain,
    fontSize: 13,
    fontWeight: '500',
  },
  // Copy Settings Modal Styles
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelButtonText: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  formInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textMain,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Currency Pairs Grid (Two columns)
  currencyPairsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyPairItem: {
    width: '48%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  currencyPairItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(46, 189, 133, 0.1)',
  },
  currencyPairText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: '500',
  },
  currencyPairTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default TradePage;
