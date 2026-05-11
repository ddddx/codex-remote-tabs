# 前端重构与重设计方案

## 1. 目标

前端不做“把旧 DOM 模块搬进 React”，而是直接重建为面向长期演进的控制台型应用。

前端目标：

- 重新设计信息架构
- 重新定义页面布局
- 重新拆分组件树
- 保留现有核心能力
- 提升审批、消息流、会话管理、多设置项共存时的可维护性

## 2. 设计原则

### 2.1 任务优先

用户主要任务不是“看页面”，而是：

- 找到会话
- 看当前运行状态
- 处理审批
- 发送下一条指令
- 回看消息、计划和 diff

页面应围绕这五类任务组织。

### 2.2 时间线是主视图

最重要的信息是当前会话的消息时间线，因此时间线区域必须是页面视觉中心。

### 2.3 设置降噪

模型、effort、approval、sandbox、权限预设这类设置不能持续压在主输入区上方。默认状态下应收纳，只在需要时展开或进入 inspector。

### 2.4 审批高优先级

审批与 `request_user_input` 必须比普通消息更容易定位。不能埋进长时间线后变得难找。

### 2.5 手机和桌面是同一套信息架构

不是简单响应式压缩，而是同一信息层级在不同断点下切换布局。

## 3. 新信息架构

## 桌面端布局

```text
┌───────────────────────────────────────────────────────────────┐
│ Global top bar                                                │
├───────────────┬───────────────────────────────┬───────────────┤
│ Session rail  │ Timeline workspace            │ Inspector     │
│               │                               │               │
│ - filters     │ - thread header               │ - model       │
│ - sessions    │ - timeline                    │ - effort      │
│ - status      │ - approval anchors            │ - approval    │
│               │ - jump controls               │ - sandbox     │
│               │                               │ - token usage │
├───────────────┴───────────────────────────────┴───────────────┤
│ Composer dock                                                 │
└───────────────────────────────────────────────────────────────┘
```

## 移动端布局

```text
Top bar
Thread header
Timeline
Pinned approval / notice strip
Composer
Bottom sheet:
- sessions
- settings / inspector
```

## 4. 页面与区域

### 4.1 App Shell

职责：

- 页面整体框架
- 响应式断点切换
- 全局浮层挂载点
- 主题切换

### 4.2 Session Rail

职责：

- 会话列表
- 会话状态
- 分组、筛选、排序
- 新建会话入口
- 未读 / 待批准标记

建议子组件：

- `SessionRail`
- `SessionToolbar`
- `SessionGroupList`
- `SessionListItem`
- `SessionStatusPill`
- `CreateSessionButton`

### 4.3 Timeline Workspace

职责：

- 当前会话主内容区
- 消息时间线
- turn 状态
- 新消息跳转
- plan / diff / tool / reasoning 展示

建议子组件：

- `TimelineWorkspace`
- `ThreadHeader`
- `TimelineList`
- `TimelineEntry`
- `TimelineSection`
- `JumpToLatestButton`

### 4.4 Inspector

职责：

- 当前会话设置
- token usage
- 权限相关信息
- 工作区信息
- 辅助上下文信息

建议子组件：

- `InspectorPanel`
- `SessionSettingsCard`
- `ContextUsageCard`
- `WorkspaceSummaryCard`
- `ConnectionCard`

### 4.5 Composer Dock

职责：

- 输入提示词
- 管理附件
- 提交消息
- 暂时显示最核心的会话配置摘要

建议子组件：

- `ComposerDock`
- `ComposerTextarea`
- `ComposerToolbar`
- `AttachmentTray`
- `ComposerPresetSummary`

## 5. Feature 拆分

```text
features/
  sessions/
  timeline/
  approvals/
  composer/
  uploads/
  workspace/
  auth/
  settings/
  inspector/
  notifications/
```

### 5.1 sessions

职责：

- 拉取会话列表
- active session 切换
- 会话分组
- 会话状态映射
- 新建会话流程入口

### 5.2 timeline

职责：

- 渲染消息时间线
- 处理流式增量
- 聚合 plan / diff / tool call / reasoning / error

### 5.3 approvals

职责：

- 审批卡片
- session 级授权
- `request_user_input`
- pinned approvals

### 5.4 composer

职责：

- 草稿
- 发送
- 当前会话设置摘要
- slash 命令

### 5.5 uploads

职责：

- 图片预览
- 上传进度
- 上传结果插入 composer

### 5.6 workspace

职责：

- 工作区浏览
- 快捷路径
- 新建目录

### 5.7 auth

职责：

- token 输入
- 鉴权失败提示
- local storage token 生命周期

### 5.8 inspector

职责：

- 模型与权限设置编辑
- 上下文窗口展示
- 当前会话元信息

## 6. 组件分层

```text
design/
  tokens/
  primitives/
  layouts/
components/
  shared/
  timeline/
  sessions/
  approvals/
  composer/
```

### 6.1 design/tokens

- color
- spacing
- radius
- shadow
- typography
- motion

### 6.2 design/primitives

- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `Badge`
- `Card`
- `Popover`
- `Modal`
- `Sheet`
- `Tabs`
- `Tooltip`

### 6.3 layout primitives

- `AppShell`
- `Panel`
- `SplitView`
- `Dock`
- `StickyRegion`

## 7. 前端状态模型

推荐采用 `Zustand`，按 slice 拆分：

### 7.1 session slice

- `sessions`
- `activeSessionId`
- `sessionFilters`
- `sessionSort`
- `unreadIds`

### 7.2 timeline slice

- `entriesBySession`
- `partialEntriesBySession`
- `turnStateBySession`
- `plansBySession`
- `diffsBySession`

### 7.3 composer slice

- `draftBySession`
- `attachmentsBySession`
- `uploadsInFlightBySession`
- `composerSettingsBySession`

### 7.4 approval slice

- `pendingRequests`
- `pinnedApprovalIds`

### 7.5 ui slice

- `theme`
- `inspectorOpen`
- `sessionRailOpen`
- `activeModal`
- `jumpToLatestVisible`

### 7.6 auth / connection slice

- `token`
- `authFailed`
- `connectionState`
- `connectionError`

## 8. 前端 transport 分层

### 8.1 API client

仅负责：

- HTTP 请求
- headers
- token 注入
- schema decode

### 8.2 socket client

仅负责：

- 建连 / 重连
- 发送消息
- 解析服务端消息

### 8.3 sync controller

负责：

- 将 socket 事件映射成 store action
- 处理流式增量归并

## 9. 关键交互重设计建议

### 9.1 会话参数不再常驻展开

当前模型/权限等参数过于前置。新方案中：

- 默认只显示摘要
- 点击后在 inspector 编辑
- 移动端用 bottom sheet 打开

### 9.2 审批做 pinned 区域

当会话存在待审批内容时：

- 时间线上保留原始位置
- 另在顶部或底部提供 pinned summary

### 9.3 新建会话采用两段式

- 基础信息：会话名、工作区
- 高级选项：模型、权限、sandbox

### 9.4 Token 管理并入 auth 流程

- 不再是零散按钮行为
- 统一由 auth feature 管理

## 10. 前端实施顺序

1. 建 app shell
2. 建 session rail
3. 建 timeline workspace
4. 建 socket + store
5. 建 composer
6. 建 approvals
7. 建 inspector
8. 建 workspace modal
9. 建 uploads
10. 建 auth
11. 做 mobile 布局收敛

## 11. 验收标准

- 前端布局不再受旧 DOM 限制
- 组件边界清晰
- timeline 成为主视图
- 设置项不再压迫主输入区
- 审批更容易被发现
- 手机端可自然完成主流程
