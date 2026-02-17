import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function TraderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#14151A' },
        // iOS原生风格的滑动转场动画
        animation: Platform.OS === 'ios' ? 'slide_from_right' : 'default',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        ...(Platform.OS === 'web' && {
          animationTypeForReplace: 'push',
        }),
      }}
    >
      <Stack.Screen name="detail" />
    </Stack>
  );
}
