import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSettings, TIMEZONES, Language, Timezone } from '../contexts/SettingsContext';
import { useTranslation } from '../lib/i18n';

const COLORS = {
  backgroundDark: "#000000",
  cardDark: "#161616",
  cardHighlight: "#252525",
  textMainDark: "#F0F0F0",
  textSubDark: "#888888",
  borderDark: "#252525",
  white: "#FFFFFF",
  primary: "#ffffff",
};

export default function SettingsPage() {
  const router = useRouter();
  const { language, timezone, setLanguage, setTimezone } = useSettings();
  const { t } = useTranslation();

  // Modal State
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [timezoneModalVisible, setTimezoneModalVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleLanguageChange = async (lang: Language) => {
    try {
      await setLanguage(lang);
      setLanguageModalVisible(false);
      setToastType('success');
      setToastMessage(t('settings.languageUpdated'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    } catch (error) {
      setToastType('error');
      setToastMessage(t('settings.settingFailed'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleTimezoneChange = async (tz: Timezone) => {
    try {
      await setTimezone(tz);
      setTimezoneModalVisible(false);
      setToastType('success');
      setToastMessage(t('settings.timezoneUpdated'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    } catch (error) {
      setToastType('error');
      setToastMessage(t('settings.settingFailed'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          {/* Language Setting Row - 暂时隐藏 */}
          {false && (
            <>
              <TouchableOpacity
                style={styles.row}
                onPress={() => setLanguageModalVisible(true)}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="language-outline" size={22} color={COLORS.textMainDark} />
                  <Text style={styles.label}>{t('settings.languageSetting')}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.valueText}>{language === 'zh' ? '中文' : 'English'}</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSubDark} />
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />
            </>
          )}

          {/* Timezone Setting Row */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setTimezoneModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="time-outline" size={22} color={COLORS.textMainDark} />
              <Text style={styles.label}>{t('settings.timezoneSetting')}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valueText}>{timezone.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSubDark} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.textSubDark} />
          <Text style={styles.tipText}>
            {t('settings.timezoneDescription')}
          </Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMainDark} />
              </TouchableOpacity>
            </View>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleLanguageChange('zh')}
              >
                <Text style={styles.optionText}>中文</Text>
                {language === 'zh' && (
                  <Ionicons name="checkmark" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
              <View style={styles.optionDivider} />
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={styles.optionText}>English</Text>
                {language === 'en' && (
                  <Ionicons name="checkmark" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Timezone Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={timezoneModalVisible}
        onRequestClose={() => setTimezoneModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimezoneModalVisible(false)}
        >
          <View style={[styles.modalContent, styles.timezoneModalContent]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.selectTimezone')}</Text>
              <TouchableOpacity onPress={() => setTimezoneModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMainDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.timezoneScroll}>
              <View style={styles.optionsContainer}>
                {TIMEZONES.map((tz, index) => (
                  <React.Fragment key={tz.value}>
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => handleTimezoneChange(tz)}
                    >
                      <Text style={styles.optionText}>{tz.label}</Text>
                      {timezone.value === tz.value && (
                        <Ionicons name="checkmark" size={24} color="#4CAF50" />
                      )}
                    </TouchableOpacity>
                    {index < TIMEZONES.length - 1 && <View style={styles.optionDivider} />}
                  </React.Fragment>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toastContent}>
            <Ionicons
              name={toastType === 'success' ? "checkmark-circle" : "close-circle"}
              size={20}
              color={toastType === 'success' ? "#4CAF50" : "#FF4D4F"}
            />
            <Text style={styles.toastText}>{toastMessage}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.cardDark,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.cardDark,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMainDark,
  },
  valueText: {
    fontSize: 14,
    color: COLORS.textSubDark,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(37, 37, 37, 0.5)',
    marginHorizontal: 16,
  },
  tipCard: {
    marginTop: 16,
    backgroundColor: 'rgba(37, 37, 37, 0.3)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 37, 37, 0.5)',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSubDark,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.cardDark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderBottomWidth: 0,
    overflow: 'hidden',
    maxHeight: '60%',
  },
  timezoneModalContent: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMainDark,
  },
  optionsContainer: {
    backgroundColor: COLORS.cardDark,
  },
  timezoneScroll: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.textMainDark,
  },
  optionDivider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginHorizontal: 20,
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
