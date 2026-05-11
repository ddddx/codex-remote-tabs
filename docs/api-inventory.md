# API Inventory

## 1. GET /health

- 鉴权：否
- 功能：健康检查
- 返回：
  - `status`
  - `tabs`
  - `websocketClients`
  - `uptimeSec`

## 2. GET /api/workspace/shortcuts

- 鉴权：是
- 功能：获取工作区快捷信息
- 返回：
  - `projectRoot`
  - `desktopPath`
  - `lastUsedPath`
  - `preferredPath`
  - `roots`

## 3. GET /api/workspace/list

- 鉴权：是
- 功能：列出目录
- query：
  - `path`
- 返回：
  - `path`
  - `parentPath`
  - `entries[]`

## 4. POST /api/workspace/create-directory

- 鉴权：是
- 功能：新建目录
- body：
  - `parentPath`
  - `folderName`
- 返回：
  - `path`

## 5. POST /api/uploads/image

- 鉴权：是
- 功能：上传图片
- body：`image/*` raw bytes
- headers：
  - `content-type`
  - `x-upload-filename`
- 返回：
  - `id`
  - `name`
  - `contentType`
  - `filePath`
  - `url`

## 6. GET /api/uploads/:fileName

- 鉴权：是
- 功能：读取已上传图片
- path params：
  - `fileName`
- 返回：
  - 图片文件内容

## 7. GET /api/codex/options

- 鉴权：是
- 功能：读取模型与默认配置
- query：
  - `cwd`
- 返回：
  - `models[]`
  - `defaults.model`
  - `defaults.reasoningEffort`
  - `defaults.approvalPolicy`
  - `defaults.sandboxMode`
