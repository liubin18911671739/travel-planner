# 研学行程生成器（Travel Planner）

AI 驱动的研学行程规划平台，覆盖知识库索引、行程生成、商品设计与导出交付。

## 当前状态（2026-02-07）

- 前端核心页面已接入真实 API：`/`, `/itinerary`, `/knowledge`, `/exports`, `/settings`, `/merch`
- 认证闭环已落地：`/auth/login`、`/auth/register` + `middleware.ts` 全站鉴权
- 导出下载统一走 `artifacts`：
  - `GET /api/exports`
  - `GET /api/exports/artifacts/[id]/download`
- `GET /api/exports/[id]` 保留兼容，但已标记 deprecated
- `next.config.mjs` 已移除 `typescript.ignoreBuildErrors`

详细进度与待办请看 [TODO.md](./TODO.md)。

## 认证行为

- 页面鉴权：
  - 未登录访问业务页面重定向到 `/auth/login`
  - 重定向附带 `next` 参数，登录成功后回跳原页面
- API 鉴权：
  - 未登录访问受保护 API 返回 `401` JSON
- 放行路径：
  - `/auth/*`
  - `/api/webhooks/*`
  - `/api/inngest`
  - 静态资源与 `/_next/*`

## 技术栈

- Next.js 16（App Router）
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase（PostgreSQL + pgvector + Storage + Auth）
- Inngest（异步任务）
- LLM: Zhipu / Stub
- Embeddings: OpenAI / Stub
- 图像生成: ComfyUI
- 演示文稿: Gamma API

## API 一览

### Knowledge

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

### Itineraries

- `POST /api/itineraries/create`
- `GET /api/itineraries/status?jobId=...`
- `GET /api/itineraries/[id]`

### Merch

- `POST /api/merch/generate`
- `GET /api/merch/status?jobId=...`
- `GET /api/merch/[id]`

### Exports

- `GET /api/exports`
- `GET /api/exports/artifacts/[id]/download`
- `GET /api/exports/[id]` (deprecated, compatibility only)

### Settings

- `GET /api/settings`
- `PATCH /api/settings`

### Queue / Webhook

- `GET/POST /api/inngest`
- `GET/POST /api/webhooks/inngest`
- `GET/POST /api/webhooks/payment`

## 页面行为

- `/`：重定向到 `/itinerary`
- `/itinerary`：提交创建任务并轮询 `job` 状态，完成后读取 `GET /api/itineraries/[id]`
- `/knowledge`：上传/列表/重索引/删除均走真实 API
- `/exports`：读取 `GET /api/exports` 并通过 artifact 下载接口获取 signed URL
- `/settings`：读写 `GET/PATCH /api/settings`
- `/merch`：创建任务后轮询状态并展示签名后的图案与效果图链接

## 环境变量

```bash
# Supabase (server)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Supabase (browser)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Inngest
INNGEST_EVENT_KEY=...   # 或 INNGEST_KEY
INNGEST_SIGNING_KEY=...

# LLM
LLM_PROVIDER=zhipu      # zhipu | stub
ZHIPU_API_KEY=...

# Embeddings
EMBEDDING_PROVIDER=stub # stub | openai
OPENAI_API_KEY=...      # EMBEDDING_PROVIDER=openai 时必填

# Gamma
GAMMA_API_KEY=...
GAMMA_API_URL=...       # 可选

# ComfyUI
COMFY_API_URL=...
COMFY_API_KEY=...
```

> 说明：`openai` 依赖是可选路径。仅在 `EMBEDDING_PROVIDER=openai` 时需要安装并配置。

## 本地开发

```bash
npm install
npm run dev
```

## 质量门禁

```bash
npm run lint
npm run typecheck
npm run test:api
npm run build
```

## 测试

本仓库已提供最小 API 集成测试基建（Vitest，路由级）：

- `tests/api/auth-settings.test.ts`
- `tests/api/knowledge-reindex.test.ts`
- `tests/api/itinerary-create.test.ts`
- `tests/api/exports-download.test.ts`
- `tests/api/merch-status.test.ts`

## 迁移验证（空库 + 增量库）

- 基础校验脚本：`supabase/scripts/validate_migrations.sql`
- 增量校验脚本：`supabase/scripts/validate_incremental_migrations.sql`
- 执行入口：`supabase/scripts/validate_migrations.sh`
- 验证记录：`supabase/scripts/VALIDATION_REPORT.md`

示例：

```bash
# 基础校验
DATABASE_URL="$DB_URL" bash supabase/scripts/validate_migrations.sh

# 含增量校验
VALIDATE_INCREMENTAL=true DATABASE_URL="$DB_URL" bash supabase/scripts/validate_migrations.sh
```


`.env.example` 是项目环境变量模板，作用是告诉你“这个项目运行/构建需要哪些配置”。

当前文件分 6 组：

1. Supabase 服务端  
- `SUPABASE_URL`: Supabase 项目 URL  
- `SUPABASE_ANON_KEY`: 服务端用的 anon key（项目里 server client 读取它）  
- `SUPABASE_SERVICE_ROLE_KEY`: 管理端 key（给后台写库、绕过 RLS 的 admin client 用）

2. Supabase 前端  
- `NEXT_PUBLIC_SUPABASE_URL`: 浏览器端 Supabase URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 浏览器端 anon key

3. Inngest  
- `INNGEST_EVENT_KEY` / `INNGEST_KEY`: 事件发送 key，二选一即可  
- `INNGEST_SIGNING_KEY`: Inngest 签名校验 key

4. LLM  
- `LLM_PROVIDER`: `zhipu` 或 `stub`  
- `ZHIPU_API_KEY`: 选择 `zhipu` 时必填

5. Embedding  
- `EMBEDDING_PROVIDER`: `openai` 或 `stub`  
- `OPENAI_API_KEY`: 选择 `openai` 时必填

6. Gamma / ComfyUI  
- `GAMMA_API_KEY`, `GAMMA_API_URL`  
- `COMFY_API_URL`, `COMFY_API_KEY`

使用方式：
1. 复制 `.env.example` 为 `.env.local`  
2. 按实际环境填值  
3. 不要把 `.env.local` 提交到仓库（保留模板 `.env.example` 即可）

如果你要，我可以下一步帮你把每个变量映射到具体代码文件位置（例如在哪个 route/job/client 读取）。