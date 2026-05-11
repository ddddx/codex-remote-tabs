# 前端组件与页面执行图

## 1. 目标

本文件用于指导新 `apps/web` 的页面与组件落地顺序。

## 2. 页面层级

```text
App
  AppShell
    SessionRail
    TimelineWorkspace
    InspectorPanel
    ComposerDock
    GlobalOverlays
```

## 3. 组件落地顺序

### 第一批：骨架

- `AppShell`
- `TopBar`
- `SessionRail`
- `TimelineWorkspace`
- `ComposerDock`

完成标准：

- 页面框架能展示静态数据

### 第二批：状态驱动

- `SessionList`
- `SessionListItem`
- `TimelineList`
- `TimelineEntry`
- `JumpToLatestButton`
- `ConnectionStatus`

完成标准：

- 能接 store 渲染会话与消息

### 第三批：交互

- `ComposerTextarea`
- `AttachmentTray`
- `ApprovalCard`
- `RequestUserInputCard`
- `TokenModal`
- `SessionCreateModal`

完成标准：

- 主交互链路可走通

### 第四批：高级区域

- `InspectorPanel`
- `SessionSettingsCard`
- `ContextUsageCard`
- `WorkspaceSummaryCard`
- `NotificationsStrip`

完成标准：

- 高级设置与辅助信息可用

## 4. Feature 与组件映射

### sessions

- `SessionRail`
- `SessionToolbar`
- `SessionGroupList`
- `SessionListItem`

### timeline

- `TimelineWorkspace`
- `TimelineList`
- `TimelineEntry`
- `UserMessageCard`
- `AssistantMessageCard`
- `ToolCallCard`
- `ReasoningCard`
- `PlanCard`
- `DiffCard`
- `SystemNoticeCard`

### approvals

- `ApprovalCard`
- `ApprovalActionBar`
- `PinnedApprovalStrip`
- `RequestUserInputCard`

### composer

- `ComposerDock`
- `ComposerToolbar`
- `ComposerTextarea`
- `ComposerSettingsSummary`

### uploads

- `AttachmentTray`
- `AttachmentPreviewCard`

### workspace

- `WorkspaceBrowserModal`
- `WorkspacePathBar`
- `WorkspaceEntryList`

### auth

- `TokenModal`
- `AuthStateBanner`

### inspector

- `InspectorPanel`
- `SessionSettingsCard`
- `ContextUsageCard`

## 5. Store 接入顺序

1. auth / connection
2. sessions
3. timeline
4. composer
5. approvals
6. workspace
7. uploads
8. UI slice

## 6. 禁止事项

- 页面组件直接访问 WebSocket 原始实现
- feature 直接改全局对象
- 组件里写 schema decode
- render 组件里写复杂业务判断

## 7. 每步验收

每完成一批组件必须检查：

- 组件可独立渲染
- store action 可驱动状态变化
- 页面主流程未阻断
