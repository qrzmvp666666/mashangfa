import { Redirect } from 'expo-router';

export default function Index() {
  // 重定向到 tabs 首页（彩票页面）
  return <Redirect href="/(tabs)" />;
}
