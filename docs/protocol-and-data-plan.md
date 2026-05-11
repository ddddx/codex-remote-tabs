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
- `thread_sync`
- `server_request_respond`

### 2.3 WebSocket 出站

- `state`
- `tab_created`
- `tab_updated`
- `thread_sync`
- `turn_started`
- `turn_completed`
- `turn_plan_updated`
- `turn_diff_updated`
- `plan_delta`
- `agent_delta`
- `item_started`
- `item_completed`
- `item_delta`
- `mcp_tool_progress`
- `token_usage`
- `server_request_required`
- `server_request_updated`
- `server_request_resolved`
- `server_request_reset`
- `warning`
- `error`
- `backend_error`
- `codex_error`
- `notification`

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

旧状态曾散落在：

- 内存 `Map`
- `.window-map.json`
- `.codex-remote-state.json`
- 上传目录

### 4.2 目标

当前主状态进入 SQLite：

- session 元信息
- user preference
- pending request
- upload metadata
- app state

## 5. 迁移策略

### 5.1 一次导入

显式执行迁移脚本时：

- 读取 legacy JSON
- 执行导入
- 保留原文件备份

### 5.2 并行验证

迁移完成前：

- SQLite 为主读写
- legacy 文件仅作为导入来源

### 5.3 收口

确认稳定后：

- 迁移脚本保留
- JSON 不再参与运行时主逻辑

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
