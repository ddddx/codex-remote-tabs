# 后端重构方案

## 1. 目标

将当前单文件 Node 服务重构为基于 Fastify 的分层单体后端。

目标：

- 路由层只处理 transport
- 用例服务层只处理业务编排
- domain 只处理规则
- adapters 只处理外部系统集成
- SQLite 承担主持久化

## 2. 模块结构

```text
apps/server/src/
  bootstrap/
  config/
  transport/
    http/
      routes/
      middleware/
      presenters/
    ws/
      gateway/
      handlers/
      presenters/
  application/
    services/
    commands/
    queries/
  repositories/
  errors/
  index.ts
```

## 3. 核心服务

### 3.1 SessionService

职责：

- 创建会话
- 恢复会话
- 关闭窗口绑定
- 同步会话列表

### 3.2 TurnService

职责：

- 发起 turn
- 管理附件输入
- 维护 pending user message 对应关系
- 处理 turn 生命周期

### 3.3 ApprovalService

职责：

- 接收待审批请求
- 响应审批
- 维护 session 级授权状态
- 处理 `request_user_input`

### 3.4 EventBridgeService

职责：

- 订阅 Codex 事件
- 翻译为内部 domain event
- 广播为前端 WS payload

### 3.5 WorkspaceService

职责：

- 浏览目录
- 读取快捷路径
- 新建目录
- 维护最近工作区

### 3.6 WindowService

职责：

- 打开本地窗口
- 关闭本地窗口
- 恢复 thread 到窗口绑定
- 扫描 resume 窗口

### 3.7 UploadService

职责：

- 处理图片上传
- 处理文件读取
- 建立上传记录

## 4. Repository

### 4.1 SessionRepository

- sessions 表读写

### 4.2 WindowBindingRepository

- thread <-> pid/window 绑定

### 4.3 PreferenceRepository

- 会话偏好
- 全局偏好

### 4.4 PendingRequestRepository

- 审批请求
- user input 请求

### 4.5 UploadRepository

- 上传记录

### 4.6 AppStateRepository

- 最近工作区
- UI 级辅助状态

## 5. HTTP 路由

### 基础路由

- `GET /health`

### workspace

- `GET /api/workspace/shortcuts`
- `GET /api/workspace/list`
- `POST /api/workspace/create-directory`

### uploads

- `POST /api/uploads/image`
- `GET /api/uploads/:fileName`

### codex

- `GET /api/codex/options`

## 6. WebSocket 设计

### 入站消息

- turn send
- tab close
- refresh session
- approval response
- request user input response
- preference update

### 出站消息

- session updates
- timeline events
- token usage
- approval requests
- connection notices
- upload notices

### WS 分层

- `connectionManager`
- `messageParser`
- `messageRouter`
- `sessionBroadcaster`

## 7. Adapter 设计

### 7.1 CodexGateway

封装：

- start thread
- resume thread
- read thread
- start turn
- list models
- read config
- approve / decline request

### 7.2 WindowsGateway

封装：

- open window
- close window
- find resume windows
- pid alive check

### 7.3 SqliteStore

封装：

- migration
- queries
- transactions

### 7.4 UploadStorage

封装：

- save image
- resolve file path
- read image

## 8. 数据库建议

### 表结构

#### sessions

- id
- thread_id
- name
- cwd
- status
- window_status
- created_at
- updated_at

#### window_bindings

- thread_id
- pid
- process_name
- command_line
- attached_at
- updated_at

#### thread_preferences

- thread_id
- model
- reasoning_effort
- approval_policy
- sandbox_mode

#### pending_requests

- id
- thread_id
- kind
- payload_json
- status
- created_at

#### uploads

- id
- saved_name
- original_name
- content_type
- file_path
- created_at

#### app_state

- key
- value_json
- updated_at

## 9. 错误处理

统一错误体系：

- `AuthError`
- `ValidationError`
- `CodexGatewayError`
- `WindowGatewayError`
- `WorkspaceError`
- `UploadError`
- `NotFoundError`
- `ConflictError`

所有错误最终映射到共享协议错误结构。

## 10. 实施顺序

1. config
2. logger
3. sqlite
4. repositories
5. adapters
6. application services
7. http routes
8. ws gateway
9. event bridge
10. real environment verification

## 11. 验收标准

- 不再存在超大入口文件
- route handler 不含业务编排
- adapter 不泄漏 transport 细节
- repository 不直接拼业务规则
- 所有主流程服务可测试
