# 研学行程生成器

> 基于 AI 的研学旅行规划平台 | AI-Powered Educational Travel Itinerary Generator

[![MVP Progress](https://img.shields.io/badge/MVP-Progress%3A%2090%25-brightgreen)](./TODO.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

## 功能特性

### 知识库管理
- 上传多种格式文件：**PDF / DOCX / TXT / 图片**
- 自动文本提取（含 **OCR** 图片识别）
- 智能分块与向量嵌入
- **RAG** 语义检索
- 知识包管理（文件集合）

### 智能行程生成
- 基于知识库内容生成个性化研学行程
- **智谱清言 (GLM)** LLM 驱动
- 支持 PDF / **PPTX** 双格式导出
- 行程内容可定制（天数、主题、学习目标）

### 商品设计工作室
- 生成配套研学周边商品
- 支持马克杯、手机壳、T 恤
- **行程主题集成** - 根据目的地生成特色图案
- **ComfyUI** 图像生成
- 多视角效果图预览

### 任务管理
- **Inngest** 异步任务队列
- 实时进度追踪 (0-100%)
- 详细日志记录
- 幂等性支持

## 技术栈

### 前端
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5.7**
- **Tailwind CSS**
- **shadcn/ui** + Radix UI
- **next-themes** (深色模式)

### 后端
- **Next.js API Routes** / Edge Functions
- **Supabase**
  - Authentication
  - Database (PostgreSQL + pgvector)
  - Storage
  - Row Level Security (RLS)
- **Inngest** 任务队列

### AI / ML
| 组件 | 技术 |
|------|------|
| LLM | 智谱清言 (GLM-4) |
| Embeddings | OpenAI / Stub |
| 向量搜索 | pgvector |
| 图像生成 | ComfyUI |
| 演示文稿 | Gamma API |
| OCR | tesseract.js |

## 项目结构

```
travel-planner/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── knowledge/            # 知识库 API
│   │   ├── itineraries/          # 行程 API
│   │   └── merch/                # 商品 API
│   ├── jobs/                     # Inngest 任务函数
│   │   ├── knowledge.ts          # 知识文件索引
│   │   ├── itineraries.ts        # 行程生成
│   │   └── merch.ts              # 商品设计
│   ├── itinerary/page.tsx        # 行程管理页面
│   ├── knowledge/page.tsx        # 知识库页面
│   ├── merch/page.tsx            # 商品设计页面
│   ├── exports/page.tsx          # 导出管理页面
│   └── settings/page.tsx         # 设置页面
├── components/
│   ├── ui/                       # shadcn/ui 组件
│   ├── app-shell.tsx             # 应用导航框架
│   ├── job-status-card.tsx       # 任务进度组件
│   └── ...
├── lib/
│   ├── embeddings/               # 向量嵌入提供者
│   ├── knowledge/                # 知识库工具
│   │   ├── extraction.ts         # 文本提取 (含 OCR)
│   │   ├── chunking.ts           # 文本分块
│   │   └── schemas.ts            # 数据校验
│   ├── rag/                      # RAG 检索
│   ├── llm/                      # LLM 提供者
│   │   ├── provider.ts           # 统一接口
│   │   ├── zhipu.ts              # 智谱清言
│   │   └── prompts.ts            # Prompt 模板
│   ├── comfy/                    # ComfyUI 客户端
│   ├── gamma/                    # Gamma API 客户端
│   ├── merch/                    # 商品设计
│   │   └── adapters.ts           # ProductAdapter 接口
│   ├── queue/                    # Inngest 客户端
│   ├── jobs/                     # 任务仓库
│   ├── storage/                  # 存储工具
│   └── types.ts                  # 类型定义
├── supabase/migrations/           # 数据库迁移
│   ├── 001_initial_schema.sql
│   ├── 002_knowledge_rls.sql
│   ├── 003_artifacts_table.sql
│   └── 004_artifacts_merch.sql
└── public/                       # 静态资源
```

## 快速开始

### 环境要求

- Node.js 18+
- npm / pnpm / yarn

### 1. 克隆项目

```bash
git clone <repository-url>
cd travel-planner
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
INNGEST_API_URL=https://www.inngest.com

# LLM (智谱清言)
ZHIPU_API_KEY=your_zhipu_api_key
LLM_PROVIDER=zhipu  # or 'stub' for development

# Gamma API (演示文稿生成)
GAMMA_API_KEY=your_gamma_api_key
GAMMA_API_URL=https://public-api.gamma.app  # 可选，默认值

# ComfyUI (图像生成)
COMFY_API_URL=your_comfy_api_url
COMFY_API_KEY=your_comfy_api_key

# OpenAI (可选，用于 embeddings)
OPENAI_API_KEY=your_openai_api_key

# 嵌入提供商 (stub | openai)
EMBEDDING_PROVIDER=stub
```

### 4. 数据库设置

#### 4.1 创建 Supabase 项目

访问 [supabase.com](https://supabase.com) 创建新项目。

#### 4.2 启用 pgvector 扩展

在 Supabase SQL 编辑器中运行：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 4.3 运行迁移

按顺序运行迁移文件：

1. `supabase/migrations/001_initial_schema.sql` - 基础表结构
2. `supabase/migrations/002_knowledge_rls.sql` - 知识库与 RLS
3. `supabase/migrations/003_artifacts_table.sql` - 导出文件管理
4. `supabase/migrations/004_artifacts_merch.sql` - 商品设计关联

#### 4.4 创建存储桶

在 Supabase Storage 中创建以下公共存储桶：

| 桶名 | 用途 |
|------|------|
| `knowledge` | 知识文件（PDF/DOCX/TXT/图片）|
| `merch` | 商品设计图片（图案、效果图）|
| `exports` | 导出文件（PDF/PPTX）|

### 5. 运行开发服务器

```bash
npm run dev
```

访问 <http://localhost:3000>

### 6. 构建

```bash
npm run build
npm start
```

## API 端点

### 知识库 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/knowledge/upload` | POST | 上传文件并索引 |
| `/api/knowledge/list` | GET | 列出所有文件 |
| `/api/knowledge/[id]` | GET | 获取文件详情 |
| `/api/knowledge/search` | POST | RAG 语义搜索 |
| `/api/knowledge/packs` | GET/POST | 知识包列表/创建 |
| `/api/knowledge/packs/[id]` | GET/PATCH/DELETE | 知识包操作 |

### 行程 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/itineraries/create` | POST | 创建行程（异步）|
| `/api/itineraries/[id]` | GET | 获取行程详情 |
| `/api/itineraries/status` | POST | 批量查询任务状态 |

### 商品 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/merch/generate` | POST | 生成商品设计（异步）|
| `/api/merch/status` | POST | 批量查询任务状态 |

## 数据库架构

### 核心表

| 表名 | 描述 |
|------|------|
| `users` | 用户配额管理 |
| `jobs` | 统一任务状态追踪 |
| `itineraries` | 研学行程 |
| `knowledge_files` | 知识文件 |
| `knowledge_chunks` | 文本分块（向量）|
| `knowledge_packs` | 知识包（文件集合）|
| `merch_designs` | 商品设计记录 |
| `artifacts` | 导出文件统一管理 |

### 安全策略

- 所有表启用 **Row Level Security (RLS)**
- 用户只能访问自己的数据
- 服务端操作使用 `service_role` 密钥

## MVP 完成标准

| 功能 | 状态 |
|------|------|
| 用户注册/登录 | ✅ |
| 上传文件并自动索引 | ✅ |
| 创建知识包 | ✅ |
| 生成研学行程 | ✅ |
| 导出 PDF/PPTX | ✅ |
| 生成商品设计 | ✅ |
| 任务进度反馈 | ✅ |

**当前进度: ~90%**

详见 [TODO.md](./TODO.md) 获取完整功能列表和开发计划。

## 开发指南

### 添加新的 LLM 提供者

1. 在 `lib/llm/` 创建新的提供者类
2. 实现 `LLMProvider` 接口
3. 在 `lib/llm/index.ts` 导出

### 添加新的产品类型

1. 更新 `lib/merch/adapters.ts` 中的 `ProductSpec`
2. 添加打印区域配置到 `DEFAULT_PRINT_AREAS`
3. 更新 `lib/comfy/client.ts` 的工作流

### 运行 Inngest Dev

```bash
npx inngest-cli dev
```

## 许可证

MIT
