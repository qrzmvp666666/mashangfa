import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Modal, Platform, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import ImageCropper from './_components/ImageCropper';
import { useAuth } from '../../contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { updateAvatarComplete } from '../../lib/avatarService';
import { isVipActive } from '../../lib/redemptionService';
import { useTranslation } from '../../lib/i18n';

const COLORS = {
  backgroundDark: "#f5f5f5",
  cardDark: "#ffffff",
  cardHighlight: "#f0f0f0",
  textMainDark: "#333333",
  textSubDark: "#666666",
  borderDark: "#e0e0e0",
  white: "#FFFFFF",
  primary: "#4a7cff",
};

export default function PersonalInfoPage() {
  useProtectedRoute(); // 保护路由
  const { user, profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // 页面加载时获取用户资料
  useEffect(() => {
    if (user?.id) {
      refreshProfile();
    }
  }, [user?.id]);

  // Data from profile or fallback to user object
  const avatarUri = profile?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuAaf9dVjkyC17LtClctTc-4sEEVvnJDQ0sqSp-elCOM8ljGaMwkhTiacOULcPPbYtSTu_lFPmnNtKsVxiOA5eHNZkJE8KHzJP-Ltx4rAvebxj5DVRDSPgWop3DQj8PuIxIIGVG_9IjKOT49af1xYWNvQQvVOeMdNj3kbhN4shXLBHo1Imm3YXyaQ_Bf8Gav9EMWI697UBzvaFwIV24Dxnf9tVPbk9jCB7kc-S_KzV8Gm3EW2a9jUrIkf3nvAt1kgTa8y1UdRtKUfg";
  const nickname = profile?.username || user?.email?.split('@')[0] || 'User';
  // 从 email 中提取自定义账号（去掉 @mashangfa.local 后缀）
  const rawEmail = user?.email || '';
  const accountName = rawEmail.endsWith('@mashangfa.local')
    ? decodeURIComponent(rawEmail.replace('@mashangfa.local', ''))
    : (profile?.account_id || (user?.id ? user.id.substring(0, 8).toUpperCase() : 'UNKNOWN'));
  // 用户ID（UUID前8位）
  const userId = user?.id ? user.id.substring(0, 8).toUpperCase() : 'UNKNOWN';
  const email = user?.email || '';
  const vipActive = isVipActive(profile?.vip_expires_at || null);

  const [modalVisible, setModalVisible] = useState(false);
  const [cropperVisible, setCropperVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Logout Modal & Toast State
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    // 显示成功提示
    setToastType('success');
    setToastMessage(t('profile.copySuccess'));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    // 1. Close modal immediately
    setLogoutModalVisible(false);

    // 2. Show success toast first
    setToastType('success');
    setToastMessage(t('profile.logoutSuccess'));
    setShowToast(true);

    try {
      // 3. Perform logout
      await signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }

    // 4. Redirect to home page after toast
    setTimeout(() => {
      setShowToast(false);
      router.replace('/(tabs)');
    }, 1500);
  };

  const pickImage = async () => {
    setModalVisible(false);

    // 请求相册权限
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setToastType('error');
      setToastMessage(t('profile.libraryPermissionDenied'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }

    try {
      // 启动图片选择器
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // 关闭系统裁剪，使用自定义裁剪
        quality: 1,
      });

      if (!result.canceled) {
        setTempImageUri(result.assets[0].uri);
        setCropperVisible(true);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      setToastType('error');
      setToastMessage(t('profile.photoPickerFailed'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const takePhoto = async () => {
    setModalVisible(false);

    // Web 端不支持相机
    if (Platform.OS === 'web') {
      setToastType('error');
      setToastMessage(t('profile.cameraNotSupported'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }

    // 请求相机权限
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setToastType('error');
      setToastMessage(t('profile.cameraPermissionDenied'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }

    try {
      // 启动相机
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // 关闭系统裁剪，使用自定义裁剪
        quality: 1,
      });

      if (!result.canceled) {
        setTempImageUri(result.assets[0].uri);
        setCropperVisible(true);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      // 模拟器会抛出错误
      if (error.message?.includes('simulator') || error.message?.includes('Camera') || error.message?.includes('available')) {
        setToastType('error');
        setToastMessage(t('profile.simulatorNoCamera'));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      } else {
        setToastType('error');
        setToastMessage(t('profile.photoFailed'));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    }
  };

  const handleCropComplete = async (uri: string) => {
    setCropperVisible(false);
    setTempImageUri(null);

    if (!user?.id) {
      setToastType('error');
      setToastMessage(t('profile.userInfoIncomplete'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }

    setUploadingAvatar(true);

    try {
      // 上传头像并更新数据库
      const newAvatarUrl = await updateAvatarComplete(
        user.id,
        uri,
        profile?.avatar_url
      );

      // 刷新用户资料
      await refreshProfile();

      // 显示成功提示
      setToastType('success');
      setToastMessage(t('profile.avatarUpdateSuccess'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error: any) {
      console.error('Avatar update error:', error);
      setToastType('error');
      setToastMessage(error.message || t('profile.avatarUploadFailed'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } finally {
      setUploadingAvatar(false);
    }
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
          onPress={() => router.replace('/(tabs)')}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>

          {/* Avatar Row - 暂时隐藏 */}
          {false && (
            <>
              <TouchableOpacity
                style={styles.row}
                onPress={() => setModalVisible(true)}
                disabled={uploadingAvatar}
              >
                <Text style={styles.label}>{t('profile.avatar')}</Text>
                <View style={styles.rowRight}>
                  <View style={styles.avatarImageContainer}>
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatar}
                    />
                    {/* VIP Badge - Bottom Right */}
                    {vipActive ? (
                      <View style={styles.vipBadge}>
                        <Ionicons name="diamond" size={12} color="#FFD700" />
                      </View>
                    ) : (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>Free</Text>
                      </View>
                    )}
                    {uploadingAvatar && (
                      <View style={styles.avatarLoadingOverlay}>
                        <ActivityIndicator color={COLORS.white} size="small" />
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSubDark} />
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}

          {/* Nickname Row - 暂时隐藏 */}
          {false && (
            <>
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push('/profile/edit-nickname')}
              >
                <Text style={styles.label}>{t('profile.nickname')}</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.valueText}>{nickname}</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSubDark} />
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}

          {/* Account Name Row */}
          <View style={styles.row}>
            <Text style={styles.label}>账号</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valueText}>{accountName}</Text>
              <TouchableOpacity
                style={styles.copyIconButton}
                onPress={() => handleCopy(accountName)}
              >
                <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* User ID Row */}
          <View style={styles.row}>
            <Text style={styles.label}>ID</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valueText}>{userId}</Text>
              <TouchableOpacity
                style={styles.copyIconButton}
                onPress={() => handleCopy(userId)}
              >
                <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Change Password Row */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/profile/change-password')}
          >
            <Text style={styles.label}>{t('profile.changePassword')}</Text>
            <View style={styles.rowRight}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSubDark} />
            </View>
          </TouchableOpacity>

          {/* QR Code Row - 暂时隐藏 */}
          {false && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row}>
                <Text style={styles.label}>{t('profile.qrCode')}</Text>
                <View style={styles.rowRight}>
                  <MaterialIcons name="qr-code-2" size={24} color={COLORS.textSubDark} style={{ marginRight: 4 }} />
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSubDark} />
                </View>
              </TouchableOpacity>
            </>
          )}

        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContent}>
            <Text style={styles.logoutModalTitle}>{t('profile.prompt')}</Text>
            <Text style={styles.logoutModalMessage}>{t('profile.logoutConfirm')}</Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutCancelButton]}
                activeOpacity={0.7}
                onPress={() => {
                  console.log('Cancel pressed');
                  setLogoutModalVisible(false);
                }}
              >
                <Text style={styles.logoutCancelButtonText}>{t('profile.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutConfirmButton]}
                activeOpacity={0.7}
                onPress={() => {
                  console.log('Confirm pressed');
                  confirmLogout();
                }}
              >
                <Text style={styles.logoutConfirmButtonText}>{t('profile.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

      {/* Avatar Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalButtonsContainer}>
              {/* 只在非 Web 平台显示拍照选项 */}
              {Platform.OS !== 'web' && (
                <>
                  <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={24} color={COLORS.textMainDark} />
                    <Text style={styles.modalButtonText}>{t('profile.takePhoto')}</Text>
                  </TouchableOpacity>
                  <View style={styles.modalDivider} />
                </>
              )}
              <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
                <Ionicons name="images-outline" size={24} color={COLORS.textMainDark} />
                <Text style={styles.modalButtonText}>
                  {Platform.OS === 'web' ? t('profile.chooseImage') : t('profile.chooseFromLibrary')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>{t('profile.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Cropper */}
      <ImageCropper
        visible={cropperVisible}
        imageUri={tempImageUri}
        onCancel={() => {
          setCropperVisible(false);
          setTempImageUri(null);
        }}
        onComplete={handleCropComplete}
        cropShape="circle"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginHorizontal: 0,
    marginTop: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginLeft: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 34,
  },
  modalButtonsContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    gap: 8,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#2C2C2E',
  },
  cancelButton: {
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
  },
  modalButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    minWidth: 60,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  valueText: {
    fontSize: 15,
    color: '#4a4a4a',
    fontWeight: '400',
  },
  avatarImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardHighlight,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(37, 37, 37, 0.5)',
    position: 'relative',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardHighlight,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(37, 37, 37, 0.5)',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  vipBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1a1a1a',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
  },
  freeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.textSubDark,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.backgroundDark,
  },
  freeBadgeText: {
    color: COLORS.backgroundDark,
    fontSize: 8,
    fontWeight: 'bold',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyIconButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
  },
  copyButton: {
    backgroundColor: '#4a7cff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    shadowColor: '#4a7cff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  copyButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  bioText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'right',
    flex: 1,
  },
  logoutButton: {
    marginTop: 32,
    marginHorizontal: 0,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '500',
  },
  // Logout Modal Styles
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContent: {
    width: '80%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 20,
    textAlign: 'center',
  },
  logoutModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  logoutCancelButton: {
    backgroundColor: '#2C2C2C',
  },
  logoutConfirmButton: {
    backgroundColor: '#D32F2F',
  },
  logoutCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  logoutConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Toast Styles
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
