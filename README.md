# truckflow

跨境电商尾程卡车派送（卡派）知识库与工具项目。

## 文档

- [首版开发规格](./docs/首版开发规格.md) — 已确认的首发范围、人工报价/下单、预付规则、数据模型、权限、状态与接口。
- [正式系统第一阶段实施计划](./docs/superpowers/plans/2026-10-04-production-foundation.md) — 登录、客户隔离、客户与地址持久化的分步任务。
- [开发环境接入](./docs/开发环境接入.md) — 独立 Supabase 测试项目与环境变量准备；已接入指定开发项目的 Auth、数据库和私有文件存储。

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


## 正式业务开发版本

配置 `.env.local` 后运行 `pnpm dev`，打开 [登录](http://127.0.0.1:3000/login)。首次管理员由 `node scripts/bootstrap-admin.mjs <邮箱>` 邀请；客户公司及邀请在管理后台操作。

已实现美国 LTL 人工报价/下单和预付闭环：客户询价 → 运营录入及发布报价 → 客户上传线下充值凭证 → 财务核验入账 → 客户确认订单冻结运费 → 运营记录接单扣款/拒单解冻/结果未知保持冻结 → 更新运输进度及上传单据。

- 正式数据通过 `/api/v1`、受限数据库角色和服务层权限访问；`/prototype` 保留为独立示例原型。
- [完整流程实施计划](docs/superpowers/plans/2026-10-04-manual-prepaid-flow.md)
- [正式系统开发验收](docs/正式系统开发验收.md)
- `pnpm test:integration` 需开发项目配置及运行中的本地服务；使用隔离测试资料并清理，不应对生产项目执行。
- 本轮没有部署至 Vercel。生产域名、SMTP、Auth 注册与回调设置、网络可达性和运营制度仍需上线前验收。
