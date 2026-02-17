import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

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

export default function EditNicknamePage() {
  useProtectedRoute();
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const currentNickname = profile?.username || user?.email?.split('@')[0] || '';
    setNickname(currentNickname);
  }, [profile, user]);

  // 实时校验昵称
  const validateNickname = (value: string) => {
    if (!value.trim()) {
      setErrorMsg(t('editNickname.nicknameRequired'));
      return false;
    }
    if (value.length < 2) {
      setErrorMsg(t('editNickname.nicknameTooShort'));
      return false;
    }
    if (value.length > 20) {
      setErrorMsg(t('editNickname.nicknameTooLong'));
      return false;
    }
    // 检查是否只包含中文、英文和数字
    const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
    if (!validPattern.test(value)) {
      setErrorMsg(t('editNickname.nicknameRequired') + '\n' + t('editNickname.nicknameTooShort'));
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    validateNickname(value);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!validateNickname(nickname)) {
      return;
    }

    setSaving(true);
    try {
      const updatePromise = supabase
        .from('users')
        .update({ username: nickname.trim() })
        .eq('id', user.id);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout, please try again')), 15000)
      );

      const result = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (result.error) throw result.error;

      await refreshProfile();

      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
        router.back();
      }, 1500);
    } catch (error: any) {
      let errorMessage = t('editNickname.saveFailed');
      if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const clearNickname = () => {
    setNickname("");
    setErrorMsg(t('editNickname.nicknameRequired'));
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
        <Text style={styles.headerTitle}>{t('editNickname.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, saving && { opacity: 0.5 }]}>
            {saving ? t('editNickname.saving') : t('editNickname.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={handleNicknameChange}
            placeholder={t('editNickname.placeholder')}
            placeholderTextColor="rgba(136, 136, 136, 0.5)"
            selectionColor={COLORS.accentOrange}
            autoFocus
          />
          {nickname.length > 0 && (
            <TouchableOpacity onPress={clearNickname} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSubDark} />
            </TouchableOpacity>
          )}
        </View>

        {/* 错误提示 */}
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#FF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.helperTextContainer}>
          <Text style={styles.helperText}>{t('editNickname.nicknameTooShort')}, {t('editNickname.nicknameTooLong')}</Text>
        </View>
      </View>

      {/* Success Toast */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toastContent}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.toastText}>{t('editNickname.saveSuccess')}</Text>
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
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardDark,
  },
  input: {
    flex: 1,
    color: COLORS.textMainDark,
    fontSize: 16,
    height: '100%',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
    }),
  } as any,
  clearButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 13,
    lineHeight: 18,
  },
  helperTextContainer: {
    paddingHorizontal: 4,
  },
  helperText: {
    color: COLORS.textSubDark,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContent: {
    backgroundColor: '#333333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
});
