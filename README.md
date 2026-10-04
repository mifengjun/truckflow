# truckflow

跨境电商尾程卡车派送（卡派）知识库与工具项目。

## 文档

- [系统需求文档](./docs/系统需求文档.md) — 产品范围、角色权限、业务流程、功能需求、验收要求与待确认事项。
- [交互原型设计](./docs/superpowers/specs/2026-10-04-prototype-design.md) — 页面结构、核心流程、线框布局、组件规范与异常状态。
- [卡派知识大全](./docs/卡派知识大全.md) — 涵盖美国卡派（FTL/LTL、Freight Class、费用构成、操作流程）与欧洲卡派（车型、全链路、适配方案）的完整知识体系。
- [技术架构设计](./docs/superpowers/specs/2026-10-04-technical-architecture-design.md) — Vercel + Supabase 部署、开发技术组合与业务边界。

## 可点击交互原型

在根目录运行 `pnpm install` 和 `pnpm dev`，打开 [原型页面索引](http://127.0.0.1:3000/prototype/index)。

新原型使用 Next.js、React、TypeScript、Tailwind、shadcn 风格基础组件，覆盖客户询价下单和后台处理，其他模块提供结构与状态。数据仅保存在当前浏览器，可从评审栏重置。

- [原型评审与开发交接](docs/原型评审与开发交接.md)
- 验证：`pnpm lint`、`pnpm typecheck`、`pnpm test --run`、`pnpm build`
- 浏览器测试：`pnpm test:e2e`（本地需安装 Playwright 浏览器）
- 原始静态 HTML 保留在根目录及 `truck-dispatch/`；Vercel 的新应用 Root Directory 应设置为仓库根目录。
