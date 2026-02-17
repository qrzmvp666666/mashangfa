import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../lib/i18n';
import Toast from '../components/Toast';

const COLORS = {
  primary: "#4a7cff",
  danger: "#f6465d",
  background: "#ffffff",
  surface: "#ffffff",
  surfaceLight: "#f5f5f5",
  textMain: "#333333",
  textMuted: "#666666",
  border: "#e0e0e0",
};

export default function LoginScreen() {
  const router = useRouter();
  const { signInOrSignUpWithCustomAccount } = useAuth();
  const { t } = useTranslation();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error');

  const handleLogin = async () => {
    if (!account) {
      setToastMessage('请输入账号');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    if (!password) {
      setToastMessage('请输入密码');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    if (password.length < 6) {
      setToastMessage('密码至少需要6个字符');
      setToastType('warning');
      setShowToast(true);
      return;
    }

    setLoading(true);
    const result = await signInOrSignUpWithCustomAccount(account, password);
    setLoading(false);

    if (result.error) {
      setToastMessage(result.error.message || '登录失败，请重试');
      setToastType('error');
      setShowToast(true);
    } else {
      if (result.isNewUser) {
        setToastMessage('注册成功，已自动登录');
        setToastType('success');
        setShowToast(true);
      }
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t('login.welcome')}</Text>
            <Text style={styles.subtitle}>
              {t('login.subtitle')}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* 账号输入 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>账号</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="请输入手机号/邮箱/账号"
                  placeholderTextColor={COLORS.textMuted}
                  value={account}
                  onChangeText={setAccount}
                  autoCapitalize="none"
                  keyboardType="default"
                />
                {account.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setAccount('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 密码输入 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>密码</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="请输入密码（至少6位）"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                {password.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setPassword('')}
                    style={styles.passwordClearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordEyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 提示文字 */}
            <Text style={styles.hintText}>
              首次登录将自动注册账号
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.mainButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.mainButtonText}>
                  登录 / 注册
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Toast
          visible={showToast}
          message={toastMessage}
          type={toastType}
          onHide={() => setShowToast(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      touchAction: 'pan-y' as any,
    }),
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  titleContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#333333',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    height: 56,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  passwordClearButton: {
    padding: 4,
    marginRight: 8,
  },
  passwordEyeButton: {
    padding: 4,
  },
  hintText: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
  },
  actionContainer: {
    marginTop: 40,
  },
  mainButton: {
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
  mainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
