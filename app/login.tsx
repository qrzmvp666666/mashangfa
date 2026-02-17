import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../lib/i18n';
import Toast from '../components/Toast';

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
  yellowText: "#facc15",
};

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { signInWithOtp, verifyOtp, signInWithPassword } = useAuth();
  const { t } = useTranslation();
  const isDark = true;

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isPasswordLogin, setIsPasswordLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) {
      setToastMessage(t('login.pleaseEnterEmail'));
      setToastType('warning');
      setShowToast(true);
      return;
    }
    setLoading(true);
    const { error } = await signInWithOtp(email);
    setLoading(false);
    if (error) {
      setToastMessage(error.message);
      setToastType('error');
      setShowToast(true);
    } else {
      setCountdown(60);
      setToastMessage(t('login.codeSent'));
      setToastType('success');
      setShowToast(true);
    }
  };

  const handleLogin = async () => {
    if (!email) {
      setToastMessage(t('login.pleaseEnterEmail'));
      setToastType('warning');
      setShowToast(true);
      return;
    }
    setLoading(true);
    let result;
    if (isPasswordLogin) {
      if (!password) {
        setToastMessage(t('login.pleaseEnterPassword'));
        setToastType('warning');
        setShowToast(true);
        setLoading(false);
        return;
      }
      result = await signInWithPassword(email, password);
    } else {
      if (!code) {
        setToastMessage(t('login.pleaseEnterCode'));
        setToastType('warning');
        setShowToast(true);
        setLoading(false);
        return;
      }
      result = await verifyOtp(email, code);
    }
    setLoading(false);

    if (result.error) {
      setToastMessage(result.error.message || t('login.loginFailed'));
      setToastType('error');
      setShowToast(true);
    } else {
      router.replace('/(tabs)');
    }
  };

  const theme = {
    background: COLORS.background,
    text: COLORS.textMain,
    textSecondary: COLORS.textMuted,
    inputBg: COLORS.surface,
    inputBorder: COLORS.border,
    placeholder: COLORS.textMuted,
    mainButtonBg: COLORS.textMain,
    mainButtonText: COLORS.background,
    socialBg: COLORS.surface,
    socialBorder: COLORS.border,
    socialHover: COLORS.surfaceLight,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('login.title')}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.text }]}>{t('login.welcome')}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t('login.subtitle')}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>{t('login.email')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {email.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setEmail('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {isPasswordLogin ? t('login.password') : t('login.verificationCode')}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsPasswordLogin(!isPasswordLogin)}
                >
                  <Text style={{ fontSize: 14, color: theme.text, fontWeight: '500' }}>
                    {isPasswordLogin ? t('login.switchToCode') : t('login.switchToPassword')}
                  </Text>
                </TouchableOpacity>
              </View>
              {isPasswordLogin ? (
                <View style={[
                  styles.inputWrapper,
                  styles.passwordInputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                  }
                ]}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      {
                        color: theme.text,
                      },
                    ]}
                    placeholder={t('login.enterPassword')}
                    placeholderTextColor={theme.placeholder}
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
              ) : (
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                        paddingRight: 100,
                      },
                    ]}
                    placeholder={t('login.enterCode')}
                    placeholderTextColor={theme.placeholder}
                    value={code}
                    onChangeText={setCode}
                    maxLength={6}
                    keyboardType="number-pad"
                  />
                  {code.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setCode('')}
                      style={[styles.clearButton, { right: 90 }]}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.getCodeButton, countdown > 0 && { opacity: 0.5 }]}
                    onPress={handleSendCode}
                    disabled={countdown > 0 || loading}
                  >
                    <Text style={styles.getCodeText}>
                      {countdown > 0 ? `${countdown}s` : t('login.getCode')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: theme.mainButtonBg }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.mainButtonText} />
              ) : (
                <Text style={[styles.mainButtonText, { color: theme.mainButtonText }]}>
                  {t('login.loginOrRegister')}
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
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
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 16,
    zIndex: 1,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
    zIndex: 2,
  },
  eyeButton: {
    position: 'absolute',
    right: 44,
    padding: 4,
    zIndex: 2,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  passwordClearButton: {
    padding: 4,
    marginLeft: 4,
  },
  passwordEyeButton: {
    padding: 4,
    marginLeft: 4,
  },
  getCodeButton: {
    position: 'absolute',
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  getCodeText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: '500',
  },
  switchLoginButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  switchLoginText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  actionContainer: {
    marginTop: 32,
  },
  mainButton: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  linkText: {
    color: COLORS.primary,
  },
});
