import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../lib/i18n';

const COLORS = {
  background: "#f8f9fa",
  card: "#ffffff",
  textMain: "#1a1a1a",
  textSub: "#666666",
  textMuted: "#999999",
  border: "#e0e0e0",
  primary: "#4a7cff",
  error: "#ff4d4f",
  success: "#52c41a",
};

export default function ChangePasswordPage() {
  useProtectedRoute();
  const router = useRouter();
  const { user, updatePassword, signOut } = useAuth();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState('');

  const email = user?.email || '';

  const validatePasswords = () => {
    if (!newPassword.trim()) {
      Alert.alert('提示', '请输入新密码');
      return false;
    }
    if (newPassword.length < 6) {
      Alert.alert('提示', '密码长度至少为6个字符');
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validatePasswords()) {
      return;
    }

    setSaving(true);

    const result = await updatePassword(newPassword);

    if (result?.error) {
      setSaving(false);
      let errorMessage = result.error?.message || '保存失败，请重试';
      
      // 处理特定错误
      if (errorMessage.includes('same_password') || 
          errorMessage.includes('same as the old') ||
          errorMessage.includes('different from the old') ||
          errorMessage.includes('New password should be different')) {
        errorMessage = '新密码不能与当前密码相同';
      } else if (errorMessage.includes('weak_password')) {
        errorMessage = '密码强度不够，请使用更复杂的密码';
      }
      
      // 显示顶部错误提示
      setErrorToastMessage(errorMessage);
      setShowErrorToast(true);
      setTimeout(() => {
        setShowErrorToast(false);
      }, 2000);
      return;
    }

    setSaving(false);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setTimeout(() => {
        // 密码设置成功后退出登录并回到登录页面
        signOut();
        router.replace('/login');
      }, 300);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a7cff" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={['#6aa8ff', '#4a7cff', '#3a6cee']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBanner}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置密码</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* 新密码 */}
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>新密码</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="请输入新密码（至少6位）"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                />
                {newPassword.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setNewPassword('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 确认新密码 */}
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>确认密码</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="请再次输入新密码"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                {confirmPassword.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setConfirmPassword('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 密码不一致提示 */}
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>两次输入的密码不一致</Text>
            </View>
          )}

          {/* 提示文字 */}
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>• 密码长度至少为6个字符</Text>
            <Text style={styles.hintText}>• 两次输入的密码必须一致</Text>
          </View>

          {/* 保存按钮 */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>保存</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Toast */}
      {showErrorToast && (
        <View style={styles.toastContainer}>
          <View style={[styles.toastContent, { backgroundColor: '#fff2f0', borderWidth: 1, borderColor: '#ffccc7' }]}>
            <Ionicons name="close-circle" size={20} color={COLORS.error} />
            <Text style={[styles.toastText, { color: COLORS.error }]}>{errorToastMessage}</Text>
          </View>
        </View>
      )}

      {/* Success Toast */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toastContent}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.toastText}>密码设置成功</Text>
          </View>
        </View>
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
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 56,
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMain,
    minWidth: 80,
  },
  valueText: {
    fontSize: 15,
    color: COLORS.textSub,
    flex: 1,
    textAlign: 'right',
  },
  inputRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textMain,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  eyeButton: {
    padding: 4,
  },
  hintContainer: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff2f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginLeft: 6,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#4a7cff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4a7cff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  toastContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    fontSize: 14,
    color: COLORS.textMain,
    marginLeft: 8,
    fontWeight: '500',
  },
});
