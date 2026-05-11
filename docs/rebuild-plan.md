# Codex Remote 重构开发计划

> 状态：历史重构计划。最终实现已采用 `Node test runner + Playwright`，并且运行时已移除旧兼容层。

## 1. 目标

本计划用于指导 `codex-remote-tabs` 从当前单仓原生前端 + Node 单体实现，重构为长期可维护的分层单体架构。

本次重构采用以下目标技术方案：

- 前端：`React + TypeScript + Vite`
- 后端：`Fastify + TypeScript + WebSocket`
- 协议层：`Zod + shared protocol package`
- 领域层：独立的 `domain` 包
- 适配层：`Codex / Windows / SQLite / file storage`
- 持久化：`SQLite`
- 测试：`Node test runner + Playwright`

本计划基于以下前提：

- 不考虑重构成本，优先追求长期最优架构。
- 唯一明确排除项：不引入 `allowlist` 功能。
- 项目核心定位不变：Windows 本地编排服务 + 浏览器远程控制面板。
- 前端允许重做信息架构、页面布局与组件划分，只保留核心能力，不要求保持当前 UI 结构。

## 2. 重构目标

### 2.1 架构目标

- 将前后端从当前“大文件协调器”结构重构为职责清晰的分层单体。
- 将协议、业务规则、平台适配、前端表现彻底拆开。
- 建立共享类型与运行时 schema，避免前后端消息格式漂移。
- 建立可测试、可迁移、可持续扩展的工程基础。

### 2.2 工程目标

- 建立 monorepo 结构，分离 `web`、`server`、`protocol`、`domain`、`adapters`。
- 建立统一 lint、typecheck、test、build 流程。
- 建立 SQLite 持久化层，替代 JSON 文件作为主状态存储。
- 建立完整的单元测试、集成测试、端到端测试。

### 2.3 产品目标

- 重构完成后，产品能力覆盖当前已有主流程：
  - 新建会话
  - 恢复会话
  - 关闭窗口
  - 发送消息
  - 展示流式输出
  - 批准请求
  - `request_user_input`
  - 图片上传
  - 工作区浏览与创建目录
  - 断线重连
  - 会话关闭、线程恢复与断线重连
- 前端允许重新设计布局与交互层级，以更适合长期演进的方式组织会话、时间线、审批和设置。

## 3. 目标目录结构

