# 信号跟单与回测系统技术设计文档

## 1. 项目概述

本文档旨在阐述基于 Supabase 构建的加密货币交易信号系统的技术实现方案。系统包含两个核心模块：
1.  **信号回测与收益统计**：基于历史和实时行情，自动计算信号的盈亏情况（ROI）。
2.  **实盘跟单系统**：这是一种低延迟的事件驱动架构，用于在交易员发布信号时实时为订阅用户下单。

## 2. 系统核心架构

系统完全基于 Supabase 生态构建，利用 Serverless 架构实现高可用与低运维成本。

-   **核心数据库**: Supabase PostgreSQL
-   **计算运行时**: Supabase Edge Functions (Deno)
-   **定时调度**: pg_cron
-   **事件驱动**: Database Webhooks
-   **交易所接口**: CCXT (统一封装 Binance, OKX 等 API)

```mermaid
graph TD
    subgraph "输入源"
        Trader[交易员/信号源]
    end

    subgraph "Supabase 核心层"
        DB[(PostgreSQL)]
        Cron[pg_cron 定时任务]
        Webhook[Database Webhooks]
    end

    subgraph "计算层 (Edge Functions)"
        Fn_Backtest[Backtest Worker<br>(回测跑批)]
        Fn_CopyTrade[CopyTrade Executor<br>(跟单执行)]
    end

    subgraph "外部服务"
        Exchange_Mkt[交易所行情 API]
        Exchange_Trade[交易所交易 API]
    end

    %% 流程 1: 信号录入
    Trader -->|写入信号| DB

    %% 流程 2: 实时跟单
    DB -->|INSERT 触发| Webhook
    Webhook -->|POST| Fn_CopyTrade
    Fn_CopyTrade -->|并发下单| Exchange_Trade

    %% 流程 3: 回测统计
    Cron -->|每 5 分钟触发| Fn_Backtest
    Fn_Backtest -->|读取未完结信号| DB
    Fn_Backtest -->|批量获取 K 线| Exchange_Mkt
    Fn_Backtest -->|更新 PnL/状态| DB
```

---

## 3. 模块一：信号回测与收益统计 (Backtesting)

该模块负责监控所有发出的信号，通过比对后续市场行情，判定是否触发止盈（TP）或止损（SL），并更新收益率。

### 3.1 核心机制：增量水位线更新
为了解决长周期信号的数据拉取问题并节省 API 额度，采用 **Watermark（水位线）** 机制。

*   **字段设计**: 在 `signals` 表中增加 `last_checked_at` 字段。
*   **调度频率**: 每 5 分钟 (由         )。

### 3.2 执行逻辑
1.  **获取任务**: 查询状态为 `active` 或 `closed` 但未计算 ROI 的信号。
2.  **分组优化**: 将信号按 `symbol` (交易对) 分组。
3.  **确定时间起点 (Since)**:
    *   以组内最早的 `last_checked_at` 为准。
    *   如果是首次运行，取 `signal_time` (信号发布时间)。
4.  **API 请求 (CCXT)**:
    *   **接口**: 使用 `exchange.fetchOHLCV(symbol, timeframe, since, limit)`。
    *   **参数**:
        *   `symbol`: 交易对 (e.g. 'BTC/USDT')。
        *   `timeframe`: 时间粒度，统一使用 `'1m'` (1分钟)。
        *   `since`: 上一步确定的时间起点 (时间戳毫秒)。
        *   `limit`: 建议设为 1000 (通常是交易所上限)，若缺口较大需编写循环分页拉取逻辑。
    *   每个交易对仅请求一次接口，获取到的数据在内存中供该组所有信号复用。
5.  **内存计算**:
    *   遍历 K 线数据。
    *   **处理 K 线内的高低价歧义 (High-Low Ambiguity)**: 当一根 K 线的最高价和最低价同时也触及止盈和止损时，**遵循保守风控原则，优先判定为止损**。
    *   **做多 (Long)**:
        *   **止损优先**: 若 `Low <= StopLoss`，直接判定为止损离场 (PnL < 0)，忽略该 K 线是否同时触及止盈。
        *   **止盈**: 若未触及止损 且 `High >= TakeProfit`，判定为止盈离场 (PnL > 0)。
        *   **PnL**: `(Exit - Entry) * Qty`
    *   **做空 (Short)**:
        *   **止损优先**: 若 `High >= StopLoss`，直接判定为止损离场 (PnL < 0)，忽略该 K 线是否同时触及止盈。
        *   **止盈**: 若未触及止损 且 `Low <= TakeProfit`，判定为止盈离场 (PnL > 0)。
        *   **PnL**: `(Entry - Exit) * Qty`
    *   如果触发，状态更新为 `closed`，记录 `exit_price` 和 `exit_reason`。
    *   未触发则更新 `last_checked_at` 为当前时间。
6.  **批量回写**: 使用 `upsert` 将最新状态写回数据库。

### 3.3 异常处理
*   **数据断层**: 若 Cron 任务中断，下次启动时 `Since` 时间点会自动前移，补齐缺失的 K 线数据。
*   **已完结信号**: 信号一经触发止盈/止损，即锁定状态，不再重复计算。

