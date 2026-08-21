# 需求管理平台

基于 React、Vite、Hono 和 Cloudflare Workers 的需求管理平台。前端静态资源与
`/api/*`、`/openapi/*` 由同一 Worker 提供，业务数据存储在 D1，附件存储在
Workers KV。单个图片最大 10 MiB，其他附件最大 20 MiB。

## 本地开发

前置要求：

- Node.js 22+
- npm 10+

安装依赖并创建本地 Worker 配置：

```bash
npm ci
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars`，显式设置本地身份。不要把该文件提交到 Git：

```dotenv
APP_ENV=development
DEV_USER_EMAIL=local-user@example.com
DEV_USER_NAME=Local User
SUPER_ADMIN_EMAILS=local-user@example.com
OPENAPI_DEMAND_TOKEN=replace-with-a-local-random-token
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
```

`DEV_USER_EMAIL` 是本地开发专用身份，只有 `APP_ENV` 不是 `production` 时才会
生效。`SUPER_ADMIN_EMAILS` 支持以逗号分隔多个邮箱；匹配的本地开发用户会
获得超级管理员角色。生产环境使用 D1 账号密码和 HttpOnly 会话 Cookie。
需要测试 AI 整合时再填写本地 OpenRouter key。

首次运行或新增 migration 后，初始化本地 D1：

```bash
npx wrangler d1 migrations apply DB --local
npm run dev
```

前端默认监听 `http://localhost:5173`，并把 `/api` 代理到
`http://localhost:8787` 的本地 Worker。常用校验命令：

```bash
npm run test
npm run type:check
npm run lint
npm run build
```

`npm run build` 生成 `dist/client`，并通过 Wrangler dry-run 检查 Worker 包。

## Cloudflare 资源

先登录 Wrangler，再创建独立的生产资源：

```bash
npx wrangler login
npx wrangler d1 create demand-management-platform-db
npx wrangler kv namespace create demand-management-platform-files
```

将 D1 创建结果中的真实 `database_id` 和 KV 创建结果中的真实 `id` 替换到
`wrangler.toml`。也可以在 Cloudflare Dashboard 中分别创建 D1 数据库和 KV
namespace，再复制资源 ID。仓库中的全零 KV ID 只是占位符，不能用于生产部署。

对远程 D1 执行 migration：

```bash
npx wrangler d1 migrations apply DB --remote
```

该命令会列出待执行 migration 并要求确认。先迁移数据库，再部署依赖新表结构
的代码；生产数据变更前应确认 Cloudflare 的备份与回滚方案。

## 生产变量与 Secrets

`wrangler.toml` 中的 `APP_ENV=production` 必须保留，防止生产环境接受
`DEV_USER_EMAIL` 本地身份。`OPENROUTER_MODEL` 是可公开的普通变量。以下值应
作为 Worker Secrets 配置，不能写入 `wrangler.toml`、`.env` 或 Git 历史：

```bash
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put OPENAPI_DEMAND_TOKEN
```

- `OPENROUTER_API_KEY`：服务端 AI 整合使用的 OpenRouter key。
- `OPENAPI_DEMAND_TOKEN`：`POST /openapi/demands` 的 Bearer token。

可在 Cloudflare Dashboard 的 Worker `Settings > Variables and Secrets` 中配置
同名 Secret。不要添加 `VITE_` 前缀，否则变量可能被前端构建公开。

## 账号密码认证

生产环境使用平台自己的邮箱和密码登录，不依赖 Cloudflare Access。密码采用
PBKDF2-SHA-256 和独立随机盐保存，D1 不存储明文密码。登录会话保存在
`app_session`，浏览器只持有 `HttpOnly`、`Secure`、`SameSite=Strict` Cookie。
连续输错密码 5 次后账号会锁定 15 分钟。

首次部署需要为第一个超级管理员写入凭据。先通过标准输入生成密码哈希，避免密码
出现在命令行参数中：

```bash
printf '%s' 'replace-with-a-temporary-password' | npm run -s auth:hash
```

将输出的 `hash`、`salt` 和 `iterations` 写入远程 D1 的
`app_credential`，并确保该用户在 `user_role` 中拥有 `super_admin`。初始凭据
的 `must_change_password` 应设为 `1`，用户首次登录后会被要求修改密码。

超级管理员登录后可在“用户管理”中创建普通用户、分配角色或重置密码。新建账号和
重置后的临时密码都会强制用户在下次登录时修改。

## GitHub 与部署

发布前确认当前分支和待提交内容：

```bash
git status --short
git diff --check
npm run test
npm run type:check
npm run lint
npm run build
```

推送到 GitHub `main` 后，可在 Cloudflare Dashboard 使用 Git 集成自动部署：

1. 在 `Workers & Pages` 中创建 Worker，导入 GitHub 仓库。
2. 将生产分支设为 `main`，根目录设为 `/`。
3. Build command 设为 `npm run build:client`。
4. Deploy command 设为 `npx wrangler deploy`。
5. 在部署前确认 D1/KV 绑定名称与 `wrangler.toml` 一致，并配置上述 Secrets。
6. 保存后触发首次部署；此后 `main` 的新提交会自动触发生产部署。

不使用 Git 集成时，可在完成远程 migration 和 Secret 配置后手动发布：

```bash
npm run build:client
npx wrangler deploy
```

## 健康检查

直接访问：

```bash
curl https://<production-hostname>/api/health
```

预期响应为：

```json
{ "status": "ok", "database": "ok" }
```

## 常见故障

- `database_id` 无效或找不到 D1：替换 `wrangler.toml` 的全零占位 ID，并确认
  当前 Cloudflare 账户拥有该数据库。
- `no such table`：执行 `npx wrangler d1 migrations apply DB --local` 或
  `--remote`，并确认命令使用了正确环境。
- 附件上传或读取失败：确认 `FILES` KV namespace ID 和当前账户一致，并检查
  文件是否超过 10 MiB 图片限制或 20 MiB 文档限制。
- API 返回 `401 AUTH_REQUIRED`：生产环境先使用平台账号登录；本地开发则检查
  `.dev.vars` 中的 `APP_ENV` 和 `DEV_USER_EMAIL`。
- 无法登录：确认账号已写入 `app_user` 和 `app_credential`，并检查是否因连续
  失败而被临时锁定。
- 首个管理员没有权限：确认该用户在 `user_role` 中拥有 `super_admin`。
- AI 整合提示未配置或调用失败：检查 `OPENROUTER_API_KEY` Secret、模型名、
  OpenRouter 额度和 Worker 日志；手动整合不依赖 OpenRouter。
- 外部需求接口返回 `401` 或 `503`：确认 `OPENAPI_DEMAND_TOKEN` 已配置，调用方
  使用同一 token。
- `/api/health` 返回 `5xx`：优先检查 D1 的 `DB` 绑定和远程 migration，再查看
  Cloudflare Worker 日志。

`.env`、`.dev.vars`、`.wrangler/`、`dist/` 和 zip 文件均被 Git 忽略。只提交
不含真实账户、密钥和资源 ID 的 `.env.example`、`.dev.vars.example`。
