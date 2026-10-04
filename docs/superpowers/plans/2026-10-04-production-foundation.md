# 正式系统第一阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立真实登录、成员归属、客户隔离及客户/地址持久化，为人工报价与预付订单提供可验证基础。

**Architecture:** 沿用单个 Next.js 应用，正式页面独立于 `/prototype`，复用当前视觉与基础组件。Supabase Auth 验证身份，服务端从数据库解析授权，Drizzle 访问非公开业务 schema；SQL 迁移是唯一历史。

**Tech Stack:** Vercel、Supabase、Next.js App Router、React、TypeScript、shadcn/ui、Tailwind、Drizzle、Postgres.js、Zod、Vitest、Playwright、pnpm。

**Spec:** `docs/首版开发规格.md`（以此为首版范围/状态/权限的依据）。

## Global Constraints

- 首版美国 LTL、中文、USD/lb/in；管理员邀请、人工审核、人工报价与下单。
- 预付：提交冻结、接单扣款、明确拒单解冻、未知结果保持冻结；线下充值核验后入账。最小资金模块在阶段二实施，未验收前不开放真实下单。
- 阶段一不从 localStorage 迁移演示业务，不把演示角色切换作为登录。
- 本阶段在当前工作会话顺序实施；现有原型分支不是 main；开始代码实现前选择独立正式开发分支并保留既有改动。
- 本地 Next.js 已安装版本指南是实现依据；会话验证、密钥与数据库只在服务端处理。
- 所有新业务迁移位于 `supabase/migrations`，运行时不得建表；测试数据库与生产隔离。
- 不引入自动承运商 worker、支付供应商、月结和未确认的资金调整规则。

## Review Focus

- 客户 A 请求客户 B 的地址、列表、导出或详情：不可读取或改变数据；Task 4 数据库+HTTP 测试。
- 停用成员持有旧会话：业务服务读取当前身份状态并拒绝；Task 3 测试。
- Auth 已建立用户但邀请保存失败：记录待恢复状态，不把重复邀请变成跨客户身份迁移；Task 3 测试。
- 登录/刷新响应被共享缓存：无共享缓存，刷新 Cookie 不丢失；Task 3 浏览器与响应测试。
- 连接复用、并行事务和回滚：不发生客户上下文串用或提交部分结果；Task 2 真实数据库测试。

---

## 文件职责

`src/infrastructure/config.ts` 读取并校验配置；`database/client.ts` 连接，`database/schema.ts` 定义本阶段表；`auth/server.ts` Cookie 客户端，`auth/session.ts` 验证身份，`auth/authorization.ts` 操作权限；`src/contracts/http.ts` 定义错误格式。`modules/customers` 与 `modules/addresses` 分别承载 service/repository/contracts。Route Handlers 只校验请求、调用服务并映射响应。

测试独立为 `tests/unit`、`tests/integration`、`tests/e2e/production-foundation.spec.ts`；原型测试不改业务断言。测试脚本必须实际包含新增目录，不能出现“写了但没有执行”的测试。

### Task 1: 配置与测试入口

**Files:** Create `.env.example`、`docs/开发环境接入.md`、`src/infrastructure/config.ts`、`tests/unit/config.test.ts`; Modify `.gitignore`、`vitest.config.ts`、`package.json`。

**Interfaces:** Consumes 环境变量；Produces `getServerConfig(): ServerConfig`（Supabase URL、Publishable Key、服务端 Auth 管理 Key、运行时数据库 URI、APP_ORIGIN；敏感值禁止序列化），`getMigrationConfig(): {databaseUrl:string}`。

