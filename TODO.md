# TODO - 研学行程生成器（最新进度）

> 更新日期: 2026-02-07  
> 说明: 本文件按“代码已落地”为准，构建/联调未完成项保留在待办中

## P0 六项状态（本轮核心）

- [x] 前端去 Mock：`/itinerary`、`/knowledge`、`/exports`、`/settings`、`/` 已接入真实 API（`/` 重定向到 `/itinerary`）
- [x] 打通认证闭环：新增 `/auth/login`、`/auth/register`，并通过 `middleware.ts` 实现全站鉴权
- [x] 修正导出链路一致性：新增 `GET /api/exports` 与 `GET /api/exports/artifacts/[id]/download`，下载统一走 `artifacts`
- [x] 修正商品生成可用性：移除硬编码 `https://storage.yourdomain.com/...`，改为 signed URL 链路
- [ ] 校验并修复迁移脚本可执行性（含策略与触发器）
说明: 已新增 `validate_incremental_migrations.sql` 与 `VALIDATION_REPORT.md`，待在“空库 + 增量库”真实执行并回填报告
- [ ] 关闭 `ignoreBuildErrors` 前，先清理类型错误与 `as any`
说明: `next.config.mjs` 已移除 `ignoreBuildErrors`，`as any/@ts-ignore/: any` 已清零，待 `typecheck/build` 实跑确认

---

## 当前阻塞（优先处理）

- [ ] `npm run build` 全量通过（当前仍有分散的 `unknown`/行类型收窄问题）
- [x] API 路由与 Job 层的 Supabase 返回值类型统一收口（新增 `lib/supabase/database.types.ts` 与 `lib/db/types.ts`）
- [x] `app/jobs/*` 中 Buffer 序列化输入统一走安全归一化函数并补充类型守卫

---

## 已完成的关键改造（阶段 A 基本落地）

- [x] 新增认证页面与登录/注册流程
- [x] 新增全站鉴权中间件（页面重定向 + API 401）
- [x] 新增 API：
  - [x] `POST /api/knowledge/[id]/reindex`
  - [x] `GET /api/exports`
  - [x] `GET /api/exports/artifacts/[id]/download`
  - [x] `GET/PATCH /api/settings`
  - [x] `GET /api/merch/[id]`
- [x] `GET /api/exports/[id]` 保留兼容但已切换为 artifacts 优先读取
- [x] 迁移新增：
  - [x] `005_fix_schema_and_policies.sql`
  - [x] `006_user_bootstrap_and_settings.sql`
  - [x] `007_cleanup_invalid_indexes.sql`
- [x] React 19 兼容性依赖修复（`react-day-picker` 与 `date-fns`）

---

## 工程收口（阶段 B）

- [ ] 全仓类型清理完成并通过 `tsc`/`next build`
- [x] 移除/替代剩余 `@ts-ignore`（embeddings 可选依赖路径已完成）
- [ ] 最小化自动化回归（至少覆盖鉴权、知识索引、行程生成、导出下载、商品生成）
说明: 已新增 `vitest` 基建与 5 个 API 路由测试，待安装依赖后执行 `npm run test:api`
- [x] README 与实际行为最终对齐（接口、鉴权、页面行为、环境变量）

---

## 验收标准（完成定义）

- [ ] 用户可完整跑通：注册/登录 -> 上传知识 -> 建包 -> 生成行程 -> 下载导出 -> 生成商品
- [ ] `npm run lint` 与 `npm run build` 均通过
- [ ] 数据迁移可在空库与已有库执行通过
- [ ] 无 `ignoreBuildErrors` 兜底，构建可稳定产出
