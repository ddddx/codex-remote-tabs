# 当前行为记录

## 1. 产品定位

当前项目是一个运行在 Windows 主机上的远程 Codex 控制台：

- 本机运行 Node 服务
- 浏览器通过 HTTP + WebSocket 连接
- 服务端连接本机 Codex app-server
- 会话与本地 Codex 窗口做映射
- 手机和 PC 都可作为控制端

## 2. 主流程

### 2.1 首次启动

1. 启动 `npm run remote:restart` 或 `start-codex-remote.bat`
2. 若缺少 `config.local.json`，自动生成
3. 自动生成随机 `WS_TOKEN`
4. 浏览器访问 `http://localhost:18637`
5. 如启用 token，页面可输入并保存 token

### 2.2 新建会话

1. 点击 `+ 新建会话`
2. 打开会话弹窗
3. 输入会话名与工作区目录
4. 可选模型、effort、approval policy、sandbox
5. 服务端创建 Codex thread
6. 服务端尝试打开本地 Codex 窗口
7. 客户端切到新会话

### 2.3 恢复会话

1. 页面首次连上后收到 `state`
2. 选中某个会话
3. 客户端发送 `thread_sync`
4. 服务端读取 thread 完整内容并回传
5. 服务端尝试恢复本地窗口

### 2.4 关闭窗口

1. 左侧会话项点击关闭
2. 客户端发送 `tab_close`
3. 服务端关闭本地 Codex 窗口
4. thread 仍保留，不删除
5. 会话状态变为 `closed` 或 `detached`

### 2.5 发送消息

1. 用户输入文本，可附带图片
2. 客户端发送 `turn_send`
3. 服务端调用 Codex `turn/start`
4. turn 生命周期通过 WS 增量回传
5. 如需要，服务端尝试恢复或拉起本地窗口

### 2.6 审批与 request_user_input

1. Codex 发出 server request
2. 服务端转为 `server_request_required`
3. 客户端渲染审批卡片或问题表单
4. 用户提交响应
5. 客户端发送 `server_request_respond`
6. 服务端回写给 Codex

### 2.7 图片上传

1. 用户在 composer 里选择图片
2. 客户端调用 `/api/uploads/image`
3. 服务端保存文件到 `.codex-remote-uploads`
4. 上传结果转成 attachment 参与 `turn_send`

### 2.8 工作区浏览

1. 新建会话弹窗中输入路径或浏览目录
2. 客户端调用 workspace API
3. 服务端列出目录、创建目录、记住最近路径

### 2.9 断线重连

1. WS 断开
2. 客户端指数退避自动重连
3. 若鉴权失败，弹 token 输入框
4. 重连成功后自动 `thread_sync`

### 2.10 本地窗口恢复

1. 会话同步或发消息时，如本地窗口未开
2. 服务端尝试 `resume <threadId>` 拉起新窗口
3. 通过 PID / 命令行扫描恢复 thread 与窗口映射

## 3. 当前交互语义

- “关闭会话”实际上只关闭本地窗口，不归档 thread
- 会话可以处于：
  - attached
  - detached
  - closed
- 页面以时间线方式展示 turn、tool、plan、diff、approval
- auth token 存在浏览器 localStorage

## 4. 当前状态来源

- 运行时内存：
  - tabs
  - pending server requests
  - turn plans
  - turn diffs
  - supplemental items
- 本地 JSON：
  - `.window-map.json`
  - `.codex-remote-state.json`
- 本地上传目录：
  - `.codex-remote-uploads/`