```text
cc-workspace/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── transport/
│   │   │   ├── lib/
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── server/
│       ├── src/
│       │   ├── bootstrap/
│       │   ├── transport/
│       │   │   ├── http/
│       │   │   └── ws/
│       │   ├── application/
│       │   │   └── services/
│       │   ├── repositories/
│       │   ├── errors/
│       │   ├── config/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── protocol/
│   │   ├── src/
│   │   │   ├── http/
│   │   │   ├── ws/
│   │   │   ├── schemas/
│   │   │   ├── errors/
│   │   │   └── index.ts
│   ├── domain/
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   ├── valueObjects/
│   │   │   ├── services/
│   │   │   ├── policies/
│   │   │   └── index.ts
│   └── adapters/
│       ├── src/
│       │   ├── codex/
│       │   ├── windows/
│       │   ├── sqlite/
│       │   ├── storage/
│       │   └── index.ts
├── tests/
│   ├── integration/
│   └── e2e/
├── docs/
│   └── rebuild-plan.md
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

## 4. 核心设计原则

### 4.1 分层单体

后端采用分层单体，不拆微服务。职责分层如下：

- `transport`
  - 接收和返回 HTTP / WebSocket 请求
  - 做输入输出映射
  - 不写业务逻辑
- `application`
  - 组织用例流程
  - 调度 domain 与 adapters
  - 处理事务边界与状态推进
- `domain`
  - 定义线程、会话、审批、窗口绑定等业务规则
  - 不依赖 Fastify / WebSocket / React / PowerShell
- `adapters`
  - 对接 Codex app-server
  - 对接 Windows 进程和窗口
  - 对接 SQLite 与文件系统

### 4.2 协议先行

所有 REST 和 WebSocket 消息格式由 `packages/protocol` 统一定义：

- 类型定义只写一份
- 前后端共享导入
- 边界层使用 `Zod` 校验
- 统一错误码与错误结构

### 4.3 前端组件化

前端采用 React 组件模型，并按 feature 拆分：

- 页面负责布局
- feature 负责交互用例
- store 负责状态
- transport 负责 API / WebSocket
- component 负责可复用 UI
- 允许彻底调整现有页面布局，不要求保留当前顶部栏、侧栏、输入区的相对位置与结构。
- 优先以信息架构和任务流为中心组织 UI，而不是照搬当前 DOM 结构。

### 4.4 平台集成隔离

与平台相关的高耦合逻辑必须隔离：

- `CodexGateway`
- `WindowsGateway`
- `StateStore`
- `UploadStorage`

业务层不得直接拼 PowerShell 或直接操作底层协议。

### 4.5 数据持久化升级

将以下状态从 JSON 文件迁移为 SQLite：

- 窗口映射
- 会话偏好
- 最近工作区
- 待审批请求
- 上传记录
- 本地控制端状态

JSON 文件仅在迁移期作为导入来源，不再作为主状态存储。

## 5. 总体里程碑

项目实施分为 8 个阶段：

1. 基线冻结与行为盘点
2. 工程骨架与 workspace 建设
3. 共享协议层落地
4. 领域层与适配层落地
5. 后端重建
6. 前端重建
7. 数据迁移与测试补齐
8. 切换上线与旧代码清理

## 6. 详细阶段计划

## 阶段 0：基线冻结与行为盘点

### 目标

建立可回归的现状基线，明确哪些行为必须保留。

### 任务

1. 盘点当前功能清单。
2. 梳理所有用户主流程。
3. 列出现有 REST 接口。
4. 列出现有 WebSocket 消息类型。
5. 记录当前配置项、环境变量、默认行为。
6. 记录当前本地状态文件及含义。
7. 将关键流程录制为手工回归脚本。
8. 为关键流程建立“预期结果说明”。

### 输出物

- `docs/current-behavior.md`
- `docs/api-inventory.md`
- `docs/ws-inventory.md`
- `docs/manual-regression-checklist.md`

### 验收标准

- 团队对“必须保留的行为”达成一致。
- 已有功能边界清楚可追溯。

## 阶段 1：工程骨架与 workspace 建设

### 目标

建立 monorepo 和新工程基础设施。

### 任务

1. 引入 `pnpm workspace`。
2. 新建 `apps/web`。
3. 新建 `apps/server`。
4. 新建 `packages/protocol`。
5. 新建 `packages/domain`。
6. 新建 `packages/adapters`。
7. 新建根级 `tsconfig.base.json`。
8. 配置根级 `eslint`。
9. 配置根级 `prettier`。
10. 配置根级脚本：
   - `dev:web`
   - `dev:server`
   - `build`
   - `lint`
   - `typecheck`
   - `test`
11. 为 `apps/web` 配置 Vite。
12. 为 `apps/server` 配置 Fastify + TS 启动方式。
13. 配置共享路径别名。

### 输出物

- `pnpm-workspace.yaml`
- 新 monorepo 初始目录
- 可执行开发脚本

### 验收标准

- `pnpm install` 成功
- `pnpm lint` 成功
- `pnpm typecheck` 成功
- `pnpm dev:web` 与 `pnpm dev:server` 能启动空骨架

## 阶段 2：共享协议层落地

### 目标

建立前后端统一协议，阻断消息格式漂移。

### 任务

1. 梳理现有 HTTP 请求与响应结构。
2. 梳理现有 WS 入站与出站消息结构。
3. 在 `packages/protocol` 建立协议模块：
   - `http`
   - `ws`
   - `schemas`
   - `errors`
4. 为 HTTP DTO 编写 `Zod schema`。
5. 为 WS 消息编写 `Zod schema`。
6. 定义统一错误码。
7. 定义统一错误响应结构。
8. 建立协议导出入口。
9. 为协议层编写单元测试。

### 重点对象

- Session summary
- Session detail
- Turn input
- Attachment
- Approval request
- User approval response
- Workspace entry
- Upload result
- Auth failure payload
- Connection status payload

### 输出物

- `packages/protocol/src/http/*`
- `packages/protocol/src/ws/*`
- `packages/protocol/src/schemas/*`
- `packages/protocol/src/errors/*`

### 验收标准

- 前后端都能直接依赖共享协议类型。
- 协议层具备独立测试。

## 阶段 3：领域层与适配层落地

### 目标

从现有实现中提取与框架无关的业务模型和平台能力抽象。

### 任务

1. 建模核心领域对象：
   - `Session`
   - `Turn`
   - `ApprovalRequest`
   - `WindowBinding`
   - `WorkspaceSelection`
   - `ComposerPreferences`
2. 提取核心规则：
   - 会话状态流转
   - turn 生命周期
   - 审批状态流转
   - 窗口绑定规则
   - 工作区选择与恢复规则
3. 定义适配器接口：
   - `CodexGateway`
   - `WindowGateway`
   - `StateStore`
   - `UploadStorage`
4. 在 `packages/adapters` 实现：
   - Codex app-server adapter
   - Windows PowerShell / process adapter
   - SQLite adapter
   - file upload adapter
5. 为 domain 和 adapters 编写测试。

### 输出物

- `packages/domain/src/*`
- `packages/adapters/src/*`

### 验收标准

- 领域层不依赖 UI、HTTP、WS。
- 适配器接口明确，可被 mock。

## 阶段 4：后端重建

### 目标

将现有 `src/server.js` 重建为分层 Fastify 服务。

### 任务分组

#### 4.1 Bootstrap

1. 建立 Fastify 启动入口。
2. 建立配置加载模块。
3. 建立 logger。
4. 建立 graceful shutdown。

#### 4.2 HTTP 层

1. `GET /health`
2. `GET /api/workspace/shortcuts`
3. `GET /api/workspace/list`
4. `POST /api/workspace/create-directory`
5. `POST /api/uploads/image`
6. `GET /api/uploads/:fileName`
7. `GET /api/codex/options`

#### 4.3 WebSocket 层

1. 建立 upgrade / socket 接入层。
2. 建立连接鉴权。
3. 建立消息解析与 schema 校验。
4. 建立消息分发器。
5. 建立连接状态广播机制。

#### 4.4 应用服务层

1. `SessionService`
2. `TurnService`
3. `ApprovalService`
4. `WorkspaceService`
5. `UploadService`
6. `WindowService`
7. `EventBridgeService`

#### 4.5 Repository 层

1. `SessionRepository`
2. `WindowBindingRepository`
3. `PreferenceRepository`
4. `PendingRequestRepository`
5. `UploadRepository`
6. `AppStateRepository`

### 输出物

- `apps/server/src/bootstrap/*`
- `apps/server/src/transport/http/*`
- `apps/server/src/transport/ws/*`
- `apps/server/src/application/services/*`
- `apps/server/src/repositories/*`

### 验收标准

- 新后端在无旧前端的前提下可独立工作。
- HTTP 和 WS 核心链路跑通。
- 通过自动化测试验证关键服务。

## 阶段 5：前端重建

### 目标

将现有原生前端重建为 React + Vite + TS 前端。

### 任务分组

#### 5.1 App 壳

1. 建立 `App` 根组件。
2. 重新定义顶层信息架构。
3. 建立布局组件：
   - App shell
   - Session rail / session panel
   - Timeline workspace
   - Inspector / context panel
   - Composer dock
4. 建立主题系统与全局样式入口。

#### 5.2 状态管理

1. 选型并建立 store：
   - 推荐 `Zustand`
2. 定义全局 slices：
   - sessions
   - active thread
   - messages
   - composer
   - approvals
   - uploads
   - auth
   - workspace modal
   - connection state

#### 5.3 Transport

1. 建立 HTTP client。
2. 建立 WebSocket client。
3. 建立连接状态同步层。
4. 建立协议解码层。

#### 5.4 Features

1. `features/sessions`
2. `features/messages`
3. `features/composer`
4. `features/approvals`
5. `features/workspace`
6. `features/uploads`
7. `features/auth`
8. `features/context-usage`
9. `features/inspector`
10. `features/notifications`

#### 5.5 Message UI

建立消息组件体系：

- `UserMessage`
- `AssistantMessage`
- `ToolMessage`
- `ReasoningMessage`
- `ApprovalCard`
- `DiffCard`
- `PlanCard`
- `SystemNotice`
- `UploadPreview`

#### 5.6 Modal UI

1. Text modal
2. Session modal
3. Workspace browser modal
4. Token input modal

### 输出物

- `apps/web/src/*`
- `docs/frontend-architecture-plan.md`

### 验收标准

- 新前端不依赖旧前端代码。
- 关键交互可在新 UI 中完整运行。
- 组件和状态边界清晰。
- 页面布局以任务流和信息优先级为中心，而不是兼容旧版结构。

## 阶段 6：SQLite 迁移

### 目标

将 JSON 主状态迁移为 SQLite。

### 任务

1. 设计数据库 schema。
2. 建立 migration 机制。
3. 建立初始表：
   - `sessions`
   - `window_bindings`
   - `thread_preferences`
   - `pending_requests`
   - `uploads`
   - `app_state`
4. 设计索引。
5. 编写从旧 JSON 文件导入数据的脚本。
6. 建立双读取迁移期：
   - 优先读取 SQLite
   - 缺失则从旧 JSON 导入
7. 验证迁移后恢复行为。

### 输出物

- `packages/adapters/src/sqlite/*`
- `apps/server/src/migrations/*`
- `scripts/migrate-legacy-state.ts`

### 验收标准

- 新系统首次启动可接管旧状态。
- JSON 不再作为主写入目标。

## 阶段 7：测试体系补齐

### 目标

建立重构后的质量保障体系。

### 任务

#### 7.1 单元测试

- protocol schema
- domain policies
- adapters
- repository
- utility functions

#### 7.2 集成测试

- HTTP routes
- WebSocket flow
- CodexGateway mocked flow
- SQLite repository behavior

#### 7.3 端到端测试

覆盖以下流程：

1. 页面启动与鉴权
2. 新建会话
3. 发送消息
4. 展示流式结果
5. 审批交互
6. `request_user_input`
7. 图片上传
8. 断线重连
9. 工作区浏览
10. 会话恢复

### 输出物

- `tests/integration/*`
- `tests/e2e/*`

### 验收标准

- 主流程可自动验证。
- 重构后的后续迭代具备回归保障。

## 阶段 8：切换与清理

### 目标

完成新系统接管并清理旧代码。

### 任务

1. 新后端接入真实 Codex 运行环境。
2. 新前端接入真实后端。
3. 执行完整人工回归。
4. 执行自动化测试全量回归。
5. 建立短期双运行验证窗口。
6. 切换默认启动入口。
7. 清理旧 `public/*.js` 前端。
8. 清理旧 `src/server.js` 大单体实现。
9. 清理废弃脚本和过渡兼容层。
10. 更新 README 与开发文档。

### 输出物

- 新默认启动方式
- 清理后的正式目录结构

### 验收标准

- 生产入口仅依赖新架构。
- 旧代码退出主链路。

## 7. 模块职责说明

## 7.1 packages/protocol

职责：

- 定义所有跨边界 DTO
- 定义所有 schema
- 定义统一错误结构

不负责：

- 业务逻辑
- 状态存储
- 平台调用

## 7.2 packages/domain

职责：

- 领域模型
- 规则约束
- 生命周期状态机

不负责：

- HTTP/WS
- 数据库
- PowerShell
- React 组件

## 7.3 packages/adapters

职责：

- 把外部系统包装成稳定接口

不负责：

- 业务编排
- UI 行为

## 7.4 apps/server

职责：

- 组织 API、WS、用例服务
- 协调 domain 与 adapters

不负责：

- 前端渲染

## 7.5 apps/web

职责：

- 展示状态
- 接收用户输入
- 管理前端交互

不负责：

- 业务主规则定义
- 平台集成细节

## 8. 风险与应对

## 8.1 风险：协议理解错误

问题：

- 现有前后端有一些隐式字段和边角消息，容易在迁移时漏掉。

应对：

- 协议先盘点再编码
- 所有历史消息先建 inventory
- 引入协议层测试

## 8.2 风险：Windows 行为回归

问题：

- PowerShell、PID、窗口恢复是平台耦合最重部分。

应对：

- 先封 adapter
- 保留真实环境测试
- 不在前期轻易改窗口管理语义

## 8.3 风险：数据迁移不完整

问题：

- 从 JSON 到 SQLite 可能导致状态丢失或映射异常。

应对：

- 保留导入脚本
- 保留迁移备份
- 切换期支持 fallback

## 8.4 风险：前端重写期间行为不一致

问题：

- React 重写后容易出现 UI 语义差异。

应对：

- 基线流程 E2E
- 对照旧版页面交互
- 分 feature 逐个验收

## 9. 建议排期

以下为建议排期，按全职投入估算：

- 第 1 周：阶段 0 + 阶段 1
- 第 2 周：阶段 2
- 第 3 周：阶段 3
- 第 4-5 周：阶段 4
- 第 6-7 周：阶段 5
- 第 8 周：阶段 6
- 第 9 周：阶段 7
- 第 10 周：阶段 8

如需并行推进：

- 协议层、领域层、前端骨架可以并行
- SQLite 与后端 service 可并行
- UI 组件和 transport 层可并行

## 10. 完成标准

重构完成时，应满足以下条件：

1. 新系统目录结构全部落地。
2. 前后端均已迁移为 TypeScript。
3. WebSocket 与 REST 协议统一由 shared package 管理。
4. 旧 JSON 状态不再作为主存储。
5. 前端已完成 React 组件化。
6. 后端已完成分层单体化。
7. 主流程 E2E 全绿。
8. 旧代码可以整体移除。

## 11. 下一步建议

建议立即执行以下动作：

1. 先创建 monorepo 骨架。
2. 立刻盘点协议 inventory。
3. 先做 `packages/protocol`，再动后端和前端。
4. 不要继续在旧 `public/app.js` 与 `src/server.js` 上大规模追加复杂功能。

这份文档是总计划，后续应继续拆成：

- `phase-0-checklist.md`
- `phase-1-scaffold-plan.md`
- `protocol-mapping-sheet.md`
- `server-rebuild-checklist.md`
- `web-rebuild-checklist.md`
- `migration-runbook.md`
- `frontend-architecture-plan.md`
- `backend-architecture-plan.md`
- `protocol-and-data-plan.md`
- `implementation-roadmap.md`
