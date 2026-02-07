# 研学行程生成器（Travel Planner）

AI 驱动的研学行程规划平台，覆盖知识库索引、行程生成、商品设计与导出交付。

## 1. 项目概览

### 1.1 核心能力

- 知识库：文件上传、分块、向量化、RAG 检索
- 行程生成：基于知识库上下文异步生成行程
- 商品设计：基于行程主题生成图案与效果图
- 导出交付：统一通过 `artifacts` 管理下载（PDF/PPTX/图片）

### 1.2 当前状态（2026-02-07）

- 前端核心页面已接入真实 API：`/`, `/itinerary`, `/knowledge`, `/exports`, `/settings`, `/merch`
- 认证闭环已落地：`/auth/login`、`/auth/register` + `middleware.ts` 全站鉴权
- 导出下载统一走 `artifacts`：
  - `GET /api/exports`
  - `GET /api/exports/artifacts/[id]/download`
- `GET /api/exports/[id]` 保留兼容（deprecated）

详细进度与待办见 `TODO.md`。

## 2. 技术架构

- 前端/后端：Next.js 16（App Router）+ React 19 + TypeScript
- UI：Tailwind CSS + shadcn/ui + Radix UI
- 数据：Supabase PostgreSQL + pgvector + Storage + Auth
- 异步任务：Inngest
- LLM：Zhipu / Stub
- Embeddings：OpenAI / Stub（OpenAI 为可选依赖路径）
- 商品图像：ComfyUI
- 演示文稿导出：Gamma API v1.0

关键目录：

- `app/`：页面与 API 路由
- `app/jobs/`：Inngest 任务函数
- `lib/`：Supabase/Queue/LLM/Embeddings/Storage/业务逻辑
- `supabase/migrations/`：数据库迁移
- `supabase/scripts/`：迁移验证脚本

## 3. 认证与访问控制

中间件实现见 `middleware.ts`：

- 页面访问：未登录跳转 `/auth/login?next=<原路径>`
- API 访问：未登录访问受保护 API 返回 `401`
- 放行前缀：
  - `/auth/*`
  - `/api/webhooks/*`
  - `/api/inngest`
  - `/_next/*` 与静态资源

## 4. API 一览

### 4.1 Knowledge

- `POST /api/knowledge/upload`
- `GET /api/knowledge/list`
- `GET /api/knowledge/[id]`
- `DELETE /api/knowledge/[id]`
- `POST /api/knowledge/[id]/reindex`
- `POST /api/knowledge/search`
- `GET /api/knowledge/packs`
- `POST /api/knowledge/packs`
- `GET /api/knowledge/packs/[id]`
- `PATCH /api/knowledge/packs/[id]`
- `DELETE /api/knowledge/packs/[id]`

### 4.2 Itineraries

- `POST /api/itineraries/create`
- `GET /api/itineraries/status?jobId=...`
- `GET /api/itineraries/[id]`

### 4.3 Merch

- `POST /api/merch/generate`
- `GET /api/merch/status?jobId=...`
- `GET /api/merch/[id]`

### 4.4 Exports

- `GET /api/exports`
- `GET /api/exports/artifacts/[id]/download`
- `GET /api/exports/[id]`（deprecated，兼容路径）

### 4.5 Settings / Queue / Webhooks

- `GET /api/settings`
- `PATCH /api/settings`
- `GET/POST /api/inngest`
- `GET/POST /api/webhooks/inngest`
- `GET/POST /api/webhooks/payment`（占位实现）

## 5. 环境要求

- Node.js `>= 20`（推荐 20 LTS）
- 包管理器：推荐 `pnpm`（CI 也是 `pnpm`）
- PostgreSQL（建议 Supabase 托管）
- `psql`（用于执行迁移与验证）

## 6. 环境变量（完整说明）

模板文件：`.env.example`。

建议复制为本地文件：

```bash
cp .env.example .env.local
```

变量说明：

| 变量 | 必填 | 用途 |
|---|---|---|
| `SUPABASE_URL` | 是 | 服务端 Supabase URL（Server/Middleware/Admin） |
| `SUPABASE_ANON_KEY` | 是 | 服务端匿名 key（RLS 场景） |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | 管理端 key（后台任务、Storage 签名、绕过 RLS） |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | 浏览器端 Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | 浏览器端匿名 key |
| `INNGEST_EVENT_KEY` / `INNGEST_KEY` | 是（二选一） | 发送 Inngest 事件 |
| `INNGEST_SIGNING_KEY` | 是 | Inngest 签名校验 |
| `LLM_PROVIDER` | 否 | `zhipu` 或 `stub`（默认 `stub`） |
| `ZHIPU_API_KEY` | 条件必填 | `LLM_PROVIDER=zhipu` 时必填 |
| `EMBEDDING_PROVIDER` | 否 | `openai` 或 `stub`（默认 `stub`） |
| `OPENAI_API_KEY` | 条件必填 | `EMBEDDING_PROVIDER=openai` 时必填 |
| `GAMMA_API_KEY` | 条件必填 | 使用 Gamma 导出时必填 |
| `GAMMA_API_URL` | 否 | Gamma API base URL（默认 `https://public-api.gamma.app/v1.0`） |
| `COMFY_API_URL` | 条件必填 | 商品图生成服务地址 |
| `COMFY_API_KEY` | 条件必填 | 商品图生成服务鉴权 |

