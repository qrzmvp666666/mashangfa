import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Switch, StyleSheet, Platform, ActivityIndicator, Modal, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useProtectedRoute } from '../../../hooks/useProtectedRoute';
import { ExchangeAccountService, ExchangeService } from '../../../lib/exchangeAccountService';
import { Exchange, AccountType, AccountMode } from '../../../types';
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
  warning: "#ffffff", // Changed to white
  warningBg: "rgba(255, 255, 255, 0.1)", // Changed to white tint
  inputPlaceholder: "#6B7280",
};

// Helper to remove focus outline on web
const removeOutline = Platform.OS === 'web' ? { outline: 'none' } as any : {};

export default function EditExchangeAccount() {
  useProtectedRoute(); // 保护路由
  const router = useRouter();
  const params = useLocalSearchParams();
  const accountId = params.id as string | undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  
  // Form state
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('futures');
  const [accountMode, setAccountMode] = useState<AccountMode>('real');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [accountNickname, setAccountNickname] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  // Password visibility state
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 处理键盘事件，修复移动端浏览器键盘收起后的空白区域问题
  useEffect(() => {
    if (Platform.OS === 'web') {
      // 强制页面滚动到顶部并重置视口
      const resetViewport = () => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        
        // 强制重新计算视口高度
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // 强制重绘
        document.body.style.height = `${window.innerHeight}px`;
        setTimeout(() => {
          document.body.style.height = '';
        }, 100);
      };

      // 监听输入框失焦事件
      const handleBlur = () => {
        setTimeout(resetViewport, 100);
      };

      // 监听窗口大小变化
      const handleResize = () => {
        resetViewport();
      };

      // 初始设置
      resetViewport();

      // 监听所有可能触发键盘的事件
      document.addEventListener('focusout', handleBlur);
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      // 监听视觉视口变化（更准确地检测键盘）
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', resetViewport);
      }

      return () => {
        document.removeEventListener('focusout', handleBlur);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
          window.visualViewport.removeEventListener('scroll', resetViewport);
        }
      };
    }
  }, []);

  useEffect(() => {
    loadExchanges();
    if (accountId) {
      loadAccount();
    }
  }, [accountId]);

  const loadExchanges = async () => {
    try {
      const exchangesList = await ExchangeService.getExchanges();
      setExchanges(exchangesList);
      if (!accountId && exchangesList.length > 0) {
        // 默认选择 OKX，如果没有则选第一个
        const okxExchange = exchangesList.find(ex => ex.name.toLowerCase() === 'okx');
        setSelectedExchange(okxExchange || exchangesList[0]);
      }
    } catch (error) {
      console.error('加载交易所列表失败:', error);
    }
  };

  const handleSelectExchange = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    setShowExchangeModal(false);
  };

  const getExchangeIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    const icons: { [key: string]: { icon: string; bg: string; color: string } } = {
      'binance': { icon: 'B', bg: '#FCD535', color: '#000000' },
      'okx': { icon: 'O', bg: '#FFFFFF', color: '#000000' },
      'bybit': { icon: 'B', bg: '#F7A600', color: '#000000' },
      'coinbase': { icon: 'C', bg: '#0052FF', color: '#FFFFFF' },
      'kraken': { icon: 'K', bg: '#5741D9', color: '#FFFFFF' },
      'huobi': { icon: 'H', bg: '#2EAEF0', color: '#FFFFFF' },
    };
    return icons[lowerName] || { icon: name[0]?.toUpperCase() || 'E', bg: '#666666', color: '#FFFFFF' };
  };

  const loadAccount = async () => {
    try {
      setLoading(true);
      const account = await ExchangeAccountService.getExchangeAccountById(accountId!);
      if (account) {
        if (account.exchanges) {
          setSelectedExchange(account.exchanges as Exchange);
        }
        setAccountType(account.account_type);
        setAccountMode(account.account_mode);
        setApiKey(account.api_key);
        setSecretKey(account.secret_key);
        setPassphrase(account.passphrase || '');
        setAccountNickname(account.account_nickname);
        setIsEnabled(account.is_enabled);
      }
    } catch (error) {
      console.error('加载账户失败:', error);
      showToast('加载账户信息失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!selectedExchange) {
      showToast('请选择交易所', 'warning');
      return;
    }
    if (!apiKey.trim()) {
      showToast('请输入 API Key', 'warning');
      return;
    }
    if (!secretKey.trim()) {
      showToast('请输入 Secret Key', 'warning');
      return;
    }
    if (!accountNickname.trim()) {
      showToast('请输入账户名称', 'warning');
      return;
    }

    // Check if passphrase is required
    const exchangesRequiringPassphrase = ['bitget', 'okx', 'kucoin'];
    if (selectedExchange && exchangesRequiringPassphrase.includes(selectedExchange.name.toLowerCase()) && !passphrase.trim()) {
      showToast(`${selectedExchange.display_name || selectedExchange.name} 需要输入 Passphrase`, 'warning');
      return;
    }

    try {
      setSaving(true);
      if (accountId) {
        // Update existing account
        await ExchangeAccountService.updateExchangeAccount(accountId, {
          exchange_id: selectedExchange.id,
          account_type: accountType,
          account_mode: accountMode,
          api_key: apiKey,
          secret_key: secretKey,
          passphrase: passphrase || undefined,
          account_nickname: accountNickname,
          is_enabled: isEnabled,
        });
        showToast('账户已更新', 'success');
        setTimeout(() => router.push('/profile/exchange-accounts'), 1500);
      } else {
        // Create new account
        await ExchangeAccountService.createExchangeAccount({
          exchange_id: selectedExchange.id,
          account_type: accountType,
          account_mode: accountMode,
          api_key: apiKey,
          secret_key: secretKey,
          passphrase: passphrase || undefined,
          account_nickname: accountNickname,
          is_enabled: isEnabled,
        });
        showToast('账户已添加', 'success');
        setTimeout(() => router.push('/profile/exchange-accounts'), 1500);
      }
    } catch (error: any) {
      console.error('保存账户失败:', error);
      
      // 根据错误类型显示友好的错误信息
      let errorMessage = '保存失败，请重试';
      
      if (error.code === '23505') {
        // 检查错误详情中是否包含唯一约束名称
        const errorDetail = error.message || '';
        if (errorDetail.includes('exchange_accounts_user_exchange_type_mode_nickname_unique')) {
          const modeLabel = accountMode === 'real' ? '真实' : '模拟';
          const typeLabel = accountType === 'spot' ? '现货' : accountType === 'futures' ? '合约' : '杠杆';
          errorMessage = `该交易所已存在名为"${accountNickname}"的${modeLabel}${typeLabel}账户，请使用不同的名称`;
        } else {
          errorMessage = '该账户已存在';
        }
      } else if (error.code === '23502') {
        errorMessage = '必填字段未填写，请检查表单';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!accountId) return;
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!accountId) return;
    
    setDeleteModalVisible(false);
    
    try {
      await ExchangeAccountService.deleteExchangeAccount(accountId);
      showToast('账户已删除', 'success');
      setTimeout(() => router.push('/profile/exchange-accounts'), 1500);
    } catch (error) {
      console.error('删除账户失败:', error);
      showToast('删除失败，请重试', 'error');
    }
  };

  const toggleSwitch = () => setIsEnabled(previousState => !previousState);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>加载中...</Text>
            <View style={styles.iconButton} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      enabled={Platform.OS !== 'web'}
    >
      <StatusBar style="light" />
      {/* Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.push('/profile')}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {accountId ? '编辑交易所账户' : '新增交易所账户'}
          </Text>
          <TouchableOpacity 
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.saveButtonText}>保存</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => Keyboard.dismiss()}
        scrollEventThrottle={16}
      >
        {/* Exchange Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            交易所信息
          </Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.cardRow}
              onPress={() => setShowExchangeModal(true)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="account-balance" size={18} color="#9CA3AF" />
                </View>
                <Text style={styles.rowLabel}>选择交易所</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{selectedExchange?.display_name || '请选择'}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* API Config */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            API 配置
          </Text>
          <View style={styles.card}>
            {/* API Key */}
            <View style={styles.inputRow}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>API Key</Text>
              </View>
              <View style={styles.inputWithIcon}>
                <TextInput 
                  style={[styles.inputFlexible, removeOutline]}
                  placeholder="输入 Access Key"
                  placeholderTextColor={COLORS.inputPlaceholder}
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  secureTextEntry={!showApiKey}
                />
                {apiKey.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setApiKey('')}
                    style={styles.clearIcon}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={18} 
                      color={COLORS.textSecondary} 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => setShowApiKey(!showApiKey)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showApiKey ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Secret Key */}
            <View style={styles.inputRow}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Secret Key</Text>
              </View>
              <View style={styles.inputWithIcon}>
                <TextInput 
                  style={[styles.inputFlexible, removeOutline]}
                  placeholder="输入 Secret Key"
                  placeholderTextColor={COLORS.inputPlaceholder}
                  secureTextEntry={!showSecretKey}
                  value={secretKey}
                  onChangeText={setSecretKey}
                  autoCapitalize="none"
                />
                {secretKey.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setSecretKey('')}
                    style={styles.clearIcon}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={18} 
                      color={COLORS.textSecondary} 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => setShowSecretKey(!showSecretKey)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showSecretKey ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Passphrase */}
            <View style={styles.inputRowNoBorder}>
              <Text style={[styles.inputLabel, { marginBottom: 8 }]}>
                Passphrase <Text style={
                  selectedExchange && ['bitget', 'okx', 'kucoin'].includes(selectedExchange.name.toLowerCase())
                    ? styles.requiredText
                    : styles.optionalText
                }>
                  {selectedExchange && ['bitget', 'okx', 'kucoin'].includes(selectedExchange.name.toLowerCase())
                    ? '(必填)'
                    : '(选填)'}
                </Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput 
                  style={[styles.inputFlexible, removeOutline]}
                  placeholder="输入口令 (部分交易所需要)"
                  placeholderTextColor={COLORS.inputPlaceholder}
                  secureTextEntry={!showPassphrase}
                  value={passphrase}
                  onChangeText={setPassphrase}
                  autoCapitalize="none"
                />
                {passphrase.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setPassphrase('')}
                    style={styles.clearIcon}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={18} 
                      color={COLORS.textSecondary} 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => setShowPassphrase(!showPassphrase)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showPassphrase ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            账户设置
          </Text>
          <View style={styles.card}>
            <View style={[styles.cardRow, { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
              <Text style={styles.rowLabel}>账户名称</Text>
              <View style={styles.inputWithIconRight}>
                <TextInput 
                  style={[styles.inputRight, removeOutline]}
                  placeholder="例如: 币安主账户"
                  placeholderTextColor={COLORS.inputPlaceholder}
                  value={accountNickname}
                  onChangeText={setAccountNickname}
                />
                {accountNickname.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setAccountNickname('')}
                    style={styles.clearIconRight}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={18} 
                      color={COLORS.textSecondary} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Account Mode Selection - 账户模式 (真实/模拟) */}
            <View style={[styles.cardRow, { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
              <Text style={styles.rowLabel}>账户模式</Text>
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    accountMode === 'real' && styles.modeButtonActive,
                  ]}
                  onPress={() => setAccountMode('real')}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      accountMode === 'real' && styles.modeButtonTextActive,
                    ]}
                  >
                    真实
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    accountMode === 'demo' && styles.modeButtonActive,
                  ]}
                  onPress={() => setAccountMode('demo')}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      accountMode === 'demo' && styles.modeButtonTextActive,
                    ]}
                  >
                    模拟
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Account Type Selection - 账户类型 (现货/合约/杠杆) */}
            <View style={[styles.cardRow, { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
              <Text style={styles.rowLabel}>账户类型</Text>
              <View style={styles.modeSelector}>
                <View
                  style={[
                    styles.typeButton,
                    styles.typeButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      styles.typeButtonTextDisabled,
                    ]}
                  >
                    现货
                  </Text>
                </View>
                <View
                  style={[
                    styles.typeButton,
                    styles.modeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      styles.modeButtonTextActive,
                    ]}
                  >
                    合约
                  </Text>
                </View>
                <View
                  style={[
                    styles.typeButton,
                    styles.typeButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      styles.typeButtonTextDisabled,
                    ]}
                  >
                    杠杆
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.cardRow}>
              <View style={styles.columnLeft}>
                <Text style={styles.rowLabel}>启用账户</Text>
                <Text style={styles.helperText}>关闭后停止同步数据</Text>
              </View>
              <Switch
                trackColor={{ false: "#3e3e3e", true: COLORS.success }}
                thumbColor={isEnabled ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleSwitch}
                value={isEnabled}
              />
            </View>
          </View>
        </View>

        {/* Security Warning */}
        <View style={styles.warningCard}>
          <MaterialIcons name="security" size={20} color={COLORS.warning} style={{marginTop: 2}} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>安全提示</Text>
            <Text style={styles.warningText}>
              您的 API Key 将被加密存储。为了您的资金安全，请务必在交易所后台设置 API 权限，仅勾选「读取」和「交易」权限，
              <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>切勿开启「提现」权限</Text>。
            </Text>
          </View>
        </View>

        {/* Delete Button - Only show when editing */}
        {accountId && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <MaterialIcons name="delete-outline" size={20} color={COLORS.danger} />
            <Text style={styles.deleteButtonText}>删除该账户</Text>
          </TouchableOpacity>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Exchange Selection Modal */}
      <Modal
        visible={showExchangeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExchangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowExchangeModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>选择交易所</Text>
                <TouchableOpacity onPress={() => setShowExchangeModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* Exchange List */}
              <ScrollView style={styles.modalScroll}>
                {exchanges.map((exchange) => {
                  const exchangeIcon = getExchangeIcon(exchange.name);
                  const isSelected = selectedExchange?.id === exchange.id;
                  return (
                    <TouchableOpacity
                      key={exchange.id}
                      style={[
                        styles.exchangeItem,
                        isSelected && styles.exchangeItemSelected
                      ]}
                      onPress={() => handleSelectExchange(exchange)}
                    >
                      <View style={styles.exchangeLeft}>
                        <View style={[
                          styles.exchangeIcon,
                          { backgroundColor: exchangeIcon.bg }
                        ]}>
                          <Text style={[
                            styles.exchangeIconText,
                            { color: exchangeIcon.color }
                          ]}>
                            {exchangeIcon.icon}
                          </Text>
                        </View>
                        <Text style={styles.exchangeName}>{exchange.display_name}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>确认删除</Text>
            <Text style={styles.deleteModalMessage}>
              删除后将无法恢复，确定要删除该账户吗？
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteCancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.deleteModalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteConfirmButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteModalButtonText}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      position: 'relative' as any,
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
    height: 56,
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    paddingHorizontal: 8,
  },
  saveButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100%',
      overflow: 'auto' as any,
    }),
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 100 : (Platform.OS === 'ios' ? 40 : 24),
    flexGrow: 1,
    ...(Platform.OS === 'web' && {
      minHeight: '100%',
    }),
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
    marginBottom: 8,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: 14,
    marginRight: 8,
    color: COLORS.textSecondary,
  },
  inputRow: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  inputRowNoBorder: {
    padding: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  optionalText: {
    color: COLORS.textSecondary,
    fontWeight: '400',
    fontSize: 12,
  },
  requiredText: {
    color: COLORS.danger,
    fontWeight: '400',
    fontSize: 12,
  },
  input: {
    fontSize: 16,
    padding: 0,
    color: COLORS.text,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputFlexible: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    color: COLORS.text,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  clearIcon: {
    padding: 8,
    marginLeft: 4,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 4,
  },
  inputWithIconRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearIconRight: {
    padding: 4,
    marginLeft: 8,
  },
  inputRight: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
    padding: 0,
    color: COLORS.text,
  },
  columnLeft: {
    flexDirection: 'column',
  },
  helperText: {
    fontSize: 12,
    marginTop: 2,
    color: COLORS.textSecondary,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  typeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  typeButtonDisabled: {
    opacity: 0.3,
  },
  modeButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modeButtonTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  typeButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  warningCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    backgroundColor: COLORS.warningBg,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.warning,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    color: COLORS.danger,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  exchangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exchangeItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  exchangeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exchangeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exchangeIconText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  exchangeName: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 15,
    color: '#AAAAAA',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteCancelButton: {
    backgroundColor: '#2C2C2C',
  },
  deleteConfirmButton: {
    backgroundColor: '#D32F2F',
  },
  deleteModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
