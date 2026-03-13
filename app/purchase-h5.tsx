import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_H5_URL = 'http://localhost:5173/';

export default function PurchaseH5Page() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string; planName?: string; phone?: string; source?: string }>();
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [useExternalFallback, setUseExternalFallback] = useState(false);
  const hasAutoOpenedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseUrl = process.env.EXPO_PUBLIC_PURCHASE_H5_URL || DEFAULT_H5_URL;

  const finalUrl = useMemo(() => {
    try {
      const url = new URL(baseUrl);
      if (params.planId) {
        url.searchParams.set('planId', String(params.planId));
      }
      if (params.planName) {
        url.searchParams.set('planName', String(params.planName));
      }
      if (params.phone) {
        url.searchParams.set('phone', String(params.phone));
      }
      url.searchParams.set('source', 'A');
      return url.toString();
    } catch {
      return DEFAULT_H5_URL;
    }
  }, [baseUrl, params.planId, params.planName, params.phone]);

  const openExternal = () => {
    if (typeof window !== 'undefined') {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsIframeLoaded(false);
    setUseExternalFallback(false);
    hasAutoOpenedRef.current = false;

    timeoutRef.current = setTimeout(() => {
      setUseExternalFallback(true);
    }, 7000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [finalUrl]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !useExternalFallback || hasAutoOpenedRef.current) {
      return;
    }
    hasAutoOpenedRef.current = true;
    openExternal();
  }, [useExternalFallback, finalUrl]);

  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#6aa8ff', '#4a7cff', '#3a6cee']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>立即购买</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.unsupportedContainer}>
          <Text style={styles.unsupportedText}>当前页面仅支持 H5 端显示</Text>
        </View>
      </SafeAreaView>
    );
  }

  const iframeElement = React.createElement('iframe', {
    src: finalUrl,
    style: styles.iframe as any,
    allow: 'payment *; fullscreen *',
    onLoad: () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsIframeLoaded(true);
      setUseExternalFallback(false);
    },
    onError: () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setUseExternalFallback(true);
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#6aa8ff', '#4a7cff', '#3a6cee']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>立即购买</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>
      <View style={styles.iframeContainer}>
        {!useExternalFallback && iframeElement}

        {useExternalFallback && (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackTitle}>页面加载较慢或证书异常</Text>
            <Text style={styles.fallbackDesc}>已尝试为你打开外部浏览器，你也可以手动重新打开。</Text>
            <TouchableOpacity onPress={openExternal} style={styles.fallbackButton}>
              <Text style={styles.fallbackButtonText}>在新窗口打开支付页</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isIframeLoaded && !useExternalFallback && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>正在加载支付页...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  iframeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  iframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  fallbackDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  fallbackButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#3a6cee',
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  unsupportedText: {
    fontSize: 16,
    color: '#666',
  },
});
