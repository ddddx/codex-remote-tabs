# 开工令

## 1. 目标

本文件定义重构项目的正式开工顺序、工作约束、阶段入口与退出条件。

执行原则：

- 新系统并行构建
- 旧系统只作为行为参考与迁移来源
- 禁止在旧 `public/` 和旧 `src/server.js` 上继续做结构性大改

## 2. 开工范围

本轮开工包含：

- monorepo 脚手架
- shared protocol
- domain / adapters
- 新 server
- 新 web
- SQLite 迁移
- 自动化测试
- 切换与清理

本轮开工不包含：

- `allowlist`

## 3. 工作方式

### 3.1 分支策略

- 主重构分支：`refactor/full-rebuild`
- 禁止在主分支直接推进重构
- 每个阶段可拆子分支再合回主重构分支

### 3.2 文档驱动

所有开发必须按以下文档执行：

- `docs/rebuild-plan.md`
- `docs/frontend-architecture-plan.md`
- `docs/backend-architecture-plan.md`
- `docs/protocol-and-data-plan.md`
- `docs/implementation-roadmap.md`
- `docs/phase-0-checklist.md`
- `docs/protocol-mapping-sheet.md`
- `docs/server-migration-tasks.md`
- `docs/web-component-map.md`
- `docs/migration-runbook.md`

### 3.3 完成判定

每阶段结束必须满足：

1. 可运行
2. 可 typecheck
3. 可测试
4. 结果已更新文档

## 4. 开工顺序

### 阶段 A

- 先执行 `phase-0-checklist.md`
- 产出现状 inventory

### 阶段 B

- 建 monorepo
- 建空 apps/packages
- 建 lint/typecheck/test 脚手架

### 阶段 C

- 执行 `protocol-mapping-sheet.md`
- 先落 `packages/protocol`

### 阶段 D

- 落 `packages/domain`
- 落 `packages/adapters`

### 阶段 E

- 按 `server-migration-tasks.md` 开发新 server

### 阶段 F

- 按 `web-component-map.md` 开发新 web

### 阶段 G

- 按 `migration-runbook.md` 完成 SQLite 迁移与切换

## 5. 第一批开工任务

第一批必须马上做的事：

1. 完成阶段 0 文档清单
2. 建 monorepo 骨架
3. 建 protocol package
4. 抽现有 API/WS message inventory

## 6. 阶段阻断条件

以下情况不得进入下一阶段：

- 协议 inventory 未完成
- 新工程无法本地启动
- protocol 未有 schema 与 type
- server 直接绕过 shared protocol
- web 直接依赖旧前端模块

## 7. 阶段退出条件

### 进入 server 开发前，必须完成：

- monorepo 建立
- protocol 初版完成
- domain / adapter 接口已定义

### 进入 web 开发前，必须完成：

- server MVP 可独立启动
- WS 基本链路可用
- session / turn / approval 协议稳定

### 进入切换前，必须完成：

- migration script 可运行
- integration tests 通过
- e2e 主流程通过

## 8. 立即执行命令

开工后第一步应当执行：

1. 创建重构分支
2. 创建 workspace 脚手架
3. 写 protocol inventory
4. 写 monorepo 基础配置

本文件作为开工总指令，后续所有任务按子文档分发。