---

## 4. 模块二：实盘跟单系统 (Copy Trading)

该模块要求低延迟，目标是在信号发出的秒级内完成用户订单的发送。

### 4.1 触发机制
采用 **Database Webhook** 监听 `signals` 表的 `INSERT` 事件。相比轮询，这是真正的实时推送。

### 4.2 执行流程 (Edge Function)
1.  **接收 Payload**: Webhook 将新信号数据 `record` 发送给 Edge Function。
2.  **查找订阅者**:
    *   查询 `trader_followers` 表，找到订阅了该交易员且 `auto_copy` 为 true 的用户。
    *   联查用户的 `exchange_accounts` 获取 API Key 信息。
3.  **解密密钥**: 从数据库读取包括加密的 API Key/Secret，在内存中临时解密。
4.  **构建订单**:
    *   计算下单数量（基于用户设置的“单笔跟单金额”或“比例”）。
    *   **策略推荐**: 建议使用 **OCO (One-Cancels-the-Other)** 订单或带止盈止损的限价单。这样下单后，止盈止损由交易所托管，无需系统后续干预平仓。
5.  **并发执行**:
    *   使用 `Promise.all` 并发向交易所发送请求。
    *   当前规模（500信号/天，100用户/信号）下，Edge Function 直接并发处理即可。
6.  **日志记录**:
    *   无论成功失败，必须写入 `copy_trade_logs` 表，记录 `order_id`、成交价格、错误原因等。

### 4.3 风险控制
*   **滑点保护**: 避免使用纯市价单，建议使用 `MARKET` 类型的 IOC 模式或激进限价单。
*   **余额检查**: 下单前预检查用户 USDT 余额。
*   **错误隔离**: 单个用户的下单失败不应影响其他用户。

---

## 5. 数据库设计 (Schema 变更建议)

### 5.1 Signals 表增强
```sql
ALTER TABLE signals ADD COLUMN last_checked_at TIMESTAMPTZ; -- 上次行情检查时间
ALTER TABLE signals ADD COLUMN exit_price NUMERIC;          -- 离场价格
ALTER TABLE signals ADD COLUMN exit_reason TEXT;            -- 离场原因 (tp, sl, manual)
ALTER TABLE signals ADD COLUMN pnl NUMERIC;                 -- 绝对收益额
ALTER TABLE signals ADD COLUMN roi NUMERIC;                 -- 收益率百分比
```

### 5.2 订阅关系表 `trader_followers`
```sql
CREATE TABLE trader_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    trader_id UUID REFERENCES traders(id),
    is_auto_copy BOOLEAN DEFAULT false,    -- 是否开启自动跟单
    fixed_amount NUMERIC DEFAULT 100,      -- 每单跟单金额 (USDT)
    max_slippage NUMERIC DEFAULT 0.01      -- 允许最大滑点
);
```

### 5.3 跟单日志表 `copy_trade_logs`
```sql
CREATE TABLE copy_trade_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID REFERENCES signals(id),
    user_id UUID REFERENCES auth.users(id),
    exchange_order_id TEXT,
    status TEXT, -- 'success', 'failed', 'filled'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. 扩展性规划

如果未来系统规模扩大到 **每秒触发数千笔订单**，可以平滑升级架构：

1.  **引入 MQ**: 启用 Supabase 自带的 `pgmq` 扩展。
2.  **异步化**: Webhook 接收到信号后，不直接下单，而是将任务拆分为多个消息推送到 `pgmq`（例如按每 50 个用户一组）。
3.  **多 Worker 消费**: 部署多个 Edge Function 实例作为消费者，并行处理队列中的下单任务，突破单实例的并发和超时限制。

### 6.1 日志系统设计 (Module 1 & 2)
系统应引入结构化日志（推荐 `winston` 或类似于 Logstash 的 JSON 格式），重点记录：
1. **Module 1 (Backtest)**:
   - 记录每次 Cron 触发的 `Watermark` 时间点。
   - 记录 API 请求耗时（用于监控交易所延迟）。
   - 记录异常终止的堆栈信息。
2. **Module 2 (CopyTrading)**:
   - 记录 Webhook 接收延迟（Payload 时间 vs 处理时间）。
   - 记录每一笔跟单的 `Order ID` 及交易所原始响应。

---

## 7. 部署清单

- [ ] **Database**:
    - [ ] 启用 `pg_cron` 扩展。
    - [ ] 因为跟单需要网络请求，需确认数据库 Webhook 权限配置。
    - [ ] 索引：`signals(status, trader_id)`, `trader_followers(trader_id, is_auto_copy)`。
- [ ] **Edge Functions**:
    - [ ] `backtest-signals`: 负责跑批回测 (原名 worker)。
    - [ ] `copy-trade-executor`: 负责接收 Webhook 并下单。
- [ ] **Security**:
    - [ ] 配置 Supabase Vault 或使用 AES 密钥管理用户 API Secret。
- [ ] **Cron Job**:
    - [ ] SQL 脚本注册 `backtest-worker` 的 5 分钟定时任务。
