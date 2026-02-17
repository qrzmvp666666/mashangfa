import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Animated, Pressable } from 'react-native';
import { useRef, useEffect } from 'react';
import { usePathname } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../lib/i18n';

// Tab Screen 组件包装器 - 支持动态标题
function TabScreenWrapper({
  name,
  titleKey,
  children,
}: {
  name: string;
  titleKey: string;
  children: React.ReactNode;
}) {
  const { t, language } = useTranslation();

  useEffect(() => {
    // 当语言变化时，通过 navigation 设置标题
    // 这个方法在 Expo Router 中可能不完全有效，
    // 但至少可以确保组件重新渲染
  }, [language, titleKey]);

  return <>{children}</>;
}

export default function TabLayout() {
  const pathname = usePathname();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const { session, loading } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();
  const segments = useSegments();

  // 登录检查 - 只检查我的页面，首页不需要登录
  useEffect(() => {
    if (loading) return;

    const currentPath = pathname || '';
    const inMyPage = currentPath.includes('/my');

    if (!session && inMyPage) {
      // 未登录但在我的页面，重定向到登录页
      router.replace('/login');
    }
  }, [session, loading, pathname]);

  useEffect(() => {
    if (pathname === '/trade') {
      // 切换到交易页，旋转90度并保持
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // 切换到其他页面，返回原状
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [pathname]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
      }}
    >
      {/* 首页 */}
      <Tabs.Screen
        name="index"
        options={{
          title: language === 'zh' ? '首页' : 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* 交易页 - 突出的圆形按钮 - 暂时隐藏 */}
      {false && (
        <Tabs.Screen
          name="trade"
          options={{
            title: language === 'zh' ? '交易' : 'Trade',
            tabBarIcon: ({ focused }) => (
              <View style={styles.tradeButton}>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <Ionicons
                    name="swap-horizontal"
                    size={28}
                    color="#000000"
                  />
                </Animated.View>
              </View>
            ),
          }}
        />
      )}

      {/* 我的页面 */}
      <Tabs.Screen
        name="my"
        options={{
          title: language === 'zh' ? '我的' : 'My',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tradeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});
