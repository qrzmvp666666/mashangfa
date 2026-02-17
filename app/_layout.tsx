import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { I18nProvider } from '../lib/i18n';
import { Platform } from 'react-native';


export default function RootLayout() {
  // 在 web 平台设置页面标题
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.title = '将军令';
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <I18nProvider>
          <StatusBar style="light" />
          <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#14151A' },
            // 配置iOS原生风格的滑动转场动画
            animation: Platform.OS === 'ios' ? 'slide_from_right' : 'default', // iOS使用右滑，Android使用默认
            // iOS和Android的手势配置
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            // Web平台的转场配置
            ...(Platform.OS === 'web' && {
              animationTypeForReplace: 'push',
            }),
          }}
        >
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="qrcode" 
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }} 
          />
        </Stack>
        </I18nProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
