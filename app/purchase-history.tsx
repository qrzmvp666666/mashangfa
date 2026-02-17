import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchPurchaseRecords,
  subscribeToPurchaseRecords,
  getPaymentMethodLabel,
  getPaymentStatusInfo,
  PurchaseRecord,
} from '../lib/purchaseRecordService';

const COLORS = {
  background: '#f5f5f5',
  cardBg: '#ffffff',
  textMain: '#333333',
  textSub: '#666666',
  textMuted: '#999999',
  border: '#e0e0e0',
  primary: '#4a7cff',
};

const StatusBadge = ({ status }: { status: string }) => {
  const { label, color } = getPaymentStatusInfo(status);
  return (
    <View style={[styles.statusBadge, { borderColor: color }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const PaymentMethodIcon = ({ method }: { method: string }) => {
  const iconName = method === 'wechat' ? 'logo-wechat' : 'wallet-outline';
  const iconColor = method === 'wechat' ? '#07C160' : '#1677FF';
  return <Ionicons name={iconName as any} size={16} color={iconColor} />;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/\//g, '-');
}

export default function PurchaseHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user?.id) return;
    const data = await fetchPurchaseRecords(user.id);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    if (user?.id) {
      const unsubscribe = subscribeToPurchaseRecords(user.id, loadData);
      return () => unsubscribe();
    }
  }, [user?.id]);

  const renderItem = ({ item }: { item: PurchaseRecord }) => (
    <View style={styles.card}>
      {/* 卡片头部：商品名 + 状态 */}
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.plan_name || item.product_name}</Text>
        <StatusBadge status={item.payment_status} />
      </View>

      <View style={styles.divider} />

      {/* 订单号 */}
      <View style={styles.row}>
        <Text style={styles.label}>订单号</Text>
        <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
          {item.order_no}
        </Text>
      </View>

      {/* 支付方式 */}
      <View style={styles.row}>
        <Text style={styles.label}>支付方式</Text>
        <View style={styles.paymentMethodRow}>
          <PaymentMethodIcon method={item.payment_method} />
          <Text style={[styles.value, { marginLeft: 4 }]}>{getPaymentMethodLabel(item.payment_method)}</Text>
        </View>
      </View>

      {/* 支付时间 */}
      <View style={styles.row}>
        <Text style={styles.label}>支付时间</Text>
        <Text style={styles.value}>{formatDate(item.payment_time)}</Text>
      </View>

      {/* 完成时间 */}
      {item.completed_time && (
        <View style={styles.row}>
          <Text style={styles.label}>完成时间</Text>
          <Text style={styles.value}>{formatDate(item.completed_time)}</Text>
        </View>
      )}

      {/* 金额 */}
      <View style={[styles.row, { marginTop: 4 }]}>
        <Text style={styles.label}>金额</Text>
        <Text style={styles.amount}>¥{Number(item.amount).toFixed(2)}</Text>
      </View>

      {/* 备注 */}
      {item.remark ? (
        <View style={styles.row}>
          <Text style={styles.label}>备注</Text>
          <Text style={[styles.value, { flex: 1 }]}>{item.remark}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6aa8ff', '#4a7cff', '#3a6cee']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>购买记录</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>暂无购买记录</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSub,
    flexShrink: 0,
  },
  value: {
    fontSize: 14,
    color: COLORS.textMain,
    textAlign: 'right',
    marginLeft: 8,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
