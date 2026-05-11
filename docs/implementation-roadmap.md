# 实施路线图

> 状态：重构实施历史文档。最终成品已完成切换，新系统已成为唯一运行时主入口。

## 1. 开发策略

本项目采用“新系统并行构建，旧系统作为参考”的方式推进。

不建议：

- 在旧 `public/` 与旧 `src/server.js` 内原地重构
- 一边抽一边改旧主链路

建议：

- 新建 monorepo
- 新建前后端
- 新建 shared packages
- 用旧系统做行为参考与迁移来源

## 2. 阶段顺序

### Sprint 1：基线与脚手架

目标：

- 完成现状盘点
- 建立 monorepo
- 跑通空骨架

任务：

1. 盘点功能和协议
2. 建 workspace
3. 建 apps/packages
4. 配 lint/typecheck/test
5. 建空的 web/server/protocol/domain/adapters

完成标准：

- 新工程可启动
- 文档和清单齐备

### Sprint 2：协议层

目标：

- 建立 shared protocol

任务：

1. 完成 HTTP types
2. 完成 WS types
3. 完成 Zod schema
4. 完成 protocol tests

完成标准：

- 前后端都可导入 shared protocol

### Sprint 3：domain 与 adapters

目标：

- 落地最核心的业务与平台抽象

任务：

1. Session domain
2. Turn domain
3. Approval domain
4. Codex adapter
5. Windows adapter
6. SQLite adapter

完成标准：

- adapter 可独立被 mock
- domain 有单测

### Sprint 4：server MVP

目标：

- 新后端独立可跑

任务：

1. Fastify bootstrap
2. health
3. auth middleware
4. workspace API
5. uploads API
6. codex options API
7. WS gateway
8. SessionService / TurnService / ApprovalService

完成标准：

- 可通过 API + WS 完成基本会话流

### Sprint 5：web MVP

目标：

- 新前端主流程可用

任务：

1. app shell
2. session rail
3. timeline workspace
4. socket sync
5. composer
6. approvals

完成标准：

- 新建会话、发消息、看时间线、处理审批可用

### Sprint 6：frontend expansion

目标：

- 补齐重设计后的附加面板和高级流程

任务：

1. inspector
2. workspace modal
3. uploads
4. auth modal
5. context usage
6. mobile layout

完成标准：

- 前端完整覆盖主功能

### Sprint 7：migration and hardening

目标：

- 完成 SQLite 迁移与系统硬化

任务：

1. migration script
2. legacy import
3. repository hardening
4. error handling
5. observability

完成标准：

- 新系统可接管旧状态

### Sprint 8：tests and cutover

目标：

- 测试齐全，完成切换

任务：

1. integration tests
2. e2e tests
3. full regression
4. production cutover
5. old code cleanup

完成标准：

- 新系统成为唯一主入口

## 3. 依赖关系

强依赖顺序：

1. `protocol` 在最前
2. `domain/adapters` 在 server 之前
3. `server` 在 web 深入联调之前
4. `sqlite migration` 在 cutover 之前
5. `tests` 在 cutover 前必须完成

## 4. 每阶段验收问题

每个阶段结束必须回答：

1. 当前可运行吗？
2. 当前可测试吗？
3. 当前是否引入了新的未文档化协议？
4. 当前是否仍依赖旧主链路？
5. 当前是否可以回退？

## 5. 后续开发文档建议

后续可以继续补：

- `phase-0-checklist.md`
- `protocol-mapping-sheet.md`
- `server-migration-tasks.md`
- `web-component-map.md`
- `sqlite-schema.sql`
- `cutover-runbook.md`
