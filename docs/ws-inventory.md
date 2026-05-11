# WebSocket Inventory

## 1. Client -> Server

### tab_create

- 功能：创建会话
- 字段：
  - `name`
  - `cwd`
  - `model`
  - `approvalPolicy`
  - `sandboxMode`

### tab_close

- 功能：关闭本地窗口
- 字段：
  - `threadId`

### turn_send

- 功能：向指定 thread 发送 turn
- 字段：
  - `threadId`
  - `text`
  - `attachments[]`
  - `clientMessageId`
  - `model`
  - `effort`
  - `approvalPolicy`
  - `sandboxMode`

### thread_sync

- 功能：请求 thread 全量同步
- 字段：
  - `threadId`

### server_request_respond

- 功能：响应审批或 user input
- 字段：
  - `requestId`
  - `response`

## 2. Server -> Client

### state

- 初始全量状态

### server_request_required

- 新待审批请求

### server_request_updated

- 待审批请求状态更新

### server_request_resolved

- 待审批请求完成

### server_request_reset

- 清空待审批请求

### tab_updated

- 会话更新

### tab_created

- 会话创建结果

### tab_removed

- 会话移除

### unread

- 会话未读标记

### thread_sync

- thread 全量同步结果

### turn_started

- turn 开始

### turn_completed

- turn 完成

### turn_plan_updated

- turn 计划更新

### turn_diff_updated

- turn diff 更新

### hook_started / hook_completed

- hook 生命周期

### guardian_review_started / guardian_review_completed

- guardian review 生命周期

### plan_delta

- plan 流式文本增量

### agent_delta

- agent 输出流式增量

### mcp_tool_progress

- mcp 工具进度

### item_started / item_completed / item_delta

- item 生命周期与流式输出

### codex_error

- Codex 层错误

### backend_error

- 服务端级错误

### error

- 通用错误，包括 AUTH_FAILED

### token_usage

- token usage 更新

### warning

- 通用警告

### error_notice

- 线程或全局错误通知

### notification

- 原始通知透传
