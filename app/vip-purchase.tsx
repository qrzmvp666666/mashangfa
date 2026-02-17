import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../lib/i18n';
import { redeemCode } from '../lib/redemptionService';
import Toast from '../components/Toast';
import { supabase } from '../lib/supabase';

interface PriceInfo {
  id: string;
  amount: number;
  currency: string;
  type: string;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
}

interface ProductInfo {
  id: string;
  name: string;
  description: string;
  prices: PriceInfo[];
}

interface PackageOption {
  id: string;
  name: string;
  price: string;
  originalPrice: string;
  recommend?: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  currency?: string;
}

const COLORS = {
  primary: "#2ebd85",
  background: "#000000",
  surface: "#1c1c1e",
  textMain: "#ffffff",
  textMuted: "#9ca3af",
  gold: "#ffffff",
  goldLight: "#fce7f3", // Just a placeholder, maybe not used
  border: "#27272a",
};

// 获取套餐数据（根据语言）
function getPackages(t: (key: string) => any): PackageOption[] {
  return [
    {
      id: 'monthly',
      name: t('vipPurchase.monthly'),
      price: '9.99',
      originalPrice: '19.99',
      stripeProductId: 'prod_TiZg6JMSWBqjnJ',
      stripePriceId: 'price_1Sl8XqCsOgdwU6DQtB1V6h0M',
      currency: 'usd'
    },
    {
      id: 'quarterly',
      name: t('vipPurchase.quarterly'),
      price: '24.99',
      originalPrice: '49.99',
      stripeProductId: 'prod_TiZgY1wcR0zPqN',
      stripePriceId: 'price_1Sl8XsCsOgdwU6DQCExHCkgf',
      currency: 'usd'
    },
    {
      id: 'yearly',
      name: t('vipPurchase.yearly'),
      price: '89.99',
      originalPrice: '199.99',
      recommend: true,
      stripeProductId: 'prod_TiZgDpYCzRrCdF',
      stripePriceId: 'price_1Sl8XsCsOgdwU6DQnThbTY5R',
      currency: 'usd'
    },
  ];
}

