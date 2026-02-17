# Realtime（traders/signals）排查笔记

## 现象

- 客户端日志显示 channel 已 `SUBSCRIBED`
- 但对 `public.traders` / `public.signals` 做 `UPDATE`（自检A/B）时，客户端没有收到任何 `postgres_changes` 回调

## 已确认的事实（来自数据库查询）

- 两表都在 publication 中：`public.signals`、`public.traders`（说明「是否加入 realtime 发布」不是问题）
- 两表 `replica identity` 当前为 `d`（DEFAULT）
- 两表都开启了 RLS（`rowsecurity=true`）

## 高概率原因

1) **Realtime 事件被 RLS 过滤**

Realtime 在推送行级事件时，需要根据订阅者 JWT（anon/auth）评估 RLS（以及可能的 REPLICA IDENTITY 配置）来决定是否可见。
如果 `SELECT` policy 不满足，订阅者将“订阅成功但永远收不到任何行”。

2) **表的 REPLICA IDENTITY/主键配置导致 UPDATE/DELETE 无法正确输出 old/new**

虽然 INSERT 也应能看到，但在一些表结构/策略组合下，DEFAULT replica identity 会导致事件内容不足或无法被 realtime 输出。

## 推荐修复顺序

### A. 先验证是否是 RLS 过滤

在 Supabase SQL editor 里检查两表是否存在可公开 SELECT 的 policy（anon/auth）。
如果没有，给 `traders`/`signals` 增加最小只读 policy（仅用于展示，不暴露敏感字段）。

> 注意：生产环境要谨慎，只给必要字段/必要行开放。

### B. 将两表设置为 REPLICA IDENTITY FULL（提高 UPDATE/DELETE 的可用性）

```sql
alter table public.traders replica identity full;
alter table public.signals replica identity full;
```

## 回滚

```sql
alter table public.traders replica identity default;
alter table public.signals replica identity default;
```
