# 协议与数据计划

## 1. 目标

为前后端建立统一协议与统一数据模型，避免重构过程中字段漂移和状态不一致。

## 2. 协议范围

### 2.1 HTTP

- health
- workspace shortcuts
- workspace list
- workspace create directory
- uploads image
- upload file access
- codex options

### 2.2 WebSocket 入站

- `turn_send`
- `tab_close`
- `tab_refresh`
- `approval_response`
- `request_user_input_response`
- `session_pref_update`

### 2.3 WebSocket 出站

- thread/session snapshot
- message delta
- tool output
- plan update
- diff update
- token usage
- approval request
- request user input
- auth failure
- connection error

## 3. Schema 规则

### 3.1 协议规则

- 所有跨边界对象必须有 TypeScript 类型
- 所有外部输入必须有 `Zod schema`
- 所有出站对象必须有明确 DTO
- 字段命名统一为 `camelCase`
- 如需兼容旧字段，兼容逻辑只留在 schema decode 层

### 3.2 错误规则

统一结构：

```ts
type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
```

## 4. 数据模型迁移

### 4.1 现状

当前主状态散落在：

- 内存 `Map`
- `.window-map.json`
- `.codex-remote-state.json`
- 上传目录

### 4.2 目标

目标主状态进入 SQLite：

- session 元信息
- window binding
- user preference
- pending request
- upload metadata
- app state

## 5. 迁移策略

### 5.1 一次导入

首次启动新后端时：

- 检查 SQLite 是否为空
- 如为空，读取 legacy JSON
- 执行导入
- 保留原文件备份

### 5.2 并行验证

迁移期：

- SQLite 为主读写
- 遇到缺失数据允许读取 legacy 文件

### 5.3 收口

确认稳定后：

- 去除 legacy fallback
- JSON 不再参与主逻辑

## 6. 协议开发顺序

1. 建 inventory
2. 写 TS type
3. 写 Zod schema
4. 写 tests
5. 接入 server
6. 接入 web

## 7. 验收标准

- 所有边界协议在 shared package 中定义
- 无手写重复 DTO
- 所有关键 schema 有测试
- 数据迁移流程可重复执行
