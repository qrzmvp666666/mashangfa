import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../../../components/Toast';
import {
  AdminRecommendationInput,
  AdminUser,
  ensureAdminAccess,
  fetchAdminRecommendationById,
  saveAdminRecommendation,
} from '../../../lib/adminService';

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminRecommendationEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isCreateMode = id === 'new';

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issueNo, setIssueNo] = useState('');
  const [issueDate, setIssueDate] = useState(todayDateString());
  const [recommendationContent, setRecommendationContent] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const numericId = useMemo(() => {
    if (isCreateMode) {
      return null;
    }
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [id, isCreateMode]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const accessResult = await ensureAdminAccess();
      if (!mounted) {
        return;
      }

      if (accessResult.error || !accessResult.data) {
        router.replace('/admin/login');
        return;
      }

      setAdminUser(accessResult.data);

      if (!isCreateMode) {
        if (!numericId) {
          setToastMessage('参数无效');
          setToastType('error');
          setToastVisible(true);
          setLoading(false);
          return;
        }

        const detailResult = await fetchAdminRecommendationById(numericId);
        if (!mounted) {
          return;
        }

        if (detailResult.error || !detailResult.data) {
          setToastMessage(detailResult.error?.message || '读取详情失败');
          setToastType('error');
          setToastVisible(true);
        } else {
          setIssueNo(detailResult.data.issue_no || '');
          setIssueDate(detailResult.data.issue_date || todayDateString());
          setRecommendationContent(detailResult.data.recommendation_content || '');
          setIsVisible(detailResult.data.is_visible);
        }
      }

      setLoading(false);
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [isCreateMode, numericId, router]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSave = async () => {
    if (!issueNo.trim()) {
      showToast('请输入期号', 'warning');
      return;
    }

    if (!/^\d{2,}$/.test(issueNo.trim())) {
      showToast('期号建议使用纯数字，例如 073', 'warning');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate.trim())) {
      showToast('日期格式应为 YYYY-MM-DD', 'warning');
      return;
    }

    const payload: AdminRecommendationInput = {
      issue_no: issueNo,
      issue_date: issueDate,
      title: '',
      description: '',
      recommendation_content: recommendationContent,
      is_visible: isVisible,
      updated_by: adminUser?.id ?? null,
    };

    setSaving(true);
    const { data, error } = await saveAdminRecommendation(payload, numericId || undefined);
    setSaving(false);

    if (error || !data) {
      showToast(error?.message || '保存失败', 'error');
      return;
    }

    showToast('保存成功', 'success');
    setTimeout(() => {
      router.replace(`/admin/recommendations/${data.id}`);
    }, 250);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>正在加载期次内容...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.wrapper, isDesktop && styles.wrapperDesktop]}>
            <View style={[styles.editorCard, isDesktop && styles.editorCardDesktop]}>
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin')}>
                  <Ionicons name="arrow-back" size={18} color="#2563eb" />
                  <Text style={styles.backButtonText}>返回列表</Text>
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>{isCreateMode ? '新增一期' : '编辑一期'}</Text>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>期号</Text>
                  <TextInput
                    style={styles.input}
                    value={issueNo}
                    onChangeText={setIssueNo}
                    placeholder="如 073"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>期次日期</Text>
                  <TextInput
                    style={styles.input}
                    value={issueDate}
                    onChangeText={setIssueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={styles.noticeCard}>
                <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
                <Text style={styles.noticeText}>标题和描述已改为全局配置，请返回后台首页顶部的“全局页面文案”区域修改。</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>推荐参考内容</Text>
                <TextInput
                  style={[styles.input, styles.textAreaLarge]}
                  value={recommendationContent}
                  onChangeText={setRecommendationContent}
                  placeholder="例如：【天肖】+蛇狗 或留空表示未更新"
                  placeholderTextColor="#9ca3af"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>前台是否展示</Text>
                  <Text style={styles.switchHint}>关闭后该期内容将不会在前台列表中出现。</Text>
                </View>
                <Switch value={isVisible} onValueChange={setIsVisible} trackColor={{ false: '#cbd5e1', true: '#93c5fd' }} thumbColor={isVisible ? '#2563eb' : '#f8fafc'} />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>保存内容</Text>}
              </TouchableOpacity>
            </View>

            <View style={[styles.previewCard, isDesktop && styles.previewCardDesktop]}>
              <Text style={styles.previewLabel}>前台预览</Text>
              <Text style={styles.previewIssue}>{issueNo || '期号未填写'}</Text>
              <Text style={styles.previewTitle}>全局标题/描述</Text>
              <Text style={styles.previewDescription}>请在后台首页的全局页面文案区域单独配置。</Text>
              <View style={styles.previewDivider} />
              <Text style={styles.previewFieldLabel}>推荐内容</Text>
              <Text style={styles.previewContent}>{recommendationContent || '当前为空，前台会显示“15点后更新”或“内容已更新/付费查看”。'}</Text>
              <Text style={styles.previewMeta}>展示状态：{isVisible ? '展示中' : '已隐藏'}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  wrapper: {
    gap: 16,
  },
  wrapperDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  editorCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    gap: 16,
  },
  editorCardDesktop: {
    flex: 1.2,
  },
  previewCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  previewCardDesktop: {
    flex: 0.8,
    position: 'sticky' as any,
    top: 16,
  },
  topBar: {
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  backButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  formGrid: {
    gap: 12,
    ...(Platform.OS === 'web' && {
      flexDirection: 'row' as const,
    }),
  },
  formGroup: {
    flex: 1,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  textArea: {
    minHeight: 110,
  },
  textAreaLarge: {
    minHeight: 160,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
  },
  noticeText: {
    flex: 1,
    color: '#1e3a8a',
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
  },
  switchHint: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  previewLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#1e3a8a',
    color: '#bfdbfe',
    fontWeight: '700',
  },
  previewIssue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  previewDescription: {
    color: '#d1d5db',
    lineHeight: 22,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 4,
  },
  previewFieldLabel: {
    color: '#93c5fd',
    fontWeight: '700',
  },
  previewContent: {
    color: '#fff',
    lineHeight: 24,
  },
  previewMeta: {
    marginTop: 8,
    color: '#93c5fd',
    fontSize: 12,
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
});