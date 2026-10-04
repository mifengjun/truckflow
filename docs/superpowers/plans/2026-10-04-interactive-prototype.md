# Truckflow Interactive Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 制作全系统页面结构与客户询价下单、后台订单处理两个可点击高保真流程，交付视觉规范、状态矩阵和可执行验收路径。

**Architecture:** 在当前仓库建立 Next.js 应用，所有演示页面位于 `/prototype`，通过独立 mock adapter 和带版本号的本地存储提供可恢复、可重置的示例数据。页面与共享组件使用已选 React/shadcn 技术，原型状态逻辑集中在 `src/modules/prototype`；正式 Supabase、认证及资金业务不在本轮实现。

**Tech Stack:** Next.js App Router、React、TypeScript、shadcn/ui、Tailwind CSS、Lucide、TanStack Table / Query、React Hook Form、Zod、Vitest、Playwright、pnpm。依赖使用安装时兼容的稳定版本，提交锁文件。

**Spec:** [交互原型设计](../specs/2026-10-04-prototype-design.md)

## Global Constraints

- 全系统页面结构，加客户询价至订单详情、管理人员处理订单两个核心高保真流程；资金与售后先做结构和状态设计。
- 原型采用独立 `/prototype` 入口，持续显示“交互原型 · 示例数据”，不索取真实账户信息。
- 保留现有三份 HTML 原型与业务文档，不连接生产 Supabase、承运商、支付或通知服务。
- API 及资金规则尚未确定的部分按场景标注；本轮不实现真实扣款、真实身份隔离或数据库。
- 主色 #2454C6；背景 #F5F7FA；正文 #182230；次要文字 #526071；成功 #18734A；待处理 #925C0A；错误 #B42318。
- 使用系统中文字体，SVG 图标，金额带币种及 tabular-nums；不加载 Google Fonts。
- 评审工具与业务页面分开；状态切换与重置只作用于示例数据。
- 桌面评审尺寸 1440px 和 1280px；移动端 390px；语义化标签、键盘操作、可见焦点和减少动态效果支持。
- 稳定版本在安装时确认并记录；根目录构建设置与原有 truck-dispatch/vercel.json 的静态原型设置区分。

## Review Focus

- 长地址和多行商品：完整值可阅读，390px 页面无非预期横向溢出。任务 2、5 检查。
- 刷新及返回：草稿和演示订单保留；筛选随 URL 恢复；存储数据损坏能恢复示例初始状态。任务 1、3 检查。
- 重复提交和超时：一次意图只产生一个示例订单，待确认可恢复为接单，不重新创建。任务 1、3 检查。
- 状态切换与旧报价：修改询价使旧报价失效，过期或不可用报价不能提交。任务 1、2 检查。
- 键盘和结构页：弹层可关闭且恢复焦点；未实现功能不能伪报成功。任务 4、5 检查。

## 文件与接口约定

```text
src/app/layout.tsx, globals.css           应用外壳和主题
src/app/page.tsx                         跳转原型入口
src/app/prototype/[[...path]]/page.tsx     原型路由入口
src/components/ui/                      shadcn 基础组件
src/components/prototype/               AppShell、ReviewToolbar、共享展示组件
src/modules/prototype/model.ts           类型、种子数据和纯状态操作
src/modules/prototype/storage.ts         本地存储版本和恢复
src/modules/prototype/provider.tsx       原型状态、QueryClient
src/modules/prototype/mock-adapter.ts    示例异步报价与提交结果
src/modules/prototype/pages/             inquiry、quotes、confirm、orders、detail、structure
src/modules/prototype/catalog.ts         页面索引、场景、关联需求与注释
tests/prototype/model.test.ts            纯逻辑与异常输入
tests/prototype/storage.test.ts          持久化和恢复
tests/e2e/prototype.spec.ts              核心浏览器流程
docs/原型评审与开发交接.md                 页面映射、状态、验收路径和限制
DESIGN.md                               最终验证后的视觉与组件规范
```

