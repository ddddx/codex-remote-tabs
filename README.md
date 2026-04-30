# Codex Remote Tabs

通过手机或 PC 远程控制本机 Codex，会话以多标签显示，并映射到本机多个 Codex 窗口。

## 功能

- 控制端新建标签 -> PC 创建新的 Codex thread，并尝试打开一个本地 Codex 窗口
- 控制端关闭标签 -> 关闭对应窗口并归档对应 thread
- 支持在控制端发送 prompt 到指定标签
- 支持流式查看 agent 输出（delta）
- 手机/PC 都可访问（响应式 Web UI）
- 左侧边栏标签管理，支持打开/隐藏
- Markdown 渲染（代码块、加粗、列表、标题）
- 发送后显示思考动画，流式回复实时显示
- WebSocket 断开自动重连

## 运行要求

- Windows
- Node.js 22+
- 已安装 Codex CLI（`codex.cmd` 需在 PATH 中，或通过 `CODEX_CMD` 环境变量指定路径）

## 快速启动

```bash
npm install
node start-appserver.js   # 启动 app-server
node start-web.js          # 启动 Web 控制端
```

或使用 pm2：

```bash
pm2 start start-appserver.js --name cc-appserver
pm2 start start-web.js --name cc-web
```

默认地址：

- 本机：`http://localhost:8787`
- 局域网：`http://<本机IP>:8787`

## 配置

可用环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8787` | Web 控制端端口 |
| `CODEX_HOME` | `./.codex-home` | Codex 配置目录 |
| `CODEX_CMD` | `codex.cmd` | Codex CLI 路径 |
| `CODEX_APP_SERVER_WS` | `ws://127.0.0.1:4792` | app-server WebSocket 地址 |

示例：

```powershell
$env:CODEX_CMD='C:\path\to\codex.cmd'
$env:PORT='9000'
node start-web.js
```

## 远程访问（手机）

1. 让手机和 PC 在同一局域网。
2. 在 PC 上放开 `8787` 端口（只对内网）。
3. 手机浏览器访问 `http://<PC局域网IP>:8787`。

如果要公网访问，建议反向代理 + HTTPS + 强认证，不要直接裸露端口。

## 项目结构

```
cc-workspace/
├── public/           # 前端静态文件
│   ├── index.html
│   ├── app.js
│   └── style.css
├── src/              # 后端源码
│   ├── server.js     # Web 服务器 + WebSocket
│   ├── codexAppServerClient.js  # Codex app-server 客户端
│   └── windowManager.js         # 窗口管理
├── start-appserver.js  # 启动 app-server
├── start-web.js        # 启动 Web 控制端
└── package.json
```

## 当前限制

- 会话关闭是归档（`thread/archive`），不是物理删除。
- "本地窗口映射"依赖 Windows `Start-Process`；若权限策略限制，仍可远程控制 thread，但不会自动弹出本地窗口。
