# 时区处理指南

## 📌 概述

本系统采用**数据库存储 UTC 时间 + 查询时转换时区**的方案，既保证了数据的国际化兼容性，又能够灵活支持不同时区的用户。

## 🎯 核心原则

1. **数据库存储**：所有时间字段统一使用 UTC 时间存储
2. **查询转换**：在查询时根据用户时区设置进行转换
3. **前端显示**：使用 `timezoneUtils.ts` 工具格式化显示

## 📊 已实现时区支持的功能

### ✅ 平台统计 (`get_platform_stats`)
- 今日信号数
- 做多/做空信号数
- 活跃博主数
- 交易币种数

**使用方法**：
```typescript
import { useSettings } from '../../contexts/SettingsContext';

const { timezone } = useSettings();
const stats = await getPlatformStats(timezone.offset);
```

### ✅ 用户统计 (`get_user_stats`)
- 关注数（已过滤 `is_visible = false`）
- 订阅数（已过滤 `is_visible = false`）

## 🔧 如何为其他查询添加时区支持

### 方法1：修改现有 RPC 函数

对于涉及"今日"统计的 RPC 函数，添加时区参数：

```sql
CREATE OR REPLACE FUNCTION your_function_name(p_timezone_offset INT DEFAULT 8)
RETURNS ... AS $$
DECLARE
  today_start TIMESTAMP;
  today_end TIMESTAMP;
BEGIN
  -- 计算指定时区的今天开始和结束时间
  today_start := date_trunc('day', NOW() + (p_timezone_offset || ' hours')::INTERVAL);
  today_end := today_start + INTERVAL '1 day';
  
  -- 在查询条件中使用转换后的时间
  WHERE (created_at + (p_timezone_offset || ' hours')::INTERVAL) >= today_start
    AND (created_at + (p_timezone_offset || ' hours')::INTERVAL) < today_end
END;
$$ LANGUAGE plpgsql;
```

### 方法2：前端显示时转换

对于不涉及"今日"过滤的查询，在前端显示时使用工具函数：

```typescript
import { formatDateTime, formatRelativeTime } from '../lib/timezoneUtils';
import { useSettings } from '../contexts/SettingsContext';

const { timezone } = useSettings();

// 格式化显示
const formattedTime = formatDateTime(signal.created_at, timezone.offset, 'datetime');

// 相对时间（如"2小时前"）
const relativeTime = formatRelativeTime(signal.created_at, timezone.offset, 'zh');
```

## 📝 需要添加时区支持的功能清单

### 🔴 高优先级（涉及"今日"统计）
- [ ] 信号列表查询（`get_signals_with_traders`）
- [ ] 交易员详情页的今日信号统计
- [ ] 信号趋势图（按日期分组）

### 🟡 中优先级（涉及时间范围筛选）
- [ ] 收益趋势数据（`get_top_traders_trend_data`）
- [ ] 信号历史记录的日期筛选
- [ ] 购买记录的日期筛选

### 🟢 低优先级（仅显示转换）
- [ ] 信号卡片的时间显示（已在前端转换）
- [ ] 评论时间显示
- [ ] 用户注册时间显示

## 🔍 检查时区问题的方法

### 1. 数据库查询检查
```sql
-- 查看数据库时区设置
SHOW timezone;

-- 查看当前 UTC 时间
SELECT NOW() AT TIME ZONE 'UTC';

-- 查看 UTC+8 时间
SELECT NOW() AT TIME ZONE 'UTC' + INTERVAL '8 hours';

-- 检查今日信号（UTC+8）
SELECT COUNT(*) 
FROM signals s
INNER JOIN traders t ON s.trader_id = t.id
WHERE t.is_visible = true
  AND (s.created_at + INTERVAL '8 hours') >= date_trunc('day', NOW() + INTERVAL '8 hours')
  AND (s.created_at + INTERVAL '8 hours') < date_trunc('day', NOW() + INTERVAL '8 hours') + INTERVAL '1 day';
```

### 2. 前端日志检查
```typescript
console.log('用户时区:', timezone.label, '偏移量:', timezone.offset);
console.log('UTC 时间:', signal.created_at);
console.log('本地时间:', formatDateTime(signal.created_at, timezone.offset));
```

## 💡 最佳实践

1. **统一默认时区**：所有新增的 RPC 函数都使用 `DEFAULT 8`（UTC+8）
2. **参数命名规范**：统一使用 `p_timezone_offset INT`
3. **注释说明**：在函数注释中明确说明时区处理方式
4. **测试覆盖**：确保在不同时区下数据统计正确

## 🚀 性能优化建议

1. **使用索引**：确保 `created_at` 字段有索引
```sql
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);
```

2. **避免重复转换**：在一个查询中，时区转换表达式应尽量复用
```sql
-- 好的做法：定义变量
today_start := date_trunc('day', NOW() + (p_timezone_offset || ' hours')::INTERVAL);

-- 不好的做法：每次都计算
WHERE (created_at + INTERVAL '8 hours') >= date_trunc('day', NOW() + INTERVAL '8 hours')
```

3. **考虑物化视图**：对于频繁查询的统计数据，可以考虑使用物化视图

## 📚 相关文档

- [时区工具函数文档](./TIMEZONE_USAGE.md)
- [设置页面时区配置](./SETTINGS_PAGE_GUIDE.md)
- [语言和时区设置](./LANGUAGE_TIMEZONE_SETTINGS.md)
