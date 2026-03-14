import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../../components/Toast';
import { getPlatformConfig, saveTiandiPageConfig } from '../../lib/platformConfigService';
import {
  AdminRecommendation,
  AdminUser,
  ensureAdminAccess,
  fetchAdminRecommendations,
  signOutAdmin,
  subscribeToAdminRecommendations,
} from '../../lib/adminService';

function formatDate(dateString: string) {
  return dateString || '--';
}

export default function AdminHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [items, setItems] = useState<AdminRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [savingPageConfig, setSavingPageConfig] = useState(false);
  const visibleItems = items.filter(
    (item) => item.is_visible && Boolean(item.recommendation_content?.trim())
  );

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    }

    const accessResult = await ensureAdminAccess();
    if (accessResult.error || !accessResult.data) {
      router.replace('/admin/login');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const listResult = await fetchAdminRecommendations();
    if (listResult.error) {
      showToast(listResult.error.message, 'error');
    } else {
      setItems(listResult.data || []);
    }

    const pageConfig = await getPlatformConfig();
    setPageTitle(pageConfig.tiandiPageTitle);
    setPageDescription(pageConfig.tiandiPageDescription);

    setLoading(false);
    setRefreshing(false);
  }, [router, showToast]);

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToAdminRecommendations(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleSignOut = async () => {
    await signOutAdmin();
    router.replace('/admin/login');
  };

  const handleSavePageConfig = async () => {
    setSavingPageConfig(true);
    try {
      const config = await saveTiandiPageConfig(pageTitle, pageDescription);
      setPageTitle(config.tiandiPageTitle);
      setPageDescription(config.tiandiPageDescription);
      showToast('标题和描述已保存', 'success');
    } catch (error: any) {
      showToast(error?.message || '保存标题和描述失败', 'error');
    } finally {
      setSavingPageConfig(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>正在加载后台数据...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.pageContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        <View style={[styles.configCard, isDesktop && styles.configCardDesktop]}>
          <View style={styles.configHeader}>
            <Text style={styles.configTitle}>全局页面文案</Text>
            <Text style={styles.configSubtitle}>这里单独维护前台标题和描述，不再跟随每一期变化。</Text>
          </View>

          <View style={styles.configFormGroup}>
            <Text style={styles.configLabel}>标题</Text>
            <TextInput
              style={styles.configInput}
              value={pageTitle}
              onChangeText={setPageTitle}
              placeholder="请输入全局标题"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.configFormGroup}>
            <Text style={styles.configLabel}>描述</Text>
            <TextInput
              style={[styles.configInput, styles.configTextarea]}
              value={pageDescription}
              onChangeText={setPageDescription}
              placeholder="支持多行，前台将逐行展示"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.configSaveButton} onPress={handleSavePageConfig} disabled={savingPageConfig}>
            {savingPageConfig ? <ActivityIndicator color="#fff" /> : <Text style={styles.configSaveButtonText}>保存标题和描述</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.tableSectionHeader}>
          <View>
            <Text style={styles.tableSectionTitle}>期次列表</Text>
            <Text style={styles.tableSectionSubtitle}>仅展示“展示中且已填写预测内容”的期次，并按最新一期倒序展示。</Text>
          </View>
          <View style={styles.tableHeaderActions}>
            <TouchableOpacity style={styles.tableAddButton} onPress={() => router.push('/admin/recommendations/new')}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.tableAddButtonText}>新增一期</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tableLogoutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color="#2563eb" />
              <Text style={styles.tableLogoutButtonText}>退出</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isDesktop ? (
          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, styles.colIssue]}>期号</Text>
              <Text style={[styles.tableHeaderText, styles.colDate]}>日期</Text>
              <Text style={[styles.tableHeaderText, styles.colTitle]}>内容摘要</Text>
              <Text style={[styles.tableHeaderText, styles.colStatus]}>状态</Text>
              <Text style={[styles.tableHeaderText, styles.colUpdated]}>更新时间</Text>
              <Text style={[styles.tableHeaderText, styles.colAction]}>操作</Text>
            </View>

            {visibleItems.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCellText, styles.colIssue]}>{item.issue_no}</Text>
                <Text style={[styles.tableCellText, styles.colDate]}>{formatDate(item.issue_date)}</Text>
                <View style={styles.colTitle}>
                  <Text style={styles.tableCellTitle} numberOfLines={1}>{item.recommendation_content || '未填写推荐内容'}</Text>
                  <Text style={styles.tableCellDescription} numberOfLines={2}>标题与描述请在上方“全局页面文案”中配置</Text>
                </View>
                <View style={styles.colStatus}>
                  <View style={[styles.statusBadge, item.is_visible ? styles.statusVisible : styles.statusHidden]}>
                    <Text style={[styles.statusBadgeText, item.is_visible ? styles.statusVisibleText : styles.statusHiddenText]}>
                      {item.is_visible ? '展示中' : '已隐藏'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tableCellText, styles.colUpdated]}>{formatDate(item.updated_at).slice(0, 16).replace('T', ' ')}</Text>
                <View style={styles.colAction}>
                  <TouchableOpacity style={styles.inlineActionButton} onPress={() => router.push(`/admin/recommendations/${item.id}`)}>
                    <Text style={styles.inlineActionText}>编辑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {visibleItems.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>暂无可展示期次</Text>
                <Text style={styles.emptyText}>请先新增一期，并确保已填写预测内容且状态为展示中。</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.mobileList}>
            {visibleItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mobileCard}
                onPress={() => router.push(`/admin/recommendations/${item.id}`)}
              >
                <View style={styles.mobileCardHeader}>
                  <Text style={styles.mobileCardIssue}>{item.issue_no}</Text>
                  <View style={[styles.statusBadge, item.is_visible ? styles.statusVisible : styles.statusHidden]}>
                    <Text style={[styles.statusBadgeText, item.is_visible ? styles.statusVisibleText : styles.statusHiddenText]}>
                      {item.is_visible ? '展示中' : '已隐藏'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.mobileCardTitle} numberOfLines={2}>{item.recommendation_content || '未填写推荐内容'}</Text>
                <Text style={styles.mobileCardDescription} numberOfLines={2}>标题与描述请在上方全局文案中配置</Text>
                <Text style={styles.mobileCardMeta}>日期：{formatDate(item.issue_date)}</Text>
              </TouchableOpacity>
            ))}

            {visibleItems.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>暂无可展示期次</Text>
                <Text style={styles.emptyText}>请先新增一期，并确保已填写预测内容且状态为展示中。</Text>
              </View>
            )}
          </View>
        )}
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
  page: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  pageContent: {
    padding: 16,
    gap: 16,
  },
  tableSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  tableSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  tableSectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  tableHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  tableAddButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tableAddButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  tableLogoutButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tableLogoutButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eef2ff',
  },
  colIssue: { flex: 1.1 },
  colDate: { flex: 1.2 },
  colTitle: { flex: 2.6 },
  colStatus: { flex: 1.2 },
  colUpdated: { flex: 1.6 },
  colAction: { flex: 0.9, alignItems: 'flex-end' },
  tableCellText: {
    fontSize: 13,
    color: '#374151',
  },
  tableCellTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  tableCellDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusVisible: {
    backgroundColor: '#dcfce7',
  },
  statusVisibleText: {
    color: '#166534',
  },
  statusHidden: {
    backgroundColor: '#fee2e2',
  },
  statusHiddenText: {
    color: '#b91c1c',
  },
  inlineActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
  },
  inlineActionText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  mobileList: {
    gap: 12,
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileCardIssue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mobileCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  mobileCardDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  mobileCardMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
  },
  loadingText: {
    marginTop: 12,
    color: '#4b5563',
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  configCardDesktop: {
    paddingHorizontal: 22,
  },
  configHeader: {
    gap: 6,
  },
  configTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  configSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  configFormGroup: {
    gap: 8,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  configInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
  },
  configTextarea: {
    minHeight: 96,
  },
  configSaveButton: {
    alignSelf: 'flex-start',
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configSaveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});