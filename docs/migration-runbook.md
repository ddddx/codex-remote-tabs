# 迁移与切换 Runbook

## 1. 目标

本文件用于指导从旧系统切换到新系统的完整步骤。

## 2. 迁移前提

切换前必须满足：

- 新 server 通过集成测试
- 新 web 通过主流程 E2E
- SQLite migration script 已完成
- 旧状态文件已识别

## 3. 旧状态来源

需处理的旧数据源：

- `.window-map.json`
- `.codex-remote-state.json`
- `config.local.json`
- `.codex-remote-uploads/`

## 4. 切换步骤

### Step 1：备份

- 备份旧仓库工作树
- 备份 JSON 状态文件
- 备份上传目录

### Step 2：初始化 SQLite

- 创建数据库文件
- 执行 migration
- 验证表结构

### Step 3：导入 legacy 状态

- 导入 window map
- 导入 app state
- 导入 thread preferences
- 导入 upload metadata

### Step 4：启动新 server

- 检查 health
- 检查 auth
- 检查 workspace routes
- 检查 upload routes
- 检查 codex options

### Step 5：启动新 web

- 检查页面加载
- 检查 token 输入
- 检查 sessions
- 检查 timeline

### Step 6：执行主流程回归

- 新建会话
- 发消息
- 审批
- 上传
- 工作区浏览
- 页面刷新恢复
- 断线重连
- 窗口恢复

### Step 7：灰度观察

- 保留旧系统不删除
- 用真实数据跑一轮
- 观察日志与错误

### Step 8：正式切换

- 将默认启动入口切到新 server/web
- 标记旧系统只读

### Step 9：清理

- 删除旧主链路代码
- 删除兼容 fallback
- 更新 README

## 5. 回退条件

出现以下情况可回退：

- 主流程阻断
- SQLite 状态损坏
- 窗口恢复不可用
- Codex event bridge 丢失关键消息

## 6. 回退步骤

1. 停止新 server
2. 恢复旧启动入口
3. 恢复旧 JSON 状态文件
4. 保留新 SQLite 供排查

## 7. 切换完成判定

切换完成必须满足：

- 新入口稳定运行
- 旧代码不再承载主流程
- 主流程测试和人工回归全部通过
