# 语言和时区设置功能

## 概述

本次更新为应用添加了完整的语言设置和时区设置功能，允许用户：
1. 选择界面语言（中文/英文）
2. 选择时区（支持全球主要时区）
3. 所有时间显示自动根据所选时区进行转换

## 新增文件

### 1. Context和工具
- **`contexts/SettingsContext.tsx`** - 设置上下文，管理语言和时区状态
- **`lib/timezoneUtils.ts`** - 时区转换工具函数

### 2. 页面
- **`app/settings.tsx`** - 独立的设置页面，包含语言和时区选择

### 3. 文档
- **`docs/TIMEZONE_USAGE.md`** - 时区转换使用指南
- **`docs/TIMEZONE_MIGRATION.md`** - 现有组件迁移指南

## 修改的文件

1. **`app/_layout.tsx`** - 添加了 SettingsProvider 包裹整个应用
2. **`app/(tabs)/my.tsx`** - 为"设置"菜单项添加了点击事件

## 功能特性

### 语言设置
- 支持中文和英文
- 默认语言：中文
- 设置保存在本地存储，应用重启后保持

### 时区设置
- 支持20个主要时区（UTC-8 到 UTC+12）
- 默认时区：UTC+8（北京时间）
- 所有接口返回的UTC+0时间会自动转换为用户选择的时区
- 设置保存在本地存储，应用重启后保持

## 使用方式

### 用户操作
1. 在"我的"标签页点击"设置"
2. 选择"语言设置"可切换中文/英文
3. 选择"时区设置"可选择时区

### 开发者使用

#### 获取当前设置
```tsx
import { useSettings } from '../contexts/SettingsContext';

function MyComponent() {
  const { language, timezone } = useSettings();
  // language: 'zh' | 'en'
  // timezone: { label: string, value: string, offset: number }
}
```

#### 转换时间
```tsx
import { formatDateTime, formatRelativeTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function MyComponent({ signal }) {
  const { timezone, language } = useSettings();
  
  // 显示完整时间：2026-01-03 16:30
  const fullTime = formatDateTime(signal.created_at, timezone.offset, 'datetime');
  
  // 显示相对时间：5分钟前
  const relativeTime = formatRelativeTime(signal.created_at, timezone.offset, language);
}
```

## 可用的时区

- UTC+0 (伦敦)
- UTC+1 (柏林)
- UTC+2 (开罗)
- UTC+3 (莫斯科)
- UTC+4 (迪拜)
- UTC+5 (伊斯兰堡)
- UTC+5.5 (新德里)
- UTC+6 (达卡)
- UTC+7 (曼谷)
- UTC+8 (北京/香港) ⭐ 默认
- UTC+9 (东京)
- UTC+10 (悉尼)
- UTC+11 (所罗门群岛)
- UTC+12 (奥克兰)
- UTC-5 (纽约)
- UTC-6 (芝加哥)
- UTC-7 (丹佛)
- UTC-8 (洛杉矶)
- UTC-4 (圣地亚哥)
- UTC-3 (圣保罗)

## 时区转换工具函数

### `formatDateTime(utcDateString, timezoneOffset, format)`
转换UTC时间为指定时区的格式化字符串
- `format`: 'full' | 'date' | 'time' | 'datetime'

### `formatRelativeTime(utcDateString, timezoneOffset, language)`
转换为相对时间（如"5分钟前"）
- `language`: 'zh' | 'en'

### `convertUTCToTimezone(utcDateString, timezoneOffset)`
转换UTC时间为指定时区的Date对象

### `convertTimezoneToUTC(localDate, timezoneOffset)`
转换本地时间为UTC时间（用于发送给服务器）

### `getCurrentTimezoneDate(timezoneOffset)`
获取当前时区的当前时间

## 技术实现

### 数据存储
- 使用 `@react-native-async-storage/async-storage` 持久化保存设置
- 键名：
  - `@app_language` - 语言设置
  - `@app_timezone` - 时区设置（JSON格式）

### Context架构
```
App Root (_layout.tsx)
├── AuthProvider
│   └── SettingsProvider
│       └── App Content
```

### 时区转换逻辑
1. 所有API返回的时间都是UTC+0（ISO格式）
2. 前端使用 `timezoneUtils` 转换为用户选择的时区
3. 发送给服务器时使用 `convertTimezoneToUTC` 转换回UTC+0

## 后续工作建议

1. **更新现有组件**：参考 `docs/TIMEZONE_MIGRATION.md` 更新现有的时间显示
2. **国际化（i18n）**：基于语言设置实现完整的多语言支持
3. **时区自动检测**：可选择性地根据设备时区自动设置
4. **更多时区**：如有需要可扩展 `TIMEZONES` 数组

## 测试建议

1. 切换语言，检查UI更新
2. 切换时区，检查所有时间显示是否正确转换
3. 重启应用，检查设置是否持久化
4. 测试极端时区（UTC-8 和 UTC+12）
5. 测试夏令时相关的时区

## 相关文档

- [时区转换使用指南](./docs/TIMEZONE_USAGE.md)
- [现有组件迁移指南](./docs/TIMEZONE_MIGRATION.md)
