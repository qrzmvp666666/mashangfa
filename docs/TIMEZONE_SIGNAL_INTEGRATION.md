# 信号时间时区集成文档

## 概述

本文档记录了将时区设置集成到信号显示的各个页面中的更改。现在所有的委托时间、出场时间都会根据用户在设置页面选择的时区来显示。

## 修改的文件

### 1. `lib/timezoneUtils.ts`

**修改内容:**
- 更新了 `formatDateTime` 函数的日期分隔符从 `-` 改为 `/`，以匹配界面上的显示格式
- 保持了时间格式为 `YYYY/MM/DD HH:mm:ss`

**示例:**
```typescript
// 原格式: 2026-01-12 22:01:00
// 新格式: 2026/01/12 22:01:00
```

### 2. `components/SignalCard.tsx`

**修改内容:**
- 导入 `useSettings` hook 和 `formatDateTime` 函数
- 在组件中获取用户的时区设置
- 使用 `formatDateTime` 来格式化委托时间

**修改代码:**
```tsx
// 新增导入
import { useSettings } from '../contexts/SettingsContext';
import { formatDateTime } from '../lib/timezoneUtils';

// 在组件内使用
const { timezone } = useSettings();

// 格式化时间显示
<Text style={styles.timeText}>
  {formatDateTime(time, timezone.offset, 'datetime')}
</Text>
```

### 3. `app/trader/detail.tsx` (交易员详情页)

**修改内容:**
- 导入 `useSettings` hook 和 `formatDateTime` 函数
- 在组件中获取用户的时区设置
- 重构 `formatTime` 函数使用时区工具
- 修复了类型错误 (为 filter 函数的参数添加类型注解)

**修改代码:**
```tsx
// 新增导入
import { useSettings } from '../../contexts/SettingsContext';
import { formatDateTime } from '../../lib/timezoneUtils';

// 在组件内使用
const { timezone } = useSettings();

// 格式化时间函数
const formatTime = (dateString: string) => {
  return formatDateTime(dateString, timezone.offset, 'full');
};
```

**影响的界面元素:**
- 有效信号(当前信号)中的"委托时间"
- 历史信号中的"委托时间"和"出场时间"

### 4. `app/(tabs)/index.tsx` (信号列表页)

**修改内容:**
- 导入 `formatDateTime` 函数
- 在 `HomePage` 组件中获取时区设置
- 在 `SignalTabContent` 组件中获取时区设置
- 重构 `formatTime` 函数使用时区工具

**修改代码:**
```tsx
// 新增导入
import { formatDateTime } from '../../lib/timezoneUtils';

// 在 HomePage 组件内
const { timezone } = useSettings();

// 在 SignalTabContent 组件内
const { timezone } = useSettings();

// 格式化时间函数
const formatTime = (dateString: string) => {
  return formatDateTime(dateString, timezone.offset, 'full');
};
```

**影响的界面元素:**
- 信号列表中每个信号卡片的"委托时间"

## 工作原理

### 数据流程

1. **服务器端**: 所有时间数据都以 UTC+0 时区存储在数据库中
2. **前端接收**: 接收到的时间字符串是 ISO 格式的 UTC+0 时间
3. **时区转换**: 
   - 用户在设置页面选择时区 (如 UTC+8)
   - `formatDateTime` 函数根据时区偏移量转换时间
   - 转换后的时间以用户选择的时区显示

### 时区转换函数

```typescript
export function formatDateTime(
  utcDateString: string,      // UTC+0 时间字符串
  timezoneOffset: number,      // 时区偏移量 (如 8 表示 UTC+8)
  format: 'full' | 'date' | 'time' | 'datetime'
): string {
  // 1. 转换为指定时区的 Date 对象
  const date = convertUTCToTimezone(utcDateString, timezoneOffset);
  
  // 2. 格式化为字符串
  // 'full': YYYY/MM/DD HH:mm:ss
  // 'datetime': YYYY/MM/DD HH:mm
  // 'date': YYYY/MM/DD
  // 'time': HH:mm:ss
}
```

## 显示格式

### 委托时间
- **格式**: `YYYY/MM/DD HH:mm:ss`
- **示例**: `2026/01/12 22:01:00`
- **位置**:
  - 信号列表页 - 每个信号卡片
  - 交易员详情页 - 有效信号标签
  - 交易员详情页 - 历史信号标签

### 出场时间
- **格式**: `YYYY/MM/DD HH:mm:ss`
- **示例**: `2026/01/12 14:37:00`
- **位置**:
  - 交易员详情页 - 历史信号标签

## 用户体验

1. **自动同步**: 当用户在设置页面更改时区时，所有页面的时间显示会自动更新
2. **持久化**: 时区设置会保存到 AsyncStorage，下次打开应用时会恢复
3. **统一性**: 所有时间显示都使用相同的格式和时区，确保一致性

## 测试建议

1. **切换时区测试**:
   - 在设置页面切换不同时区
   - 验证所有页面的时间是否正确转换

2. **跨时区测试**:
   - 测试 UTC+8 (北京/香港)
   - 测试 UTC+0 (伦敦)
   - 测试 UTC-5 (纽约)
   - 验证时间差是否正确

3. **边界情况**:
   - 测试跨天的时间 (如 23:30 在不同时区的显示)
   - 测试跨月、跨年的时间

4. **性能测试**:
   - 在信号列表中加载大量信号时，验证时间格式化不会影响性能

## 相关文档

- [时区设置指南](./TIMEZONE_GUIDE.md)
- [时区使用说明](./TIMEZONE_USAGE.md)
- [时区迁移文档](./TIMEZONE_MIGRATION.md)

## 更新日期

2026-01-12
