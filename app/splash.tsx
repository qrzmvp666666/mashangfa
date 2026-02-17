import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const JiangJunLingLogo = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.logoWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        }
      ]}
    >
      <Text style={styles.chineseText}>将军令</Text>
    </Animated.View>
  );
};

export default function SplashScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    // 超时保护：5秒后强制跳转到登录页
    const forceRedirectTimer = setTimeout(() => {
      console.warn('Auth loading timeout, forcing redirect to login');
      router.replace('/login');
    }, 5000);

    if (loading) return () => clearTimeout(forceRedirectTimer);

    // 正常流程：等待2秒后跳转
    const timer = setTimeout(() => {
      clearTimeout(forceRedirectTimer);
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(forceRedirectTimer);
    };
  }, [loading, session]);

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <JiangJunLingLogo />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(19, 21, 29)',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -80,
  },
  logoWrapper: {
    alignItems: 'center',
  },
  chineseText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 10,
  },
});
