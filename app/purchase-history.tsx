import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../lib/i18n';

const COLORS = {
  background: "#000000",
  surface: "#1c1c1e",
  textMain: "#ffffff",
  textMuted: "#9ca3af",
  border: "#27272a",
  success: "#2ebd85",
  danger: "#f6465d",
};

interface PurchaseRecord {
  id: string;
  packageName: string;
  orderNo: string;
  date: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  amount: string;
  paymentMethod: string;
  currency: string;
}

const StatusBadge = ({ status, t }: { status: PurchaseRecord['status'], t: any }) => {
  let color = COLORS.textMuted;
  let text = '未知';

  switch (status) {
    case 'completed':
      color = COLORS.success;
      text = t('purchaseHistory.statusCompleted');
      break;
    case 'pending':
      color = '#eab308';
      text = t('purchaseHistory.statusPending');
      break;
    case 'failed':
      color = COLORS.danger;
      text = t('purchaseHistory.statusFailed');
      break;
    case 'refunded':
      color = '#f97316';
      text = t('purchaseHistory.statusRefunded');
      break;
  }

  return (
    <View style={[styles.statusBadge, { borderColor: color }]}>
      <Text style={[styles.statusText, { color }]}>{text}</Text>
    </View>
  );
};

export default function PurchaseHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchaseRecords();
  }, []);

  const fetchPurchaseRecords = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.log('No user ID available');
        return;
      }

      const { data, error } = await supabase
        .from('purchase_records')
        .select('*')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchase records:', error);
        return;
      }

      // 转换数据格式
      const formattedRecords: PurchaseRecord[] = (data || []).map(record => ({
        id: record.id,
        packageName: record.package_name,
        orderNo: record.order_no,
        date: new Date(record.purchased_at).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).replace(/\//g, '-'),
        status: record.status as 'completed' | 'pending' | 'failed' | 'refunded',
        amount: `${record.amount} ${record.currency || 'USD'}`,
        paymentMethod: record.payment_method || 'Stripe',
        currency: record.currency || 'USD',
      }));

      setRecords(formattedRecords);
    } catch (error) {
      console.error('Error in fetchPurchaseRecords:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: PurchaseRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.packageName}>{item.packageName}</Text>
        <StatusBadge status={item.status} t={t} />
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>{t('purchaseHistory.orderNo')}</Text>
        <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
          {item.orderNo}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t('purchaseHistory.purchaseTime')}</Text>
        <Text style={styles.value}>{item.date}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t('purchaseHistory.paymentMethod')}</Text>
        <Text style={styles.value}>{item.paymentMethod}</Text>
      </View>

      <View style={[styles.row, { marginTop: 4 }]}>
        <Text style={styles.label}>{t('purchaseHistory.amount')}</Text>
        <Text style={styles.amount}>{item.amount}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('purchaseHistory.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.textMuted} />
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{t('purchaseHistory.noRecords')}</Text>
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
    height: 44,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageName: {
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
    color: COLORS.textMuted,
    flexShrink: 0,
  },
  value: {
    fontSize: 14,
    color: COLORS.textMain,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