- [x] 提供无凭据的配置模板，并忽略 `.env.local` 与其他实际环境文件。
- [ ] 写测试：缺运行配置抛出 `CONFIGURATION_REQUIRED`，错误只列变量名；migration 使用 `MIGRATION_DATABASE_URL` 而非运行账号；非 http(s) Origin 与非数据库 URI 拒绝。
- [ ] Run `pnpm exec vitest run tests/unit/config.test.ts`，预期缺实现失败；先调整 include 使测试被执行。
- [ ] 实现配置函数；按需加载，原型与 build 不要求存在真实数据库连接；安装后续确需依赖并提交锁文件。
- [ ] Run 同一测试，预期全通过；`git check-ignore .env.local .env.production` 均命中，`.env.example` 不命中。
- [ ] 本任务代码与配置独立提交，不包含设计实验。

### Task 2: 数据库基础与客户归属

**Files:** Create `supabase/migrations/202610040001_foundation.sql`、`src/infrastructure/database/client.ts`、`schema.ts`、`tests/integration/foundation.test.ts`、`tests/integration/database-connection.test.ts`、`vitest.integration.config.ts`。

**Interfaces:** Consumes Task 1 配置；Produces `getDatabase(): FoundationDatabase`、`withTransaction<T>(callback:(tx:FoundationTransaction)=>Promise<T>):Promise<T>`；schema 表见规格第 5 节阶段一部分，含 `invitations`（身份、客户、状态、Auth 用户引用、错误/重试记录）。

- [ ] 在独立测试项目写数据库测试：私有地址 customer_id 不为空，public 不属于客户；角色/授权组合唯一；匿名及 Authenticated Data API 无业务表访问；事务出错全部回滚。
- [ ] 应用迁移前运行测试，预期缺 schema 失败；不得在共享生产库跑破坏性测试。
- [ ] 建 `app` schema、阶段一表、外键、索引、grants、RLS 默认拒绝。单独 runtime 角色通过受控项目配置创建，不在 SQL 中写密码；不授予角色创建/表创建或 BYPASSRLS。
- [ ] 实现 Drizzle schema/连接/事务；先验证 Session pooler，max=1、TLS 校验证书；记录项目连接预算。迁移用独立管理连接。
- [ ] Run 数据库测试，并发运行两客户查询及事务回滚测试；预期不同客户结果不串用，回滚完整。无测试项目则保留未验证状态，不能标完成。
- [ ] 本任务迁移、schema 与实测说明独立提交。

### Task 3: 真实登录、身份和邀请

**Files:** Create `src/infrastructure/auth/{server,session,authorization,invitations}.ts`、`src/contracts/http.ts`、`src/proxy.ts`、`src/app/login/page.tsx`、`src/app/auth/confirm/route.ts`、`src/app/api/v1/auth/{login,logout}/route.ts`、`src/app/api/v1/me/route.ts`、邀请路由、`tests/unit/authorization.test.ts`、`tests/integration/auth.test.ts`；Modify 入口导航（保持原型可访问）。

**Interfaces:** Consumes database 与 Cookie Supabase 客户端；Produces `requireActor():Promise<Actor>`、`authorize(actor:Actor,permission:Permission,customerId?:string):void`；Actor 含 userId、活跃身份、角色与 server-resolved 范围，禁止从请求 body 构造。

- [ ] 写测试：无效令牌 401；停用 profile/成员拒绝；客户不能指定他人公司或 staff role；管理员不能凭 admin 角色自动执行财务/运营动作；跨来源写请求拒绝；邮件找回统一反馈。
- [ ] Run 单元/集成测试，预期未实现行为失败。
- [ ] 按安装版 Next.js 指南及 Supabase SSR 文档实现 Cookie 刷新、claims 验证与当前归属读取；私有响应 no-store；layout 检查之外 API 仍检查。
- [ ] 实现管理员邀请事务记录与外部 Auth 调用恢复；按 D02 已确认的邀请方式，不提供开放注册；未确认跨公司身份策略时拒绝把已有身份自动迁移到其他公司。
- [ ] 测试 Auth 成功但本地落库失败、重复邀请、已有其他客户用户、非法 redirectTo；预期可查询恢复状态且不改变他人归属。
- [ ] 首个管理员通过受控脚本创建，无默认密码、无公开提权入口；配置测试邮件和 redirect 白名单。
- [ ] Run 测试，预期通过；使用两客户及员工测试账号验证 Cookie 刷新、退出、旧会话停用和跳转；保存实测记录。
- [ ] 本任务独立提交。

