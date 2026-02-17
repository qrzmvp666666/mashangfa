import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Signal } from '../lib/signalService';
import { ExchangeAccountService } from '../lib/exchangeAccountService';
import type { ExchangeAccount } from '../types';
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

interface CopySignalModalProps {
  visible: boolean;
  signal: Signal | null;
  onClose: () => void;
  onConfirm?: (editedData: {
    entryPrice: string;
    takeProfit: string;
    stopLoss: string;
  }) => void;
}

export const CopySignalModal: React.FC<CopySignalModalProps> = ({
  visible,
  signal,
  onClose,
  onConfirm,
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [editableData, setEditableData] = useState({
    entryPrice: '',
    takeProfit: '',
    stopLoss: '',
    entryAmount: '',
    accountId: '',
  });
  const [exchangeAccounts, setExchangeAccounts] = useState<ExchangeAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // 当信号变化时更新可编辑数据
  useEffect(() => {
    if (signal) {
      setEditableData({
        entryPrice: signal.entry_price,
        takeProfit: signal.take_profit,
        stopLoss: signal.stop_loss,
        entryAmount: '',
        accountId: '',
      });
    }
  }, [signal]);

  // 加载已启用的交易账户
  useEffect(() => {
    if (visible) {
      loadExchangeAccounts();
    }
  }, [visible]);

  const loadExchangeAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const accounts = await ExchangeAccountService.getEnabledExchangeAccounts();
      setExchangeAccounts(accounts);
      // 如果只有一个账户，自动选中
      if (accounts.length === 1) {
        setEditableData(prev => ({ ...prev, accountId: accounts[0].id }));
      }
    } catch (error) {
      console.error('加载交易账户失败:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 计算盈亏比
  const calculateProfitLossRatio = (
    entryPrice: string,
    takeProfit: string,
    stopLoss: string,
    direction: 'long' | 'short'
  ) => {
    const entry = parseFloat(entryPrice);
    const tp = parseFloat(takeProfit);
    const sl = parseFloat(stopLoss);

    if (isNaN(entry) || isNaN(tp) || isNaN(sl)) return '-';

    let profit = 0;
    let loss = 0;

    if (direction === 'long') {
      profit = tp - entry;
      loss = entry - sl;
    } else {
      profit = entry - tp;
      loss = sl - entry;
    }

    if (loss <= 0) return '-';
    const ratio = profit / loss;
    return `${ratio.toFixed(2)}:1`;
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(editableData);
    }
    onClose();
  };

  if (!signal) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('copySignalModal.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* 交易账户 - 最上面 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('copySignalModal.tradingAccount')}</Text>
              {loadingAccounts ? (
                <View style={styles.formInputDisabled}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : exchangeAccounts.length === 0 ? (
                <TouchableOpacity
                  style={styles.createAccountButton}
                  onPress={() => {
                    onClose();
                    router.push('/profile/exchange-accounts');
                  }}
                >
                  <MaterialIcons name="add-circle-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.createAccountButtonText}>{t('copySignalModal.createAccount')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.accountSelector}
                  onPress={() => setShowAccountPicker(true)}
                >
                  <Text style={editableData.accountId ? styles.formInputText : styles.formInputPlaceholder}>
                    {editableData.accountId
                      ? exchangeAccounts.find(acc => acc.id === editableData.accountId)?.account_nickname || t('copySignalModal.selectAccount')
                      : t('copySignalModal.selectAccount')}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* 入场金额 - 第二个 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('copySignalModal.entryAmount')}</Text>
              <TextInput
                style={styles.formInput}
                value={editableData.entryAmount}
                onChangeText={(text) => {
                  // 只允许输入正整数
                  const filtered = text.replace(/[^0-9]/g, '');
                  setEditableData({ ...editableData, entryAmount: filtered });
                }}
                keyboardType="number-pad"
                placeholder={t('copySignalModal.enterEntryAmount')}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* 两列布局 - 交易对 | 方向 */}
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('copySignalModal.tradingPair')}</Text>
                <View style={styles.formInputDisabled}>
                  <Text style={styles.formInputDisabledText}>{signal.currency}</Text>
                </View>
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('copySignalModal.direction')}</Text>
                <View style={styles.formInputDisabled}>
                  <Text
                    style={[
                      styles.formInputDisabledText,
                      {
                        color: signal.direction === 'long' ? COLORS.primary : COLORS.danger,
                      },
                    ]}
                  >
                    {signal.direction === 'long' ? t('copySignalModal.long') : t('copySignalModal.short')}
                  </Text>
                </View>
              </View>
            </View>

            {/* 两列布局 - 杠杆 | 入场价 */}
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('copySignalModal.leverage')}</Text>
                <View style={styles.formInputDisabled}>
                  <Text style={styles.formInputDisabledText}>{signal.leverage.replace(/x$/i, '')}</Text>
                </View>
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('copySignalModal.entryPrice')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editableData.entryPrice === t('copySignalModal.notProvided') ? '' : editableData.entryPrice}
                  onChangeText={(text) =>
                    setEditableData({ ...editableData, entryPrice: text })
                  }
                  keyboardType="decimal-pad"
                  placeholder={t('copySignalModal.enterEntryPrice')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* 两列布局 - 止盈价 | 止损价 */}
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('copySignalModal.takeProfit')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editableData.takeProfit === t('copySignalModal.notProvided') ? '' : editableData.takeProfit}
                  onChangeText={(text) =>
                    setEditableData({ ...editableData, takeProfit: text })
                  }
                  keyboardType="decimal-pad"
                  placeholder={t('copySignalModal.enterTakeProfit')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('copySignalModal.stopLoss')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editableData.stopLoss === t('copySignalModal.notProvided') ? '' : editableData.stopLoss}
                  onChangeText={(text) =>
                    setEditableData({ ...editableData, stopLoss: text })
                  }
                  keyboardType="decimal-pad"
                  placeholder={t('copySignalModal.enterStopLoss')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* 盈亏比 - 自动计算 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('copySignalModal.profitLossRatio')}</Text>
              <View style={styles.formInputDisabled}>
                <Text style={[styles.formInputDisabledText, { color: COLORS.yellow }]}>
                  {calculateProfitLossRatio(
                    editableData.entryPrice,
                    editableData.takeProfit,
                    editableData.stopLoss,
                    signal.direction
                  )}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelButtonText}>{t('copySignalModal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirm}>
              <Text style={styles.modalConfirmButtonText}>{t('copySignalModal.confirmCopy')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 账户选择器 Modal */}
      <Modal
        visible={showAccountPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowAccountPicker(false)}
          />
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('copySignalModal.selectTradingAccount')}</Text>
              <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerContent}>
              {exchangeAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.pickerItem,
                    editableData.accountId === account.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setEditableData({ ...editableData, accountId: account.id });
                    setShowAccountPicker(false);
                  }}
                >
                  <View style={styles.pickerItemContent}>
                    <Text style={styles.pickerItemText}>{account.account_nickname}</Text>
                    <Text style={styles.pickerItemSubtext}>
                      {account.exchanges?.display_name || account.exchange_name} · {account.account_type}
                    </Text>
                  </View>
                  {editableData.accountId === account.id && (
                    <MaterialIcons name="check" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  formGroupHalf: {
    flex: 1,
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
  formInputDisabled: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  formInputDisabledText: {
    color: COLORS.textMain,
    fontSize: 16,
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
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelButtonText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: 'bold',
  },
  formInputText: {
    color: COLORS.textMain,
    fontSize: 16,
    flex: 1,
  },
  formInputPlaceholder: {
    color: COLORS.textMuted,
    fontSize: 16,
    flex: 1,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  createAccountButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerContent: {
    padding: 20,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    marginBottom: 12,
  },
  pickerItemSelected: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemText: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pickerItemSubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