`PrototypeState` 包含草稿、当前报价、示例订单和操作记录；资金示例单独只读。所有数据明确属于演示环境。

`InquiryDraft` 包含客户、运输方式、起终点、提货日期、商品、包装和附加服务；每次修改增加 `revision`。`Quote` 记录 `draftRevision`、`expiresAt`、`amountMinor`、`currency` 和承运商。原型金额使用整数最小币种单位避免演示计算误差，正式系统仍遵循架构文档的精确十进制策略。

`PrototypeOrder` 保存草稿和报价快照、创建意图 `intentId`、下单状态、履约状态、事件和附件状态。初始示例采用固定的 2026 年日期，页面明确时区；报价有效期相对演示运行时间计算。

## Task 1 应用外壳与可恢复的演示状态

**Files:** 新建 package.json、pnpm-lock.yaml、Next/TS/ESLint/Vitest 配置、src/app/*、model.ts、storage.ts、provider.tsx、mock-adapter.ts、AppShell.tsx、ReviewToolbar.tsx、model.test.ts、storage.test.ts；更新 .gitignore。

**Interfaces:** `createInitialState(): PrototypeState`；`submitOrder(state, quoteId, intentId, now): PrototypeState`；`updateOrderResult(state, orderId, result): PrototypeState`；`loadState(raw: string | null): PrototypeState`。原型状态由 provider 对外提供，持久化 key 固定为 `truckflow.prototype.v1`。

- [x] 设置兼容稳定依赖和 `dev`、`build`、`lint`、`typecheck`、`test`、`test:e2e` 脚本，记录实际版本；安装所需 shadcn 组件。
- [x] 编写失败测试：同一 `intentId` 提交两次后订单仅增加一条；订单快照不受草稿修改影响；过期或 revision 不匹配的报价被拒绝；超时恢复不新建订单；损坏的 JSON 恢复初始状态。
- [x] 运行 `pnpm test --run`，确认新测试因待实现函数或行为失败。
- [x] 实现上述状态操作与 mock adapter；状态变更不执行外部写操作。
- [x] 实现客户/后台外壳与单独评审栏，支持角色、页面索引、场景和数据重置；URL 区分客户与后台。
- [x] 运行单元测试和 `pnpm typecheck`，确认通过；启动页面检查无客户端初始化错误。
- [x] 提交本任务变更。

## Task 2 客户询价与报价比较

**Files:** pages/inquiry.tsx、quotes.tsx、confirm.tsx、components/prototype/AddressSummary.tsx、FormField.tsx、QuoteComparison.tsx；扩充 model.test.ts 与 prototype.spec.ts。

**Interfaces:** 使用 `InquiryDraft`、`Quote` 和 provider 的 `updateDraft(patch)`、`requestQuotes(scenario)`；页面不直接写存储。确认页通过任务 1 的 `submitOrder` 完成创建。

- [x] 添加校验测试：缺少收货地址、非正数量、非法重量不通过；修改草稿 revision 后原报价不可提交；报价总价与整数费用项合计一致。
- [x] 运行目标测试确认失败，再实现 Zod schema、RHF 分步表单、动态商品行和附加服务。
- [x] 实现收发货、货物与服务、报价比较和独立确认页；摘要实时更新，返回保留输入，离开未保存修改有明确处理方式。
- [x] 报价提供完整、部分失败、无报价、网络失败和过期场景；费用行内展开，仅可用报价有下单入口。
- [x] 添加浏览器路径：修改一条长地址、添加第二种商品、返回再进入、获取报价并到确认页，核对实际输入而非种子默认值。
- [x] 运行 `pnpm test --run` 与相关浏览器路径，确认字段错误和关键流程通过。
- [x] 提交本任务变更。

## Task 3 客户订单与后台处理

**Files:** pages/orders.tsx、detail.tsx、components/prototype/DataTable.tsx、OrderStatus.tsx、AttachmentList.tsx；扩充 model.test.ts 与 prototype.spec.ts。

**Interfaces:** 使用 `PrototypeOrder`、`updateOrderResult`；列表过滤项通过 URL 编码，进入详情前记录返回目标；操作日志在原型状态中保存。

- [x] 编写失败测试：重复确认不产生重复单；待确认订单恢复为已接单时保留 ID、快照和历史；过滤、返回与刷新后示例订单仍存在。
- [x] 实现 TanStack Table 订单列表、状态筛选、搜索和分页；金额和日期统一格式化。
- [x] 实现订单详情的进度、资料、费用与附件；下单结果和履约状态分开，附件待生成时不模拟下载成功。
- [x] 实现后台工作台、客户标识、资料核对和操作记录；模拟提交承运商支持成功、失败、超时与结果确认分支。
- [x] 浏览器验证从客户创建订单切换到后台处理同一订单，再切回客户查看新状态；刷新后验证仍保留。
- [x] 运行本任务目标测试、`pnpm typecheck`，通过后提交。

## Task 4 全系统结构页与状态索引

**Files:** catalog.ts、pages/structure.tsx、通用登录示例页、docs/原型评审与开发交接.md、README.md。

**Interfaces:** `PageSpec` 包含页面 ID、路径、名称、角色、保真范围、关联需求、可见状态和待确认事项；`catalog` 为页面索引及导航的唯一清单。

- [x] 根据设计稿建立通用、客户和后台全部页面的目录；每个目录项能进入实际可读页面。
- [x] 实现登录/找回密码示例、询价记录、地址、客户成员、仓库、承运商、资金账单、结算、工单和报表结构；页面展示范围标签与相关未决规则。
- [x] 为资金和工单展示申请待核验、到账、失败、待处理、处理中、已完结等状态；结构范围外的提交明确说明，不显示业务成功。
- [x] 评审栏暴露空、加载、错误、无权限、长文本和关键业务异常场景；场景切换不覆盖已录入草稿。
- [x] 验证所有导航、返回、弹层关闭与键盘焦点恢复；检查目录无空白路由。
- [x] 写交接文档：页面与需求对应、组件映射、验收路径、待确认规则及模拟能力边界；提交。

## Task 5 视觉与行为验收

**Files:** tests/e2e/prototype.spec.ts、DESIGN.md、原型交接文档；截图保存至 .impeccable/review/。

**Interfaces:** 使用 Task 4 的 catalog 遍历页面；以已确认设计稿及核心浏览器流程为验收依据。

- [x] 运行 `pnpm lint`、`pnpm typecheck`、`pnpm test --run`、`pnpm build`；仅修复与本次原型相关的问题。
- [x] 浏览器验证核心流程、错误恢复、查询参数、刷新、对话框键盘操作；记录结果和范围。遵守运行环境的浏览器控制限制，必要时使用 CUA 执行同等步骤。
- [x] 一轮集中检查 1440px、1280px、390px 的列表、询价与详情，包含长地址；保存并查看截图，核对对比度、间距、控件、焦点和溢出。
- [x] 将发现的问题一次修复，并最多做一轮确认；避免无目标反复打磨。
- [x] 按 Impeccable 进行独立收尾审阅；提供设计稿、截图及测试证据，若工具加载器不可用在交接中说明；根据审阅结论修复必要问题。
- [x] 记录最终 DESIGN.md、组件规范和已知限制；仅把实际验证通过的行为标为完成。
- [x] 在 Codex 中打开原型供用户点击，保留可运行入口，提交实现；不自动发布到生产。

## 计划自审

设计稿的全系统结构对应任务 4，客户询价对应任务 2，订单和后台操作对应任务 3，共享组件和示例状态对应任务 1，响应式与交接对应任务 5。五类 Review Focus 均有明确负责的任务和验证路径。

本计划范围仅为交互原型，没有把未决资金政策、真实认证、数据库或承运商接口伪装为已实现功能。

## 执行方式

用户已批准当前会话顺序实现；五项任务已完成，验证范围与必要实现调整记录于《原型评审与开发交接》。
