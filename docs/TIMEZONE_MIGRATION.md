# 更新现有组件以支持时区转换

本文档说明如何更新现有组件以支持时区转换功能。

## SignalCard 组件更新示例

### 当前实现
```tsx
// components/SignalCard.tsx
interface SignalCardProps {
  // ... 其他属性
  time: string; // 当前是已格式化的字符串
}

// 使用
<Text style={styles.timeText}>{time}</Text>
```

### 推荐更新方案

#### 方案1: 在父组件中转换（推荐）

在传递给 SignalCard 之前就转换时区：

```tsx
// 在使用 SignalCard 的地方（如信号列表页面）
import { formatRelativeTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function SignalList() {
  const { timezone, language } = useSettings();
  const { data: signals } = useSignals();
  
  return signals.map(signal => (
    <SignalCard
      key={signal.id}
      traderId={signal.trader_id}
      name={signal.trader_name}
      // ... 其他属性
      // 传入转换后的时间
      time={formatRelativeTime(signal.created_at, timezone.offset, language)}
    />
  ));
}
```

#### 方案2: 在 SignalCard 内部转换

修改 SignalCard 接收原始时间戳：

```tsx
// components/SignalCard.tsx
import { formatRelativeTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

interface SignalCardProps {
  // ... 其他属性
  createdAt: string; // 改为接收原始UTC时间
  // 或者同时支持两种方式
  time?: string; // 已格式化的时间（向后兼容）
  createdAt?: string; // UTC时间戳
}

const SignalCard: React.FC<SignalCardProps> = ({
  traderId,
  name,
  avatar,
  // ...
  time,
  createdAt,
  // ...
}) => {
  const { timezone, language } = useSettings();
  
  // 优先使用createdAt，否则使用time
  const displayTime = createdAt 
    ? formatRelativeTime(createdAt, timezone.offset, language)
    : time;
  
  return (
    // ...
    <Text style={styles.timeText}>{displayTime}</Text>
    // ...
  );
};
```

## TraderCard 组件更新示例

```tsx
// components/TraderCard.tsx
import { formatRelativeTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

interface TraderCardProps {
  // ...
  lastActiveAt: string; // UTC时间
}

const TraderCard: React.FC<TraderCardProps> = ({
  name,
  avatar,
  lastActiveAt,
  // ...
}) => {
  const { timezone, language } = useSettings();
  const lastActiveText = formatRelativeTime(lastActiveAt, timezone.offset, language);
  
  return (
    <View>
      <Text>{name}</Text>
      <Text>最后活跃: {lastActiveText}</Text>
    </View>
  );
};
```

## 信号列表页面更新示例

```tsx
// app/(tabs)/index.tsx 或信号列表相关页面
import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { formatRelativeTime, formatDateTime } from '../lib/timezoneUtils';
import SignalCard from '../components/SignalCard';

interface Signal {
  id: string;
  trader_id: string;
  trader_name: string;
  trader_avatar: string;
  description: string;
  currency: string;
  entry_price: string;
  direction: 'long' | 'short';
  stop_loss: string;
  take_profit: string;
  created_at: string; // UTC+0 时间
  signal_count: number;
}

function SignalListPage() {
  const { timezone, language } = useSettings();
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    // 从API获取数据
    fetchSignals().then(data => setSignals(data));
  }, []);

  return (
    <FlatList
      data={signals}
      renderItem={({ item }) => (
        <SignalCard
          traderId={item.trader_id}
          name={item.trader_name}
          avatar={item.trader_avatar}
          description={item.description}
          currency={item.currency}
          entry={item.entry_price}
          direction={item.direction}
          stopLoss={item.stop_loss}
          takeProfit={item.take_profit}
          // 方式1: 传入相对时间
          time={formatRelativeTime(item.created_at, timezone.offset, language)}
          // 或者方式2: 传入完整时间
          // time={formatDateTime(item.created_at, timezone.offset, 'datetime')}
          signalCount={item.signal_count}
        />
      )}
      keyExtractor={(item) => item.id}
    />
  );
}
```

## 订单历史/交易记录页面

```tsx
// app/purchase-history.tsx 或类似页面
import { formatDateTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string; // UTC+0
}

function OrderHistory() {
  const { timezone } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);

  return (
    <FlatList
      data={orders}
      renderItem={({ item }) => (
        <View>
          <Text>订单号: {item.id}</Text>
          <Text>金额: ¥{item.amount}</Text>
          <Text>状态: {item.status}</Text>
          {/* 显示完整日期时间 */}
          <Text>
            时间: {formatDateTime(item.created_at, timezone.offset, 'full')}
          </Text>
        </View>
      )}
    />
  );
}
```

## VIP到期时间显示

```tsx
// app/vip-purchase.tsx 或个人中心
import { formatDateTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function VipInfo() {
  const { timezone } = useSettings();
  const { profile } = useAuth();

  const expiryDate = profile?.vip_expires_at 
    ? formatDateTime(profile.vip_expires_at, timezone.offset, 'datetime')
    : null;

  return (
    <View>
      {expiryDate && (
        <Text>VIP到期时间: {expiryDate}</Text>
      )}
    </View>
  );
}
```

## 实时更新示例

如果需要显示实时更新的相对时间（如"5分钟前"自动更新为"6分钟前"）：

```tsx
import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

function LiveTimeDisplay({ timestamp }: { timestamp: string }) {
  const { timezone, language } = useSettings();
  const [displayTime, setDisplayTime] = useState(
    formatRelativeTime(timestamp, timezone.offset, language)
  );

  useEffect(() => {
    // 每分钟更新一次
    const interval = setInterval(() => {
      setDisplayTime(formatRelativeTime(timestamp, timezone.offset, language));
    }, 60000); // 60秒

    return () => clearInterval(interval);
  }, [timestamp, timezone.offset, language]);

  return <Text>{displayTime}</Text>;
}
```

## 迁移清单

更新现有代码时的检查清单：

- [ ] 找到所有显示时间的地方
- [ ] 确认时间来源是否为API返回的UTC+0时间
- [ ] 导入 `useSettings` hook
- [ ] 导入需要的时区转换函数
- [ ] 更新时间显示逻辑
- [ ] 测试不同时区的显示效果
- [ ] 测试中英文语言切换

## 常见问题

### Q: 如何处理已经格式化的时间字符串？
A: 如果数据已经在服务器端格式化，建议修改API返回原始的ISO时间戳，在客户端进行格式化。

### Q: 时区变化后需要刷新页面吗？
A: 不需要。使用 `useSettings` hook 的组件会自动响应时区变化并重新渲染。

### Q: 性能影响如何？
A: 时区转换函数非常轻量，对性能影响可忽略不计。可以在渲染中直接调用。

### Q: 如何测试时区转换？
A: 在设置页面切换不同时区，检查所有时间显示是否正确更新。
