import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../../components/Toast';
import { ensureAdminAccess, signInAdmin } from '../../lib/adminService';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootChecking, setBootChecking] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data } = await ensureAdminAccess();
      if (!mounted) {
        return;
      }

      if (data) {
        router.replace('/admin');
        return;
      }

      setBootChecking(false);
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      showToast('请输入管理员邮箱', 'warning');
      return;
    }

    if (!password) {
      showToast('请输入密码', 'warning');
      return;
    }

    setLoading(true);
    const { error } = await signInAdmin(email, password);
    setLoading(false);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast('登录成功', 'success');
    setTimeout(() => {
      router.replace('/admin');
    }, 200);
  };

  if (bootChecking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a7cff" />
        <Text style={styles.loadingText}>正在检查后台登录状态...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.badge}>Admin</Text>
            <Text style={styles.title}>管理后台登录</Text>
            <Text style={styles.subtitle}>仅管理员账号可访问推荐内容后台。</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>管理员邮箱</Text>
              <View style={styles.inputShell}>
                <Ionicons name="mail-outline" size={18} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="请输入邮箱"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>密码</Text>
              <View style={styles.inputShell}>
                <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="请输入密码"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>登录后台</Text>}
            </TouchableOpacity>

            <Text style={styles.hint}>需要先在数据库 `admin_users` 中配置管理员邮箱。</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#eef3ff',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: '700',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#6b7280',
    marginBottom: 28,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputShell: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  submitButton: {
    marginTop: 6,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef3ff',
  },
  loadingText: {
    marginTop: 12,
    color: '#4b5563',
  },
});