export default function VipPurchasePage() {
  useProtectedRoute();
  const router = useRouter();
  const navigation = useNavigation();
  const { user, profile, refreshProfile } = useAuth();
  const { t, language } = useTranslation();
  const [selectedPackage, setSelectedPackage] = useState('yearly');
  const [redemptionCode, setRedemptionCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(Platform.OS === 'web');
  const [paying, setPaying] = useState(false);

  // 根据语言获取套餐数据
  const packages = useMemo(() => getPackages(t), [t, language]);

  // 判断套餐是否可购买
  const canPurchasePackage = (packageId: string): { canPurchase: boolean; reason?: string } => {
    if (!profile?.vip_status) {
      return { canPurchase: true };
    }

    const currentVipStatus = profile.vip_status.toLowerCase();
    
    // 检查VIP是否已过期
    const vipActive = profile.vip_expires_at && new Date(profile.vip_expires_at) > new Date();
    
    // 如果VIP已过期，视为免费用户
    if (!vipActive) {
      return { canPurchase: true };
    }

    // 根据当前VIP等级判断可购买的套餐
    switch (currentVipStatus) {
      case 'free':
        return { canPurchase: true };

      case 'monthly':
        if (packageId === 'monthly') {
          return { canPurchase: false, reason: t('vipPurchase.alreadyMonthlyMember') };
        }
        return { canPurchase: true };

      case 'quarterly':
        if (packageId === 'monthly' || packageId === 'quarterly') {
          return { canPurchase: false, reason: t('vipPurchase.alreadyQuarterlyMember') };
        }
        return { canPurchase: true };

      case 'yearly':
        return { canPurchase: false, reason: t('vipPurchase.alreadyYearlyMember') };

      default:
        return { canPurchase: true };
    }
  };

  // Web端：从Stripe获取产品和价格信息
  useEffect(() => {
    if (Platform.OS === 'web') {
      fetchStripeProducts();
    }
  }, []);

  const fetchStripeProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-stripe-products');

      if (error) throw error;

      if (data?.products) {
        // 将Stripe产品数据映射为套餐数据
        const mappedPackages: PackageOption[] = data.products.map((product: ProductInfo) => {
          const price = product.prices[0];
          const amount = price?.amount ? (price.amount / 100).toFixed(2) : '0.00';

          // 根据产品名称确定套餐类型和推荐状态
          let id = 'monthly';
          let recommend = false;
          let originalPrice = (parseFloat(amount) * 2).toFixed(2);

          if (product.name.includes('年度') || product.name.includes('Yearly')) {
            id = 'yearly';
            recommend = true;
            originalPrice = (parseFloat(amount) * 2.2).toFixed(2);
          } else if (product.name.includes('季度') || product.name.includes('Quarterly')) {
            id = 'quarterly';
            originalPrice = (parseFloat(amount) * 2).toFixed(2);
          }

          return {
            id,
            name: product.name,
            price: amount,
            originalPrice,
            recommend,
            stripeProductId: product.id,
            stripePriceId: price?.id,
            currency: price?.currency || 'usd',
          };
        });

        // 按照月度、季度、年度排序
        const sortOrder = { monthly: 1, quarterly: 2, yearly: 3 };
        mappedPackages.sort((a, b) => sortOrder[a.id as keyof typeof sortOrder] - sortOrder[b.id as keyof typeof sortOrder]);

        // 更新packages - 由于packages是useMemo，这里使用state来存储fetched packages
        // setPackages(mappedPackages);
      }
    } catch (error: any) {
      console.error('获取Stripe产品失败:', error);
      // 失败时使用硬编码数据
      setToastType('error');
      setToastMessage(t('common.operationFailed'));
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // 处理支付
  const handlePayment = async () => {
    // 限制：仅Web端支持Stripe支付
    if (Platform.OS !== 'web') {
      setToastType('error');
      setToastMessage(t('vipPurchase.mobilePaymentNotSupported'));
      setShowToast(true);
      return;
    }

    if (!user) {
      setToastType('error');
      setToastMessage(t('vipPurchase.pleaseLogin'));
      setShowToast(true);
      return;
    }

    const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
    if (!selectedPkg) {
      setToastType('error');
      setToastMessage(t('vipPurchase.pleaseSelectPackage'));
      setShowToast(true);
      return;
    }

    // 检查是否可购买
    const purchaseCheck = canPurchasePackage(selectedPkg.id);
    if (!purchaseCheck.canPurchase) {
      setToastType('error');
      setToastMessage(purchaseCheck.reason || t('vipPurchase.packageNotAvailable'));
      setShowToast(true);
      return;
    }

    if (!selectedPkg.stripePriceId) {
      setToastType('error');
      setToastMessage(t('vipPurchase.packageConfigError'));
      setShowToast(true);
      return;
    }

    setPaying(true);

    try {
      // 获取当前用户的 session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log('Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError
      });

      if (sessionError) {
        throw new Error(`${t('vipPurchase.getSessionFailed')}: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error(t('vipPurchase.sessionExpired'));
      }

      console.log('Calling Stripe checkout with:', {
        priceId: selectedPkg.stripePriceId,
        packageType: selectedPkg.id,
        packageName: selectedPkg.name,
      });

      // 调用 Supabase 云函数创建 Stripe Checkout Session
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          priceId: selectedPkg.stripePriceId,
          packageType: selectedPkg.id,
          packageName: selectedPkg.name,
          platform: 'web',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Stripe checkout response:', { data, error });

      if (error) {
        console.error('Invoke error:', error);
        throw new Error(error.message || t('vipPurchase.paymentServiceError'));
      }

      if (!data?.url) {
        throw new Error(t('vipPurchase.getPaymentUrlFailed'));
      }

      console.log('Redirecting to:', data.url);

      // Web端：直接跳转到Stripe收银台
      window.location.href = data.url;
    } catch (error: any) {
      console.error('创建Stripe支付会话失败:', error);
      setToastType('error');
      setToastMessage(error.message || t('vipPurchase.paymentInitFailed'));
      setShowToast(true);
      setPaying(false);
    }
  };

  const handleRedeem = async () => {
    if (!redemptionCode.trim()) {
      setToastType('error');
      setToastMessage(t('vipPurchase.enterRedeemCode'));
      setShowToast(true);
      return;
    }

    if (!user?.id) {
      setToastType('error');
      setToastMessage(t('vipPurchase.userInfoIncomplete'));
      setShowToast(true);
      return;
    }

    setRedeeming(true);

    try {
      // 执行兑换
      const result = await redeemCode(redemptionCode);

      if (!result.success) {
        throw new Error(result.error || '兑换失败');
      }

      // 刷新用户信息
      await refreshProfile();

      // 清空输入框
      setRedemptionCode('');

      // 显示成功提示
      setToastType('success');
      setToastMessage(t('vipPurchase.redeemSuccess'));
      setShowToast(true);

      // 延迟跳转到兑换记录页面
      setTimeout(() => {
        router.push('/profile/redemption-history');
      }, 1500);
    } catch (error: any) {
      setToastType('error');
      setToastMessage(error.message || t('vipPurchase.redeemFailed'));
      setShowToast(true);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              router.replace('/profile');
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('vipPurchase.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/purchase-history')} style={styles.headerIcon}>
            <Ionicons name="receipt-outline" size={22} color="#fff" />
          </TouchableOpacity>
          {/* 兑换记录入口 - 暂时隐藏 */}
          {/* <TouchableOpacity onPress={() => router.push('/profile/redemption-history')} style={styles.headerIcon}>
            <Ionicons name="gift-outline" size={22} color="#fff" />
          </TouchableOpacity> */}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>{t('vipPurchase.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.vipHeader}>
              <View style={styles.vipIconContainer}>
                <Ionicons name="diamond" size={30} color={COLORS.gold} />
              </View>
              <Text style={styles.vipTitle}>{t('vipPurchase.vipTitle')}</Text>
              <Text style={styles.vipSubtitle}>{t('vipPurchase.vipSubtitle')}</Text>
            </View>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitsRow}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="people" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{t('vipPurchase.benefitTraders')}</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="pie-chart" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{t('vipPurchase.benefitPositions')}</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="list" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{t('vipPurchase.benefitOrders')}</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="time" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{t('vipPurchase.benefitHistory')}</Text>
            </View>
          </View>

          <View style={[styles.benefitsRow, { marginTop: 12 }]}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="flash" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{t('vipPurchase.benefitFast')}</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="analytics" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{t('vipPurchase.benefitMarket')}</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="headset" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{t('vipPurchase.benefitSupport')}</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{t('vipPurchase.benefitSecurity')}</Text>
            </View>
          </View>

        </View>

            <Text style={styles.sectionTitle}>{t('vipPurchase.selectPackage')}</Text>

            <View style={styles.packagesContainer}>
              {packages.map((pkg) => {
                const purchaseCheck = canPurchasePackage(pkg.id);
                const isDisabled = !purchaseCheck.canPurchase;
                
                return (
            <TouchableOpacity 
              key={pkg.id} 
              style={[
                styles.packageCard, 
                selectedPackage === pkg.id && styles.selectedPackageCard,
                isDisabled && styles.disabledPackageCard
              ]}
              onPress={() => {
                if (isDisabled) {
                  setToastType('error');
                  setToastMessage(purchaseCheck.reason || t('vipPurchase.packageNotAvailable'));
                  setShowToast(true);
                } else {
                  setSelectedPackage(pkg.id);
                }
              }}
              disabled={isDisabled}
            >
              {pkg.recommend && (
                <View style={styles.recommendBadge}>
                  <Text style={styles.recommendText}>{t('vipPurchase.recommend')}</Text>
                </View>
              )}
              {isDisabled && (
                <View style={styles.disabledBadge}>
                  <Ionicons name="lock-closed" size={10} color="#666" />
                </View>
              )}
              <Text style={[styles.packageName, selectedPackage === pkg.id && styles.selectedText, isDisabled && styles.disabledText]}>{pkg.name}</Text>
              <View style={styles.priceContainer}>
              <Text style={[styles.price, selectedPackage === pkg.id && styles.selectedText, isDisabled && styles.disabledText]}>{pkg.price}</Text>
                <Text style={[styles.currency, selectedPackage === pkg.id && styles.selectedText, isDisabled && styles.disabledText, { marginLeft: 4 }]}>{(pkg.currency || 'usd').toUpperCase()}</Text>
              </View>
              <Text style={[styles.originalPrice, isDisabled && styles.disabledText]}>{pkg.originalPrice} {(pkg.currency || 'usd').toUpperCase()}</Text>
            </TouchableOpacity>
                );
              })}
            </View>

        {/* 兑换码区域 - 暂时隐藏 */}
        {/* <View style={styles.redemptionContainer}>
          <Text style={styles.sectionTitle}>{t('vipPurchase.redeemCode')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={t('vipPurchase.enterRedeemCode')}
              placeholderTextColor={COLORS.textMuted}
              value={redemptionCode}
              onChangeText={setRedemptionCode}
              autoCapitalize="characters"
              editable={!redeeming}
            />
            <TouchableOpacity
              style={[styles.redeemButton, redeeming && styles.redeemButtonDisabled]}
              onPress={handleRedeem}
              disabled={redeeming}
            >
              {redeeming ? (
                <ActivityIndicator size="small" color={COLORS.gold} />
              ) : (
                <Text style={styles.redeemButtonText}>{t('vipPurchase.redeem')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View> */}

            <View style={styles.description}>
              <Text style={styles.descriptionTitle}>{t('vipPurchase.purchaseDescription')}</Text>
              <Text style={styles.descriptionText}>
                {t('vipPurchase.purchaseNote1')}
              </Text>
              <Text style={styles.descriptionText}>
                {t('vipPurchase.purchaseNote2')}
              </Text>
            </View>

            <View style={styles.rulesContainer}>
              <Text style={styles.rulesTitle}>{t('vipPurchase.upgradeRules')}</Text>
              <View style={styles.ruleItem}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                <Text style={styles.ruleText}>{t('vipPurchase.ruleFree')}</Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                <Text style={styles.ruleText}>{t('vipPurchase.ruleMonthly')}</Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                <Text style={styles.ruleText}>{t('vipPurchase.ruleQuarterly')}</Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                <Text style={styles.ruleText}>{t('vipPurchase.ruleYearly')}</Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="information-circle" size={14} color="#f59e0b" />
                <Text style={styles.ruleText}>{t('vipPurchase.ruleNoDowngrade')}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, paying && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={paying || loading}
        >
          {paying ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.payButtonText}>{t('vipPurchase.activateNow')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Toast 提示 */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
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
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  vipHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  vipIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  vipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginBottom: 6,
  },
  vipSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  benefitsContainer: {
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  benefitItem: {
    flex: 1,
    alignItems: 'center',
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  packagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  packageCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface,
    position: 'relative',
  },
  selectedPackageCard: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabledPackageCard: {
    opacity: 0.4,
    backgroundColor: COLORS.surface,
    borderColor: '#333',
  },
  recommendBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recommendText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  disabledBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledText: {
    color: '#666',
  },
  packageName: {
    fontSize: 14,
    color: COLORS.textMain,
    marginBottom: 8,
    marginTop: 4,
  },
  selectedText: {
    color: COLORS.gold,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  currency: {
    fontSize: 12,
    color: COLORS.textMain,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  period: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  description: {
    marginTop: 12,
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
    lineHeight: 18,
  },
  rulesContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ruleText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  payButton: {
    backgroundColor: COLORS.gold,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  redemptionContainer: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: COLORS.textMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  redeemButton: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
    minWidth: 80,
  },
  redeemButtonDisabled: {
    opacity: 0.5,
  },
  redeemButtonText: {
    color: COLORS.gold,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  platformBadge: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.primary,
    backgroundColor: 'rgba(46, 189, 133, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