说明：

- `openai` 为可选依赖路径。若使用 `EMBEDDING_PROVIDER=openai`，需安装 `openai` 包。
- `.env.local` 已被 `.gitignore` 忽略，不要提交真实密钥。

## 7. 本地开发（从 0 到跑通）

### 7.1 安装依赖

推荐 pnpm：

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

如 lockfile 与 `package.json` 不一致：

```bash
pnpm install --no-frozen-lockfile
```

### 7.2 初始化数据库（Supabase/Postgres）

按顺序执行迁移：

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/002_knowledge_rls.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/003_artifacts_table.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/004_artifacts_merch.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/005_fix_schema_and_policies.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/006_user_bootstrap_and_settings.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/007_cleanup_invalid_indexes.sql
```

### 7.3 创建 Storage Buckets

在 Supabase Storage 创建私有 bucket：

- `knowledge`
- `merch`
- `exports`

项目下载逻辑使用 signed URL，不依赖 public bucket。

### 7.4 启动应用

```bash
pnpm dev
```

访问：`http://localhost:3000`

### 7.5 启动 Inngest 本地调度（异步任务必需）

另开终端：

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

若不启动 Inngest，上传索引/行程生成/商品生成等异步链路不会推进。

## 8. 质量门禁与回归

```bash
pnpm lint
pnpm typecheck
pnpm build
```

API 集成测试脚本入口：

```bash
pnpm test:api
```

当前仓库若未安装 `vitest`，请先补齐：

```bash
pnpm add -D vitest
```

最小回归关注：

- 鉴权（401 与登录跳转）
- 知识重索引
- 行程创建与状态推进
- 导出下载
- 商品生成状态

## 9. 迁移验证（空库 + 增量库）

脚本位置：

- `supabase/scripts/validate_migrations.sh`
- `supabase/scripts/validate_migrations.sql`
- `supabase/scripts/validate_incremental_migrations.sql`
- 报告模板：`supabase/scripts/VALIDATION_REPORT.md`

执行：

```bash
# 基础校验
DATABASE_URL="$DB_URL" bash supabase/scripts/validate_migrations.sh

# 启用增量校验
VALIDATE_INCREMENTAL=true DATABASE_URL="$DB_URL" bash supabase/scripts/validate_migrations.sh
```

建议按 `VALIDATION_REPORT.md` 中 DB_A / DB_B 流程记录结果。

## 10. 部署说明（生产）

### 10.1 推荐拓扑

- Next.js 应用（Vercel 或自托管 Node）
- Supabase（Postgres + Auth + Storage）
- Inngest Cloud（事件调度）
- 外部服务：Gamma、ComfyUI、Zhipu/OpenAI（按需）

### 10.2 部署前检查

- 所有生产环境变量已配置
- 生产库完成 `001..007` 迁移
- 三个 Storage bucket 已创建
- Supabase Auth 回调域名配置正确
- `GET /api/inngest` 与 Webhook 路由可公网访问

### 10.3 Vercel 部署（推荐）

1. 连接仓库并导入项目（Framework: Next.js）。
2. 在 Vercel Project Settings 配置全部环境变量（Production/Preview）。
3. 触发部署。
4. 在 Inngest 控制台配置对应环境的 key，并确认应用可访问 `/api/inngest`。
5. 使用生产账号走一遍链路：登录 -> 上传 -> 行程 -> 导出 -> 商品。

### 10.4 自托管部署（Node）

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

反向代理（Nginx/Caddy）需透传：

- Cookie（Supabase SSR 会话）
- `/api/*` 路由
- WebSocket/keep-alive（如你的基础设施要求）

## 11. 常见问题

### 11.1 `ERR_PNPM_OUTDATED_LOCKFILE`

说明 lockfile 与 `package.json` 不一致。处理：

```bash
pnpm install --no-frozen-lockfile
# 然后提交 pnpm-lock.yaml
```

### 11.2 `react-day-picker` 与 `date-fns` 冲突

当前推荐组合：

- `react-day-picker` `^9.13.1`
- `date-fns` `4.1.0`

### 11.3 `OpenAI package is not installed`

仅在 `EMBEDDING_PROVIDER=openai` 时需要：

```bash
pnpm add openai
```

### 11.4 页面可打开但任务不推进

通常是 Inngest 未运行或 key 未配置，先检查：

- `INNGEST_EVENT_KEY` / `INNGEST_KEY`
- `INNGEST_SIGNING_KEY`
- `/api/inngest` 可访问

## 12. 参考文档

- `TODO.md`：当前开发进度与待办
- `docs/KNOWLEDGE_PIPELINE.md`：知识库链路设计
- `supabase/scripts/VALIDATION_REPORT.md`：迁移验证记录模板
