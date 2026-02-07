# TODO - 研学行程生成器 MVP

> 最后更新: 2026-02-07

## MVP 定义

本系统是一个 AI 驱动的研学行程规划平台，支持：
- 上传研学资料（PDF/DOCX/TXT/图片），自动构建向量知识库
- 基于知识库生成个性化研学行程
- 生成配套商品设计（马克杯、手机壳、T恤）
- 导出行程为 PDF/PPTX 演示文稿

---

## 🟢 已完成功能

### 1. 基础架构
- [x] Next.js 16 + App Router 项目搭建
- [x] Supabase 集成（认证、数据库、存储）
- [x] Inngest 任务队列集成
- [x] shadcn/ui 组件库配置
- [x] 深色模式支持

### 2. 数据库架构（4 个迁移文件）
- [x] 用户表 (auth.users) + 配额管理
- [x] 作业表 (jobs) - 统一任务状态追踪
- [x] 行程表 (itineraries) - 研学行程
- [x] 知识文件表 (knowledge_files) + 知识块表 (knowledge_chunks)
- [x] 知识包表 (knowledge_packs) - 文件集合
- [x] 商品设计表 (merch_designs) - 商品生成记录
- [x] Artifacts 表 (artifacts) - 统一导出管理
- [x] RLS 安全策略配置
- [x] pgvector 向量搜索函数

### 3. 认证与授权
- [x] Supabase Auth 集成
- [x] 用户会话管理
- [x] RLS 多租户隔离

### 4. 知识库模块
- [x] 文件上传 API (`/api/knowledge/upload`)
- [x] 支持 PDF/DOCX/TXT/图片 文本提取（含 OCR）
- [x] 文本提取与分块策略（1000 字符，150 重叠）
- [x] 向量嵌入提供者（Stub/OpenAI）
- [x] 知识包 CRUD API
- [x] RAG 语义搜索 API (`/api/knowledge/search`)
- [x] Inngest 异步索引任务

### 5. 行程生成模块
- [x] 行程创建 API (`/api/itineraries/create`)
- [x] RAG 知识检索集成
- [x] 智谱清言（GLM）LLM 集成
- [x] 行程内容 Prompt 工程
- [x] Gamma API 客户端集成
- [x] 演示文稿创建与 PDF/PPTX 导出
- [x] Artifacts 表导出管理
- [x] 行程状态查询 API

### 6. 商品设计模块
- [x] 商品生成 API (`/api/merch/generate`)
- [x] 支持 马克杯/手机壳/T-shirt
- [x] 主题关键词 + 色调配置
- [x] ComfyUI HTTP 客户端实现
- [x] 图案生成工作流（含行程主题元素）
- [x] 效果图合成工作流
- [x] 行程上下文集成
- [x] 商品状态查询 API
- [x] ProductAdapter 接口（可扩展）

### 7. 任务管理
- [x] 作业仓库 (JobRepository)
- [x] 进度追踪 (0-100%)
- [x] 日志记录 (info/warning/error)
- [x] 任务状态 API
- [x] JobStatusCard 实时进度组件
- [x] 幂等性支持（idempotency keys）

### 8. 配额管理
- [x] 配额检查中间件
- [x] 配额计数器（Stub 实现）

### 9. UI 页面与组件
- [x] 行程管理页面 (`/itinerary`) - 完整表单、结果预览
- [x] 知识库页面 (`/knowledge`) - 拖拽上传、知识包管理
- [x] 商品设计页面 (`/merch`) - 多步向导、实时状态
- [x] 导出页面 (`/exports`)
- [x] 设置页面 (`/settings`)
- [x] 响应式布局（移动端/桌面端）
- [x] 文件上传组件（拖拽上传）
- [x] 知识包选择器
- [x] 行程生成表单
- [x] 商品设计向导
- [x] 实时进度显示 (JobStatusCard)
- [x] 结果预览组件

### 10. 存储集成
- [x] Supabase Storage 配置
- [x] 文件上传实现
- [x] 签名 URL 生成
- [x] 存储桶配置 (KNOWLEDGE, MERCH, EXPORTS)

---

## 🟡 进行中 / 待完成

### 1. 向量嵌入优化 (低优先级)
- [x] OpenAI embeddings 集成
- [ ] 嵌入向量缓存
- [ ] 多语言嵌入支持

### 2. LLM 扩展 (低优先级)
- [ ] Claude API 集成
- [x] 流式响应支持（GLM SDK 已支持）
- [x] 多 LLM 提供者切换（统一 Provider 接口）

### 3. 商品设计增强 (低优先级)
- [ ] 更多产品类型（帽子、帆布袋等）
- [ ] 效果图实时预览
- [ ] 电商集成（Printify, Shopify）

### 4. 支付集成 (低优先级)
- [ ] Stripe 支付
- [ ] 配额购买
- [ ] Webhook 处理

### 5. 导出功能增强 (低优先级)
- [ ] DOCX 生成（使用 docx 库）
- [ ] 批量导出
- [ ] 自定义导出模板

### 6. 通知系统 (低优先级)
- [ ] 邮件通知（Resend）
- [ ] 浏览器推送
- [ ] 任务完成提醒

---

## 🔴 技术债务

### 类型安全
- [x] 添加 Merchandise 相关类型
- [x] 添加 Gamma 相关类型
- [ ] Supabase 类型生成改进
- [ ] 减少 `as any` 类型断言
- [ ] 添加 API 响应类型

### 错误处理
- [ ] 统一错误处理中间件
- [ ] 用户友好错误消息
- [ ] 错误监控集成（Sentry）

### 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试

### 性能优化
- [ ] 嵌入向量缓存
- [ ] 文件上传限流
- [ ] 数据库查询优化
- [ ] Next.js ISR 策略

---

## 📋 MVP 完成标准

以下功能完成后即达到 MVP 标准：

1. ✅ 用户可以注册/登录
2. ✅ 用户可以上传 PDF/DOCX/TXT/图片 并自动索引
3. ✅ 用户可以创建知识包（文件集合）
4. ✅ 系统可以基于知识库生成研学行程
5. ✅ 用户可以预览和下载行程 PDF/PPTX
6. ✅ 用户可以生成并预览商品设计
7. ✅ 系统有完整的任务进度反馈

**当前 MVP 进度: ~90%**

---

## 🚀 下一步计划

1. **优化**: 完善错误处理和用户反馈
2. **测试**: 添加集成测试和 E2E 测试
3. **部署**: 准备生产环境配置
4. **监控**: 添加错误监控和日志分析
5. **文档**: 完善 API 文档和部署指南
