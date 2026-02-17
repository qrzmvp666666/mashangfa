import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableWithoutFeedback, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../components/Toast';
import { useTranslation } from '../lib/i18n';

// 导入图片资源
const customerQRImage = require('../assets/images/customer-service-qr.jpg');

const { width } = Dimensions.get('window');

const COLORS = {
  background: "#000000",
  cardDark: "#161616",
  cardHighlight: "#252525",
  textMain: "#F0F0F0",
  textSub: "#888888",
  accentOrange: "#F0B90B",
  borderDark: "#252525",
  white: "#ffffff",
  black: "#000000",
};

export default function QRCodePage() {
  useProtectedRoute(); // 保护路由
  const router = useRouter();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // 复制电报ID到剪贴板
  const handleCopyTelegramId = async () => {
    try {
      await Clipboard.setStringAsync('@Michael_Qin');
      setToast({ visible: true, message: t('qrcode.telegramIdCopied'), type: 'success' });
    } catch (error) {
      console.error('复制失败:', error);
      setToast({ visible: true, message: t('qrcode.copyFailed'), type: 'error' });
    }
  };

  // 下载图片到相册
  const handleSaveImage = async () => {
    if (isSaving) return;
    
    console.log('开始保存图片, Platform:', Platform.OS);
    
    try {
      setIsSaving(true);

      // Web 端特殊处理 - 直接下载
      if (Platform.OS === 'web') {
        console.log('Web端下载开始');
        try {
          // Web端直接使用require的路径
          const imageModule = customerQRImage;
          console.log('图片模块:', imageModule);

          // Web环境下，require返回的是资源路径
          const imagePath = typeof imageModule === 'number' 
            ? imageModule 
            : (imageModule.uri || imageModule);

          console.log('图片路径:', imagePath);

          // 使用 fetch 获取图片
          const response = await fetch(imagePath);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          console.log('Blob 大小:', blob.size, 'bytes', 'Blob类型:', blob.type);
          
          if (blob.size === 0) {
            throw new Error('图片文件为空');
          }

          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = '客服二维码.jpg';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          // 延迟清理
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 100);
          
          console.log('Web端下载完成');
          Alert.alert(t('qrcode.saveSuccess'), t('qrcode.saveSuccessWeb'));
        } catch (error) {
          console.error('Web下载失败:', error);
          const errorMsg = error instanceof Error ? error.message : t('qrcode.unknownError');
          Alert.alert(t('qrcode.downloadFailed'), t('qrcode.downloadFailedMessage', { error: errorMsg }));
        }
        setIsSaving(false);
        return;
      }

      // 移动端：加载图片资源
      console.log('移动端保存开始');
      const asset = await Asset.fromModule(customerQRImage).downloadAsync();
      console.log('Asset 信息:', {
        localUri: asset.localUri,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });

      // 请求媒体库权限
      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log('权限状态:', status);

      if (status !== 'granted') {
        Alert.alert(t('qrcode.permissionRequired'), t('qrcode.permissionRequiredMessage'));
        setIsSaving(false);
        return;
      }

      if (!asset.localUri) {
        throw new Error('无法获取本地图片路径');
      }

      console.log('保存路径:', asset.localUri);

      // 保存到相册
      const savedAsset = await MediaLibrary.createAssetAsync(asset.localUri);
      console.log('保存成功:', savedAsset);

      Alert.alert(t('qrcode.saveSuccess'), t('qrcode.saveSuccessAlbum'));
      setIsSaving(false);
    } catch (error) {
      console.error('保存图片失败:', error);
      const errorMsg = error instanceof Error ? error.message : t('qrcode.unknownError');
      Alert.alert(t('qrcode.saveFailed'), t('qrcode.saveFailedMessage', { error: errorMsg }));
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={() => router.back()}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.content}>
        {/* 直接显示二维码图片 */}
        <View style={styles.qrContainer}>
          <Image 
            source={customerQRImage}
            style={styles.qrImage}
            resizeMode="contain"
          />
          
          {/* 按钮容器 */}
          <View style={styles.buttonContainer}>
            {/* 下载按钮 */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleSaveImage}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={20} color="#000" />
              <Text style={styles.buttonText}>
                {isSaving ? t('qrcode.saving') : t('qrcode.saveToAlbum')}
              </Text>
            </TouchableOpacity>

            {/* 添加电报ID按钮 */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopyTelegramId}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={20} color="#000" />
              <Text style={styles.buttonText}>{t('qrcode.addTelegramId')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Toast 提示 */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      touchAction: 'pan-y' as any,
    }),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
  qrContainer: {
    alignItems: 'center',
    pointerEvents: 'auto',
  },
  qrImage: {
    width: width * 0.85,
    height: width * 0.85,
    maxWidth: 500,
    maxHeight: 500,
    borderRadius: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  tipText: {
    marginTop: 24,
    color: COLORS.textSub,
    fontSize: 14,
    textAlign: 'center',
  },
});
