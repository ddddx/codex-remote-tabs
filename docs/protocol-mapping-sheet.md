# 协议映射表

> 状态：历史映射参考。旧位置列用于追踪重构来源，不代表当前仓库仍保留这些文件。

## 1. 使用方式

本表用于将旧协议逐条映射到新 `packages/protocol`。

执行规则：

- 每一行都必须落到具体 schema 文件
- 每一行都必须明确是否兼容旧字段
- 每一行都必须补测试状态

## 2. HTTP Routes

| 旧位置 | Method | Path | 鉴权 | 新文件 | 备注 |
|---|---|---|---|---|---|
| `src/server.js:56` | `GET` | `/health` | 否 | `packages/protocol/src/http/health.ts` | 健康检查 |
| `src/server.js:107` | `GET` | `/api/workspace/shortcuts` | 是 | `packages/protocol/src/http/workspace.ts` | 快捷路径 |
| `src/server.js:115` | `GET` | `/api/workspace/list` | 是 | `packages/protocol/src/http/workspace.ts` | 目录浏览 |
| `src/server.js:128` | `POST` | `/api/workspace/create-directory` | 是 | `packages/protocol/src/http/workspace.ts` | 新建目录 |
| `src/server.js:145` | `POST` | `/api/uploads/image` | 是 | `packages/protocol/src/http/uploads.ts` | 图片上传 |
| `src/server.js:176` | `GET` | `/api/uploads/:fileName` | 是 | `packages/protocol/src/http/uploads.ts` | 图片读取 |
| `src/server.js:194` | `GET` | `/api/codex/options` | 是 | `packages/protocol/src/http/codex.ts` | 模型与默认配置 |

## 3. WS Client -> Server

| 消息 type | 旧位置 | 新文件 | 优先级 | 备注 |
|---|---|---|---|---|
| `tab_create` | `src/server.js:855` | `packages/protocol/src/ws/client.ts` | 高 | 新建会话 |
| `tab_close` | `src/server.js:864` | `packages/protocol/src/ws/client.ts` | 高 | 关闭会话标签 |
| `turn_send` | `src/server.js:869` | `packages/protocol/src/ws/client.ts` | 高 | 发消息 |
| `thread_sync` | `src/server.js:881` | `packages/protocol/src/ws/client.ts` | 高 | 拉线程同步 |
| `server_request_respond` | `src/server.js:886` | `packages/protocol/src/ws/client.ts` | 高 | 审批响应 |

## 4. WS Server -> Client

| 消息 type | 旧位置 | 新文件 | 优先级 | 备注 |
|---|---|---|---|---|
| `state` | `src/server.js:1895` | `packages/protocol/src/ws/server.ts` | 高 | 初始状态 |
| `tab_created` | `src/server.js:1930` | `packages/protocol/src/ws/server.ts` | 高 | 新建会话结果 |
| `tab_updated` | `src/server.js:810` | `packages/protocol/src/ws/server.ts` | 高 | 会话更新 |
| `tab_removed` | `src/server.js:518` | `packages/protocol/src/ws/server.ts` | 中 | 会话移除 |
| `thread_sync` | `src/server.js:812` | `packages/protocol/src/ws/server.ts` | 高 | 线程全量同步 |
| `turn_started` | `src/server.js:1207` | `packages/protocol/src/ws/server.ts` | 高 | turn 开始 |
| `turn_completed` | `src/server.js:1216` | `packages/protocol/src/ws/server.ts` | 高 | turn 完成 |
| `turn_plan_updated` | `src/server.js:1302` | `packages/protocol/src/ws/server.ts` | 中 | plan 更新 |
| `turn_diff_updated` | `src/server.js:1288` | `packages/protocol/src/ws/server.ts` | 中 | diff 更新 |
| `plan_delta` | `src/server.js:1465` | `packages/protocol/src/ws/server.ts` | 中 | plan 流式增量 |
| `agent_delta` | `src/server.js:1432` | `packages/protocol/src/ws/server.ts` | 中 | agent 流式增量 |
| `item_started` | `src/server.js:1413` | `packages/protocol/src/ws/server.ts` | 中 | item 开始 |
| `item_completed` | `src/server.js:1423` | `packages/protocol/src/ws/server.ts` | 中 | item 完成 |
| `item_delta` | `src/server.js:1491` | `packages/protocol/src/ws/server.ts` | 中 | item 输出增量 |
| `hook_started` | `src/server.js:1332` | `packages/protocol/src/ws/server.ts` | 低 | hook 开始 |
| `hook_completed` | `src/server.js:1361` | `packages/protocol/src/ws/server.ts` | 低 | hook 完成 |
| `guardian_review_started` | `src/server.js:1375` | `packages/protocol/src/ws/server.ts` | 低 | guardian 开始 |
| `guardian_review_completed` | `src/server.js:1393` | `packages/protocol/src/ws/server.ts` | 低 | guardian 完成 |
| `mcp_tool_progress` | `src/server.js:1445` | `packages/protocol/src/ws/server.ts` | 低 | mcp 进度 |
| `token_usage` | `src/server.js:1256` | `packages/protocol/src/ws/server.ts` | 高 | token usage |
| `server_request_required` | `src/server.js:1855` | `packages/protocol/src/ws/server.ts` | 高 | 审批请求 |
| `server_request_updated` | `src/server.js:1484` | `packages/protocol/src/ws/server.ts` | 高 | 审批请求更新 |
| `server_request_resolved` | `src/server.js:1505` | `packages/protocol/src/ws/server.ts` | 高 | 审批完成 |
| `server_request_reset` | `src/server.js:1876` | `packages/protocol/src/ws/server.ts` | 中 | 审批清空 |
| `unread` | `src/server.js:636` | `packages/protocol/src/ws/server.ts` | 低 | 未读标记 |
| `warning` | `src/server.js:1584` | `packages/protocol/src/ws/server.ts` | 中 | 警告 |
| `error` | `src/server.js:1885` | `packages/protocol/src/ws/server.ts` | 高 | 通用错误 |
| `backend_error` | `src/server.js:1877` | `packages/protocol/src/ws/server.ts` | 高 | 后端异常 |
| `codex_error` | `src/server.js:1539` | `packages/protocol/src/ws/server.ts` | 高 | codex 错误 |
| `notification` | `src/server.js:1665` | `packages/protocol/src/ws/server.ts` | 低 | 原始通知透传 |

## 5. 开发状态列

执行时给每一项补 3 列：

- `schema done`
- `type done`
- `tests done`

没有完成三项的协议，不允许宣称迁移完成。
