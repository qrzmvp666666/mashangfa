import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_H5_URL = 'http://localhost:5173/';

export default function PurchaseH5Page() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string; planName?: string; phone?: string; source?: string }>();

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
      <View style={styles.iframeContainer}>{iframeElement}</View>
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
