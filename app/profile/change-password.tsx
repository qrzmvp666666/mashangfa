import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../lib/i18n';

const COLORS = {
  backgroundDark: "#000000",
  cardDark: "#161616",
  cardHighlight: "#252525",
  textMainDark: "#F0F0F0",
  textSubDark: "#888888",
  borderDark: "#252525",
  accentOrange: "#F0B90B",
  primary: "#ffffff",
};

export default function ChangePasswordPage() {
  useProtectedRoute();
  const router = useRouter();
  const { user, updatePassword } = useAuth();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const email = user?.email || '';

  // 实时校验新密码
  const validateNewPassword = (value: string) => {
    if (!value.trim()) {
      setPasswordError(t('changePassword.passwordRequired'));
      return false;
    }
    if (value.length < 6) {
      setPasswordError(t('changePassword.passwordMinLength'));
      return false;
    }
    setPasswordError("");

    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError(t('changePassword.passwordMismatch'));
    } else if (confirmPassword) {
      setConfirmPasswordError("");
    }

    return true;
  };

  // 实时校验确认密码
  const validateConfirmPassword = (value: string) => {
    if (!value.trim()) {
      setConfirmPasswordError(t('changePassword.confirmPasswordRequired'));
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError(t('changePassword.passwordMismatch'));
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  // 处理新密码输入
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value) {
      validateNewPassword(value);
    } else {
      setPasswordError("");
    }
  };

  // 处理确认密码输入
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (value) {
      validateConfirmPassword(value);
    } else {
      setConfirmPasswordError("");
    }
  };

  // 提交时的最终校验
  const validatePassword = () => {
    let isValid = true;

    if (!password.trim()) {
      setPasswordError(t('changePassword.passwordRequired'));
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError(t('changePassword.passwordMinLength'));
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError(t('changePassword.confirmPasswordRequired'));
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError(t('changePassword.passwordMismatch'));
      isValid = false;
    } else {
      setConfirmPasswordError("");
    }

    return isValid;
  };

  const handleSave = async () => {
    const isValid = validatePassword();

    if (!isValid) {
      return;
    }

    setSaving(true);

    try {
      const updatePromise = updatePassword(password);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error(t('changePassword.timeoutError')));
        }, 35000)
      );

      const result = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (result?.error) {
        throw result.error;
      }

      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
        router.back();
      }, 1500);

    } catch (error: any) {
      let errorMessage = t('changePassword.saveFailed');
      if (error?.message) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
        errorMessage += '\n\n' + t('changePassword.timeoutReason1') + '\n' +
          t('changePassword.timeoutReason2') + '\n' +
          t('changePassword.timeoutReason3') + '\n' +
          t('changePassword.timeoutReason4') + '\n\n' +
          t('changePassword.timeoutSuggestion');
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/profile');
            }
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('changePassword.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Email (Read-only) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('changePassword.emailAccount')}</Text>
          <View style={styles.emailContainer}>
            <Text style={styles.emailText}>{email}</Text>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('changePassword.newPassword')}</Text>
          <View style={[styles.inputContainer, passwordError && styles.inputContainerError]}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={handlePasswordChange}
              placeholder={t('changePassword.enterNewPassword')}
              placeholderTextColor="rgba(136, 136, 136, 0.5)"
              selectionColor={COLORS.accentOrange}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            {password.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setPassword('');
                  setPasswordError('');
                }}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.textSubDark}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={COLORS.textSubDark}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#FF4444" />
              <Text style={styles.errorText}>{passwordError}</Text>
            </View>
          ) : null}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('changePassword.confirmNewPassword')}</Text>
          <View style={[styles.inputContainer, confirmPasswordError && styles.inputContainerError]}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              placeholder={t('changePassword.enterConfirmPassword')}
              placeholderTextColor="rgba(136, 136, 136, 0.5)"
              selectionColor={COLORS.accentOrange}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            {confirmPassword.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setConfirmPassword('');
                  setConfirmPasswordError('');
                }}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.textSubDark}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={COLORS.textSubDark}
              />
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#FF4444" />
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            </View>
          ) : null}
        </View>

        {/* Helper Text */}
        <View style={styles.helperTextContainer}>
          <Text style={styles.helperText}>{t('changePassword.helperText1')}</Text>
          <Text style={styles.helperText}>{t('changePassword.helperText2')}</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>
            {saving ? t('changePassword.saving') : t('changePassword.save')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Toast */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toastContent}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.toastText}>{t('changePassword.saveSuccess')}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMainDark,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSubDark,
    marginBottom: 8,
  },
  emailContainer: {
    backgroundColor: COLORS.cardDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  emailText: {
    fontSize: 15,
    color: COLORS.textMainDark,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  inputContainerError: {
    borderColor: '#FF4444',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textMainDark,
    paddingVertical: 14,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF4444',
    marginLeft: 4,
  },
  helperTextContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSubDark,
    marginBottom: 4,
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 22, 22, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  toastText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
});
