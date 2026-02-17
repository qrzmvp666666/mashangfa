# 时区转换使用示例

本文档说明如何在应用中使用时区转换功能。所有接口返回的时间字段都是 UTC+0 时区，需要根据用户选择的时区进行转换。

## 1. 获取用户设置

```tsx
import { useSettings } from '../contexts/SettingsContext';

function MyComponent() {
  const { timezone, language } = useSettings();
  
  // timezone.offset 是相对于UTC的小时偏移量
  // language 是 'zh' 或 'en'
}
```

## 2. 基础时间转换

### 转换UTC时间为用户时区

```tsx
import { formatDateTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function SignalCard({ signal }) {
  const { timezone } = useSettings();
  
  // 接口返回的时间：signal.created_at (UTC+0)
  const displayTime = formatDateTime(
    signal.created_at,
    timezone.offset,
    'datetime' // 'full' | 'date' | 'time' | 'datetime'
  );
  
  return <Text>{displayTime}</Text>; // 输出: 2026-01-03 16:30
}
```

### 格式选项

- `'full'`: 2026-01-03 16:30:45
- `'date'`: 2026-01-03
- `'time'`: 16:30
- `'datetime'`: 2026-01-03 16:30

## 3. 相对时间显示

适用于显示"刚刚"、"5分钟前"等相对时间：

```tsx
import { formatRelativeTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function CommentItem({ comment }) {
  const { timezone, language } = useSettings();
  
  const relativeTime = formatRelativeTime(
    comment.created_at,
    timezone.offset,
    language
  );
  
  return <Text>{relativeTime}</Text>; 
  // 中文输出: 刚刚 / 5分钟前 / 2小时前 / 3天前
  // 英文输出: just now / 5 minutes ago / 2 hours ago / 3 days ago
}
```

## 4. 获取当前时区的当前时间

```tsx
import { getCurrentTimezoneDate } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function Clock() {
  const { timezone } = useSettings();
  const currentTime = getCurrentTimezoneDate(timezone.offset);
  
  return <Text>{currentTime.toLocaleString()}</Text>;
}
```

## 5. 发送时间给服务器

当需要发送时间给服务器时，需要转换为UTC+0：

```tsx
import { convertTimezoneToUTC } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function CreateOrder() {
  const { timezone } = useSettings();
  
  const handleSubmit = async () => {
    const localDate = new Date(); // 用户本地时间
    const utcTimeString = convertTimezoneToUTC(localDate, timezone.offset);
    
    // 发送给服务器
    await api.createOrder({
      scheduled_time: utcTimeString // ISO格式的UTC+0时间
    });
  };
}
```

## 6. 完整示例：信号列表

```tsx
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { formatDateTime, formatRelativeTime } from '../lib/timezoneUtils';

interface Signal {
  id: string;
  title: string;
  created_at: string; // UTC+0
  updated_at: string; // UTC+0
}

function SignalList({ signals }: { signals: Signal[] }) {
  const { timezone, language } = useSettings();
  
  return (
    <FlatList
      data={signals}
      renderItem={({ item }) => (
        <View>
          <Text>{item.title}</Text>
          
          {/* 显示完整时间 */}
          <Text>
            创建时间: {formatDateTime(item.created_at, timezone.offset, 'full')}
          </Text>
          
          {/* 显示相对时间 */}
          <Text>
            {formatRelativeTime(item.updated_at, timezone.offset, language)}
          </Text>
        </View>
      )}
      keyExtractor={(item) => item.id}
    />
  );
}

export default SignalList;
```

## 7. 在交易员列表中使用

```tsx
import { formatRelativeTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function TraderCard({ trader }) {
  const { timezone, language } = useSettings();
  
  // 最后活跃时间
  const lastActiveTime = formatRelativeTime(
    trader.last_active_at,
    timezone.offset,
    language
  );
  
  return (
    <View>
      <Text>{trader.name}</Text>
      <Text>最后活跃: {lastActiveTime}</Text>
    </View>
  );
}
```

## 8. 注意事项

1. **所有接口时间都是UTC+0**：确保所有从API获取的时间字段都经过时区转换后再显示
2. **发送时间到服务器**：使用 `convertTimezoneToUTC` 将本地时间转换为UTC+0
3. **用户体验**：时区变更会立即生效，无需刷新页面
4. **性能**：时区转换函数是轻量级的，可以在render中直接调用
5. **默认时区**：如果用户未设置，默认使用 UTC+8（北京时间）

## 9. 可用的时区列表

用户可以选择的时区在 `contexts/SettingsContext.tsx` 中的 `TIMEZONES` 数组定义：

- UTC+0 (伦敦)
- UTC+1 (柏林)
- UTC+2 (开罗)
- UTC+3 (莫斯科)
- UTC+4 (迪拜)
- UTC+5 (伊斯兰堡)
- UTC+5.5 (新德里)
- UTC+6 (达卡)
- UTC+7 (曼谷)
- UTC+8 (北京/香港)
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
