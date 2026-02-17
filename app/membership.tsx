import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { fetchMembershipPlans, MembershipPlan } from '../lib/membershipPlanService';
import { redeemCode } from '../lib/redemptionService';
import Toast from '../components/Toast';

const COLORS = {
  background: '#f5f5f5',
  cardBg: '#ffffff',
  textMain: '#333333',
  textSub: '#666666',
  textMuted: '#999999',
  border: '#e0e0e0',
  primary: '#4a7cff',
  gold: '#FFB800',
  goldLight: '#FFF8E7',
};

export default function MembershipPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleRedeem = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    const code = redeemInput.trim();
    if (!code) {
      showToast('请输入兑换码', 'error');
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemCode(code);
      if (result.success) {
        setRedeemInput('');
        showToast(`兑换成功！已开通${result.plan_name}，有效期${result.duration_days}天`, 'success');
        // 1.5秒后自动返回首页
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } else {
        showToast(result.error || '兑换失败', 'error');
      }
    } catch (err: any) {
      showToast(err.message || '网络异常', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  useEffect(() => {
    const loadPlans = async () => {
      const data = await fetchMembershipPlans();
      setPlans(data);
      setLoading(false);
    };
    loadPlans();
  }, []);

  const handlePurchase = (plan: MembershipPlan) => {
    if (!session) {
      router.push('/login');
      return;
    }
    // TODO: 接入支付流程
    console.log('Purchase plan:', plan.name);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6aa8ff', '#4a7cff', '#3a6cee']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.replace('/profile')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>会员套餐</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          plans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              {/* 套餐名称和价格 */}
              <View style={styles.planHeader}>
                <View style={styles.planNameRow}>
                  <Ionicons name="ribbon" size={20} color={COLORS.gold} />
                  <Text style={styles.planName}>{plan.name}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceSymbol}>¥</Text>
                  <Text style={styles.priceAmount}>{Number(plan.price).toFixed(2)}</Text>
                  <Text style={styles.pricePeriod}>/{plan.duration_days === 1 ? '期' : `${plan.duration_days}天`}</Text>
                </View>
              </View>

              <View style={styles.planDivider} />

              {/* 套餐描述 */}
              {plan.description && (
                <Text style={styles.planDescription}>{plan.description}</Text>
              )}

              {/* 套餐权益 */}
              {plan.features && plan.features.length > 0 && (
                <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>会员权益</Text>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.gold} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 购买按钮 */}
              <TouchableOpacity
                style={styles.purchaseButton}
                activeOpacity={0.8}
                onPress={() => handlePurchase(plan)}
              >
                <LinearGradient
                  colors={['#FFB800', '#FF9500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.purchaseButtonGradient}
                >
                  <Text style={styles.purchaseButtonText}>立即购买</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* 兑换码输入 */}
        <View style={styles.redeemContainer}>
          <Text style={styles.redeemTitle}>兑换码兑换</Text>
          <Text style={styles.redeemSubtitle}>输入兑换码即可开通会员</Text>
          <View style={styles.redeemInputRow}>
            <TextInput
              style={styles.redeemInput}
              placeholder="请输入兑换码"
              placeholderTextColor={COLORS.textMuted}
              value={redeemInput}
              onChangeText={setRedeemInput}
              autoCapitalize="characters"
              editable={!redeeming}
            />
            <TouchableOpacity
              style={[styles.redeemButton, (!redeemInput.trim() || redeeming) && styles.redeemButtonDisabled]}
              onPress={handleRedeem}
              disabled={!redeemInput.trim() || redeeming}
              activeOpacity={0.8}
            >
              {redeeming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.redeemButtonText}>兑换</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 记录入口 */}
        <View style={styles.recordButtonsRow}>
          <TouchableOpacity
            style={styles.recordButton}
            activeOpacity={0.7}
            onPress={() => router.push('/purchase-history')}
          >
            <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
            <Text style={styles.recordButtonText}>购买记录</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.recordButton}
            activeOpacity={0.7}
            onPress={() => router.push('/profile/redemption-history')}
          >
            <Ionicons name="gift-outline" size={18} color={COLORS.primary} />
            <Text style={styles.recordButtonText}>兑换记录</Text>
          </TouchableOpacity>
        </View>

        {/* 说明事项 */}
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeTitle}>购买须知</Text>
          <Text style={styles.noticeItem}>• 会员权益在支付成功后立即生效</Text>
          <Text style={styles.noticeItem}>• 一期会员仅限当期使用，过期自动失效</Text>
          <Text style={styles.noticeItem}>• 支持支付宝和微信支付</Text>
          <Text style={styles.noticeItem}>• 虚拟商品一经购买，概不退换</Text>
          <Text style={styles.noticeItem}>• 如有疑问请联系客服</Text>
        </View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  recordButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  recordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  planCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6600',
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6600',
  },
  pricePeriod: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  planDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  planDescription: {
    fontSize: 14,
    color: COLORS.textSub,
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.textSub,
    marginLeft: 8,
  },
  purchaseButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  purchaseButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 24,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  redeemContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  redeemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  redeemSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  redeemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  redeemInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.textMain,
    backgroundColor: '#fafafa',
  },
  redeemButton: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemButtonDisabled: {
    opacity: 0.5,
  },
  redeemButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  noticeContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 10,
  },
  noticeItem: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
});
