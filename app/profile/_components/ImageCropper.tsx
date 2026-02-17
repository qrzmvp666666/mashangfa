import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions, ScrollView, ActivityIndicator, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_SIZE = SCREEN_WIDTH - 80; // 裁剪区域大小（圆形）
const MASK_COLOR = 'rgba(0, 0, 0, 0.7)';

interface ImageCropperProps {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onComplete: (uri: string) => void;
  cropShape?: 'circle' | 'square'; // 裁剪形状
}

const COLORS = {
  backgroundDark: "#000000",
  cardDark: "#161616",
  primary: "#FFD700",
  textMainDark: "#F0F0F0",
  textSubDark: "#888888",
  white: "#FFFFFF",
};

export default function ImageCropper({ visible, imageUri, onCancel, onComplete, cropShape = 'circle' }: ImageCropperProps) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  
  // 缩放比例和偏移量
  const [scale, setScale] = useState(1);
  const [contentOffset, setContentOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (imageUri && scrollRef.current) {
      Image.getSize(imageUri, (width, height) => {
        // 计算适应屏幕的初始尺寸
        const ratio = width / height;
        let displayWidth = SCREEN_WIDTH;
        let displayHeight = SCREEN_WIDTH / ratio;
        
        // 如果高度太小，基于高度计算
        if (displayHeight < CROP_SIZE) {
            displayHeight = CROP_SIZE;
            displayWidth = CROP_SIZE * ratio;
        }

        setImageSize({ width: displayWidth, height: displayHeight });

        // 设置初始居中位置
        setTimeout(() => {
          if (scrollRef.current) {
            const paddingH = (SCREEN_WIDTH - CROP_SIZE) / 2;
            const paddingV = (SCREEN_HEIGHT - CROP_SIZE) / 2;
            
            // 计算居中偏移量
            const centerX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
            const centerY = Math.max(0, (displayHeight - CROP_SIZE) / 2);
            
            scrollRef.current.scrollTo({
              x: centerX,
              y: centerY,
              animated: false
            });
          }
        }, 100);
      });
    }
  }, [imageUri]);

  const handleCrop = async () => {
    if (!imageUri) return;
    setLoading(true);

    try {
      // 获取原始图片尺寸
      const originalSize = await new Promise<{width: number, height: number}>((resolve, reject) => {
        Image.getSize(
          imageUri, 
          (width, height) => resolve({width, height}),
          (error) => reject(error)
        );
      });

      console.log('Original size:', originalSize);
      console.log('Display size:', imageSize);
      console.log('Scale:', scale);
      console.log('Content offset:', contentOffset);
      console.log('Platform:', Platform.OS);

      // 计算显示图片相对于原图的基础缩放比例
      const baseScale = imageSize.width / originalSize.width;
      
      // 总缩放比例 = 基础缩放 × 用户缩放
      // Web 端的 ScrollView 不支持缩放，所以 scale 始终为 1
      const totalScale = baseScale * scale;
      
      console.log('Base scale:', baseScale);
      console.log('Total scale:', totalScale);

      // 计算裁剪区域在屏幕上的位置（相对于ScrollView内容）
      const padding = (SCREEN_WIDTH - CROP_SIZE) / 2;
      
      // Web 端特殊处理：如果没有偏移量，则居中裁剪
      let cropX, cropY;
      if (Platform.OS === 'web' && contentOffset.x === 0 && contentOffset.y === 0) {
        // 居中裁剪
        cropX = (imageSize.width - CROP_SIZE) / 2;
        cropY = (imageSize.height - CROP_SIZE) / 2;
      } else {
        cropX = contentOffset.x + padding;
        cropY = contentOffset.y + padding;
      }
      
      // 转换为原图坐标
      const originX = cropX / totalScale;
      const originY = cropY / totalScale;
      const cropSize = CROP_SIZE / totalScale;

      console.log('Crop params:', { originX, originY, width: cropSize, height: cropSize });

      // 确保裁剪参数有效
      const finalOriginX = Math.max(0, Math.min(originX, originalSize.width - 1));
      const finalOriginY = Math.max(0, Math.min(originY, originalSize.height - 1));
      const finalWidth = Math.min(cropSize, originalSize.width - finalOriginX);
      const finalHeight = Math.min(cropSize, originalSize.height - finalOriginY);

      console.log('Final crop params:', { 
        originX: finalOriginX, 
        originY: finalOriginY, 
        width: finalWidth, 
        height: finalHeight 
      });

      // 执行裁剪
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: finalOriginX,
              originY: finalOriginY,
              width: finalWidth,
              height: finalHeight,
            },
          },
          { resize: { width: 500, height: 500 } }
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      console.log('Crop successful:', result.uri);
      onComplete(result.uri);
    } catch (error) {
      console.error('Crop error:', error);
      alert(`裁剪失败: ${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !imageUri) return null;

  const paddingH = (SCREEN_WIDTH - CROP_SIZE) / 2;
  const paddingV = (SCREEN_HEIGHT - CROP_SIZE) / 2;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* 顶部提示栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>调整头像</Text>
          <TouchableOpacity onPress={handleCrop} style={styles.headerButton} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <Ionicons name="checkmark" size={28} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* 图片编辑区域 */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={{
            paddingHorizontal: paddingH,
            paddingVertical: paddingV,
          }}
          maximumZoomScale={3}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScroll={(e) => {
            const offset = e.nativeEvent.contentOffset;
            setContentOffset(offset);
            
            // iOS 和 Android 处理 zoomScale 的方式不同
            // @ts-ignore - zoomScale 在类型定义中不存在，但在运行时可用
            const zoom = e.nativeEvent.zoomScale;
            if (zoom !== undefined && zoom > 0) {
              setScale(zoom);
            }
          }}
          scrollEventThrottle={16}
          onScrollEndDrag={(e) => {
            // @ts-ignore
            const zoom = e.nativeEvent.zoomScale;
            if (zoom !== undefined && zoom > 0) {
              setScale(zoom);
            }
          }}
          onMomentumScrollEnd={(e) => {
            // @ts-ignore
            const zoom = e.nativeEvent.zoomScale;
            if (zoom !== undefined && zoom > 0) {
              setScale(zoom);
            }
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: imageSize.width, height: imageSize.height }}
            resizeMode="contain"
          />
        </ScrollView>

        {/* SVG 遮罩层 - 圆形裁剪框 */}
        <View style={styles.maskContainer} pointerEvents="none">
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="mask">
                <Rect x="0" y="0" width="100%" height="100%" fill="white" />
                <Circle cx={SCREEN_WIDTH / 2} cy={SCREEN_HEIGHT / 2} r={CROP_SIZE / 2} fill="black" />
              </Mask>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={MASK_COLOR} mask="url(#mask)" />
            {/* 绘制两个圆形边框，增强视觉效果 */}
            <Circle 
                cx={SCREEN_WIDTH / 2} 
                cy={SCREEN_HEIGHT / 2} 
                r={CROP_SIZE / 2} 
                stroke="rgba(255,255,255,0.8)" 
                strokeWidth="2" 
                fill="transparent" 
            />
            <Circle 
                cx={SCREEN_WIDTH / 2} 
                cy={SCREEN_HEIGHT / 2} 
                r={CROP_SIZE / 2 + 1} 
                stroke="rgba(0,0,0,0.5)" 
                strokeWidth="1" 
                fill="transparent" 
            />
          </Svg>
        </View>

        {/* 底部提示文字 */}
        <View style={styles.footer}>
          <Text style={styles.tipText}>
            {Platform.OS === 'web' 
              ? '拖动图片进行调整' 
              : '双指缩放和拖动图片进行调整'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMainDark,
  },
  scrollView: {
    flex: 1,
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingBottom: 50,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textSubDark,
    textAlign: 'center',
  },
});
