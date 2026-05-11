# 后端迁移任务单

## 1. 目标

本文件定义新 `apps/server` 的具体施工顺序。

## 2. 目录落地顺序

### Step 1

创建：

- `apps/server/package.json`
- `apps/server/tsconfig.json`
- `apps/server/src/index.ts`
- `apps/server/src/bootstrap/`
- `apps/server/src/config/`

完成标准：

- Fastify 空服务能启动

### Step 2

创建：

- `apps/server/src/transport/http/routes/health.ts`
- `apps/server/src/transport/http/middleware/auth.ts`
- `apps/server/src/transport/http/index.ts`

完成标准：

- `/health` 可访问
- auth middleware 可插拔

### Step 3

创建：

- `apps/server/src/repositories/*`
- `packages/adapters/src/sqlite/*`

完成标准：

- SQLite 初始化成功

### Step 4

创建：

- `packages/adapters/src/codex/*`
- `packages/adapters/src/windows/*`
- `packages/adapters/src/storage/*`

完成标准：

- adapter 可单独测试

### Step 5

创建 application services：

- `SessionService`
- `TurnService`
- `ApprovalService`
- `WorkspaceService`
- `WindowService`
- `UploadService`
- `EventBridgeService`

完成标准：

- service 可在 mocked adapter 上通过测试

## 3. 路由落地顺序

1. `GET /health`
2. `GET /api/workspace/shortcuts`
3. `GET /api/workspace/list`
4. `POST /api/workspace/create-directory`
5. `POST /api/uploads/image`
6. `GET /api/uploads/:fileName`
7. `GET /api/codex/options`

## 4. WS 落地顺序

1. 连接与鉴权
2. 初始 `state`
3. `turn_send`
4. `thread_sync`
5. `server_request_respond`
6. session/tab updates
7. turn lifecycle events
8. supplemental events

## 5. 禁止事项

- route handler 内直接写业务编排
- route handler 内直接操作 SQLite
- ws handler 内直接修改 repository
- adapter 内引用 Fastify request/response

## 6. 每步验收

每完成一组任务必须检查：

- `pnpm typecheck`
- `pnpm test`
- API/WS smoke test