### Task 4: 客户和地址服务接入页面

**Files:** Create `src/modules/customers/{contracts,service,repository}.ts`、`src/modules/addresses/{contracts,service,repository}.ts`、`src/app/api/v1/customers/route.ts`、`src/app/api/v1/addresses/route.ts`、对应详情路由、`src/app/portal/addresses/page.tsx`、`src/app/admin/customers/page.tsx`、正式布局组件、`tests/integration/customer-isolation.test.ts`。

**Interfaces:** Consumes Actor、database、authorize；Produces `listAddresses(actor,query)`、`createAddress(actor,input)`、`updateAddress(actor,id,expectedVersion,input)`、`listCustomers(actor,query)`、`createCustomer(actor,input)`；返回规格第 8 节 DTO，不包含敏感配置。

- [ ] 写数据库/HTTP 测试：客户 A 看不到/改不了 B 地址；不能创建 public；员工指定范围不越界；长地址完整保存；分页稳定；expectedVersion 冲突返回 409。
- [ ] Run 测试，预期未实现失败。
- [ ] 实现 Zod 校验、授权 service、带归属条件 repository、审计同事务、API 来源检查；公共资料写入权限独立。
- [ ] 复用当前视觉实现正式列表和编辑表单，提供加载、空、错误、提交锁定；刷新读取数据库，无 prototype provider。
- [ ] Run 测试，预期通过；浏览器验证新增地址后刷新、不同账号查询、越权 URL 与手机编辑。
- [ ] 本任务独立提交。

### Task 5: 阶段验收与后续资金计划

**Files:** Create `tests/e2e/production-foundation.spec.ts`、`docs/正式系统第一阶段验收.md`、第二阶段专项规格/计划；Modify README。

**Interfaces:** Consumes 已完成正式页面/API；Produces 可重复验证的基础系统与人工报价+预付阶段输入。

- [ ] Run `pnpm lint`、`pnpm typecheck`、`pnpm test --run`、独立数据库集成测试、`pnpm build`；预期均通过。原型现有测试保持通过。
- [ ] 写并执行真实登录、成员归属、地址持久化、退出、跨客户访问的浏览器验收；若环境使用 CUA，明确记录等价手动验证，不能声称执行了 Playwright CLI。
- [ ] 配置开发/预览环境，只连接测试项目；通过实际大陆与海外网络记录登录和地址查询成功率/耗时，不提前保证可达性。
- [ ] 完成数据隔离、私有缓存、配置及错误日志复核；记录数据库连接方式实测结果与备份要求。
- [ ] 第一阶段通过后编写第二阶段资金+人工报价事务计划，覆盖重复充值、并发冻结、拒单解冻、unknown 保持冻结、回填接单原子扣款。不得在第一阶段开放真实订单操作。
- [ ] 提交验收记录，完成当前阶段；不自动推送 main 或发布生产。

## 执行状态与依赖

已完成：首版规则、数据/权限/状态/API 规格，配置模板与接入说明。未完成：上述生产代码、迁移执行、真实登录与数据库验收。

外部依赖：独立开发/测试 Supabase 项目与本地 Secret 配置；身份细分角色/跨公司策略在对应功能启用前确认；收款资料和承运商/报价依据在阶段二启用前提供。不能把这些依赖完成前的代码或测试描述为真实可运营系统。


2026-10-04：该阶段并入《人工报价与预付订单完整流程》计划执行。实际结果和与原计划的差异以《正式系统开发验收》及新计划状态为准；保留这里的原始分步核对项，不将未按原顺序执行的步骤标成完成。
