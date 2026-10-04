# Truckflow 技术架构设计

日期：2026-10-04

状态：首版人工报价与预付订单闭环已实现；正式 UI 已接入 shadcn/ui 基础组件。本文区分已实现架构与后续目标，上线准备尚未完成。

## 1. 目标与现状

系统供一家物流公司运营，多个客户公司使用。客户主要在中国大陆，管理人员在海外。目标是将现有静态卡派原型逐步变成具有真实身份认证、客户数据隔离和持久化能力的业务系统。

现有 Next.js 交互原型使用浏览器 localStorage 示例数据，登录仅切换角色；三份旧 HTML 保留。正式开发版本已接入 Auth、私有数据库和文件存储，并实现人工报价与预付订单闭环；验收见[正式系统开发验收](../../正式系统开发验收.md)。最新业务规则见[首版开发规格](../../首版开发规格.md)：人工报价/下单、人工审核、预付冻结与接单扣款、线下充值核验。API 队列自动提交属于后续扩展。

## 2. 已确认的技术组合

| 用途       | 选择                                                                                                            | 实施状态 |
| ---------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| 部署       | Vercel + Supabase 目标已确认；已部署 Vercel 验收环境，固定地址 https://truckflow-neo.vercel.app                                         |
| 应用       | Next.js App Router + React + TypeScript 已实现                                                                  |
| UI         | shadcn/ui + Tailwind CSS 本次接入官方组件；保留已确认主题，详见第 11 节                                         |
| 表格       | TanStack Table 依赖已安装，正式表格使用 shadcn Table；TanStack 数据表引擎待接入                                 |
| 表单       | React Hook Form + Zod 询价使用 RHF，服务勾选使用 Controller；Zod 客户端/服务端校验；其他表单仍使用 FormData     |
| 客户端请求 | TanStack Query 已实现                                                                                           |
| 数据访问   | Drizzle ORM + Postgres.js 已实现，开发连接为 Session pooler                                                     |
| 身份与文件 | Supabase Auth + Storage 已实现；生产 SMTP 和投递验收待配置                                                      |
| 后台任务   | Supabase Queues + Cron + Edge Functions 后续目标；当前人工处理，不写入队列，无 Cron/Edge worker                 |
| 测试       | Vitest + Playwright Vitest 单元与数据库集成已执行；本次新增正式控件 Playwright 回归；不等同于完整生产端到端覆盖 |
| 包管理     | pnpm 已实现，提交 pnpm 锁文件                                                                                   |

实施时选择兼容的稳定版本并提交锁文件，不在本文固定未经验证的版本号。

## 3. 应用与部署边界

第一版使用一个 Next.js 应用：`/portal` 为客户门户，`/admin` 为管理后台，`/api/v1` 为业务接口。二者使用独立布局，共享组件与业务接口；需要独立发布时再拆分应用。

Next.js API 使用 Vercel Node.js 运行时。Supabase 当前承载 PostgreSQL、认证与私有文件；持久化队列任务为后续自动承运商集成目标。客户浏览器通过同源业务 API 操作业务数据，登录和会话也经由应用入口处理。

海外管理人员和大陆客户访问同一套业务后端及主数据库。当前已接入的 Supabase 项目位于首尔（ap-northeast-2），最初的新加坡候选尚未采用；Vercel 函数执行区域已配置为首尔（icn1），验收部署已核验；构建机器区域与函数运行区域不同。上线前从实际客户的不同运营商网络验证登录、查询、下单与文件传输，再确定区域和访问入口。使用 Vercel 不代表大陆访问质量已经得到验证。

## 4. 代码组织

当前实际目录：

```text
src/
  app/
    portal/                 # 客户页面
    admin/                  # 管理页面
    api/v1/[[...path]]/      # 集中 HTTP 路由
  modules/
    business/               # 按文件拆分 customers/addresses/inquiries/orders/finance/files/invitations
      contracts.ts          # 当前 Zod 契约
      rules.ts              # 不依赖数据库的规则
    prototype/              # 独立 localStorage 原型
  components/
    ui/                     # shadcn 官方基础组件及项目主题扩展
    business/               # 正式页面、共享控件及查询封装
    prototype/              # 原型组件
  infrastructure/
    database/               # Drizzle schema 与 Postgres.js 连接
    auth/                   # Supabase 会话及权限上下文
    config.ts
supabase/
  migrations/               # 唯一迁移历史；当前无 functions worker
scripts/                    # 开发环境接入与受保护的临时验收数据工具
tests/
  unit/
  prototype/
  integration/
  e2e/
```

原先的独立 `customers/quotations/orders/billing/claims` 模块目录及根 `contracts/` 是后续组织目标。当前保留一个 `modules/business` 目录，每个业务域一个服务文件；存储适配暂在 `files.ts`，尚未建立 `infrastructure/storage` 或承运商适配层。后续模块增长时再逐域拆分，不能把示意目录认定为已实现。

模块内部按需划分服务、规则和数据接口，不为尚未实现的模块生成占位代码。跨运行时复用的业务规则保持为不依赖 Next.js、Node.js 专用 API 的 TypeScript；Edge Functions 的执行入口和依赖单独验证。

依赖方向为：页面或 HTTP 入口 → 业务服务 → 数据访问及外部服务适配。页面不持有数据库凭据，HTTP 入口不直接堆积订单与资金规则。

## 5. Agent 开发与 UI 规范

以下为共享业务组件目标；当前已具备 Field、Status、Table、Pager、ErrorNotice 等封装，并已接入 shadcn 基础控件。MoneyInput、独立 AddressForm、完整 DataTable 和统一 ConfirmDialog 尚未全部形成。Agent 后续开发业务页面优先复用：

- `DataTable`：分页、排序、筛选、加载、错误、空状态。
- `MoneyInput`：金额输入、币种与精度校验。
- `AddressForm`：地址字段和校验。
- `StatusBadge`：状态文字、颜色和映射。
- `ConfirmDialog`：重要操作的确认与提交状态。

主题集中管理颜色、间距、字体和圆角。复杂业务组件根据真实使用场景抽取，避免提前设计大量通用接口。交互必须支持键盘操作，表单错误可定位，异步请求具有清晰的反馈。

## 6. API、认证与数据隔离

业务 API 提供明确的请求、响应和错误码，使用 Zod 做运行时校验。客户端的 TanStack Query 管理交互列表与请求状态，不保存可修改的权威订单或余额副本。敏感及实时业务响应显式禁止共享缓存。

服务端组件如需加载数据，调用相同的、带权限检查的业务服务，避免绕回本应用 HTTP 接口。主要业务写操作统一由 API 调用业务服务执行。

Supabase Auth 负责身份，应用的用户资料、客户成员关系及员工角色负责权限。一个客户可拥有多个登录用户。客户端提供的 `customer_id` 不作为授权依据，服务端通过已验证的身份解析成员关系；员工操作同样检查角色和访问范围。

通过官方服务端认证集成管理会话，状态修改接口校验请求来源以防跨站请求伪造。数据库 grants 与 RLS 明确配置；使用绕过 RLS 的凭据时，服务端必须执行独立授权检查。数据库与服务端密钥只保存在平台服务端环境中。

## 7. 数据访问与迁移

Drizzle + Postgres.js 执行查询和事务。当前开发运行时使用 Supabase Session pooler（5432），`max:1`、`prepare:false`、严格 CA/TLS；尚未在 Vercel 实际并发下验证连接预算。生产连接方式不能直接沿用最初 transaction pooler 的假设。迁移使用适合迁移工具的连接，在受控发布流程中执行。

2026-10-04 核对补充：Supabase 官方 Postgres.js 指南提示 shared transaction pooler 与 pipelining 存在兼容风险。连接方式须按[首版开发规格](../../首版开发规格.md)第 6 节验证；不能仅凭 `prepare:false` 认定兼容。初期测试 Session pooler 和连接预算，再确定生产方式。

`supabase/migrations` 是唯一迁移历史，包含表结构、索引、约束、RLS 和数据库函数。Drizzle 的类型化表定义与 SQL 保持一致，变更时一起审查；不维护第二套独立迁移流水。

关系以外键和唯一约束表达，关键列表按客户、状态和时间设计索引。金额使用精确十进制类型并记录币种，服务端用十进制运算，接口使用金额字符串。时间存为带时区的时间戳，按用户地区展示。

## 8. 订单、资金和后台任务

当前首版创建订单时，在同一数据库事务中检查报价与余额、保存订单与价格地址快照、冻结资金并写入流水及审计记录；不写队列任务，也不调用承运商网络接口。运营人工提交承运商并回填结果。

以下任务消费者、自动查询恢复和回调处理为后续承运商 API 接入目标，当前没有实现：

后台函数分批领取任务，调用承运商后保存结果并确认任务完成。任务保存尝试次数、重试时间和失败原因，超过重试策略后进入人工处理。消费者按至少一次执行设计，业务操作使用唯一标识和数据库约束避免重复。

承运商超时进入待确认状态，通过查询结果恢复，不能直接视为下单失败后重新创建。轨迹与回调保存原始事件和处理状态，重复回调不会重复推进业务操作。

当前资金流水已实现充值、冻结、扣款和解冻；退款及冲正尚未实现，不能当成可执行资金动作。后续资金流水目标包括退款及冲正。并发操作使用锁或原子条件更新。预付已扣订单与月结应收必须区分，避免账单再次扣费。已确认并实现：提交订单冻结，确认承运商接单后扣款，明确拒单且确认未生成外部订单时解冻；结果未知保持冻结。取消、退款、追加费政策仍需细化后实施。

附件使用私有存储，API 校验关联业务记录权限后授权下载，签名 URL 有效期 60 秒。当前上传 PDF/PNG/JPEG，最大 3 MB，经同源 API 读取并校验文件内容后上传 Storage；大文件直传尚未实现，后续必须设计受控上传授权与完成校验。签名 URL 不等同于改善大陆网络可达性，文件链路也要实测。

## 9. 交付顺序与验证

1. 身份、客户隔离、客户地址与询价报价：首版已实现。
2. 最小资金闭环与订单同时交付：线下充值核验、下单冻结、接单扣款、拒单解冻已实现。
3. 人工履约、进度、单据：首版已实现；承运商 API 适配尚未实施。
4. UI 组件规范校正、取消退款/追加费/账号管理等业务补齐，以及 Vercel、SMTP、大陆网络上线验收。
5. 按需求继续建设自动承运商集成、轨迹回调、售后和报表。

每一阶段单独形成实施计划，不将全部模块作为一次开发任务。资金尚未实现时，界面不得将模拟余额与扣费展示为真实交易。

Vitest 验证业务规则；数据库集成测试验证真实事务、约束与权限；完整正式业务链路此前使用浏览器人工自动化及 HTTP 集成验证；Playwright 原先仅覆盖原型。本次补充正式询价控件、邀请角色与拒单确认的回归，邀请和拒单写请求被拦截，不代表真实邮件或资金交易验收。正式全流程 Playwright 覆盖仍需扩展。关键验收包括客户越权被拒绝、刷新后数据保留、重复下单只创建一张订单、并发资金操作不超扣、承运商超时可恢复。

上线要求：测试与生产使用独立数据库和密钥，预览部署不能连接生产数据。当前仅接入一个开发 Supabase 项目；测试工具有开发项目、账号及环境限制，但生产/预览项目隔离尚未建立。生产发布包括迁移兼容性、日志关联 ID、备份和恢复验证；订单与资金任务失败需可查询与告警。

## 10. 历史设计轮范围与后续依据

本文最初仅固化架构和技术选择；当前已获准按阶段推进正式开发。业务与资金时点以[首版开发规格](../../首版开发规格.md)为准，每阶段分别计划与验收。

## 11. 2026-10-04 实现一致性核对

本节记录实际差异，保留目标约束，避免把尚未交付的能力写成完成项。

| 核对项         | 当前实现与差异                                                                                             | 处理                                                                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shadcn/ui      | 原先只有简化自定义 Button/Input/Dialog，不能视为完整接入                                                   | 本次通过官方 CLI 接入组件；正式页面使用 Input、NativeSelect、Checkbox、Textarea、Field/FieldGroup、Table、Badge、Alert、Empty、Skeleton、Pagination、Separator；Dialog 使用官方组合接口，原型通过 PreviewDialog 兼容 |
| 主题           | 原型自定义 CSS 与新组件语义变量需要协调                                                                    | 补齐主题 token，保留蓝色/排版方向；`--muted-foreground` 与背景 `--muted` 分离；状态色扩展为 Badge variants                                                                                                           |
| TanStack Table | 安装了依赖，但没有 `useReactTable` 数据表实现；当前服务端分页 + 本页筛选                                   | 仍待实施；全量服务端搜索/筛选另属接口工作，不能通过换 Table 组件解决                                                                                                                                                 |
| RHF + Zod      | 询价用 RHF；主要表单使用原生 FormData；Zod 校验已有，但部分错误只汇总显示                                  | 待统一字段级错误定位和复杂表单规则；本次保留提交语义，未声称所有表单已改为 RHF                                                                                                                                       |
| 共享业务组件   | Field/Status/Table/Pager 已有；金额、地址、确认组件不齐                                                    | 后续补齐 MoneyInput/AddressForm/ConfirmDialog；独立订单确认页保留                                                                                                                                                    |
| 模块与适配     | 实际为 modules/business 服务文件，单个 catch-all 路由；存储逻辑在 files.ts                                 | 文档已改为实际目录；无需为暂未实现模块生成空目录，但后续增长需拆分入口与适配                                                                                                                                         |
| 隔离模型       | 浏览器没有业务表 grants；受限 runtime 角色的 RLS policy 允许跨客户访问，业务服务执行用户权限和客户范围检查 | 这是受信服务端授权模型，不是终端用户 JWT 的逐客户 RLS；保留约束及隔离测试，不将“开启 RLS”等同于自动隔离                                                                                                              |
| 数据库与区域   | 首尔 Supabase + Session pooler；Vercel 首尔 icn1 已部署并验证基础数据库读取；并发连接预算未验收                                       | 更新本文，生产部署前实测；未迁移已有数据库区域                                                                                                                                                                       |
| 后台任务与回调 | 没有 Queues/Cron/Edge worker、承运商网络调用或自动回调处理                                                 | 保留为后续目标，不补无消费者的空任务                                                                                                                                                                                 |
| 文件           | 3 MB 以内上传经 API；短期签名下载                                                                          | 更新本文；桌面及移动端真实文件下载继续复验，大文件直传未实施                                                                                                                                                         |
| 运营与生产保障 | 业务审计已写库；没有统一请求关联 ID/错误监控/任务告警的完整生产方案；没有备份恢复演练                      | 上线前补齐并实测；Vercel 验收部署已完成；生产/预览/测试环境隔离和 SMTP 仍未完成                                                                                                                                                  |

自定义组件源码属于 shadcn 的正常扩展方式，但后续基础组件应保留官方组合接口，通过主题与 variants 定制，业务封装放在 `components/business`；不得重新用简化自定义控件替代后声称已接入。

### 本次校正验证

- `pnpm lint`、`pnpm typecheck`、21 个单元测试及生产构建通过。
- 6 条 Playwright 浏览器回归通过：3 条原型流程 + 3 条正式控件回归。原型测试补充等待路由完成，修复读取旧 URL 与选择旧页面场景的时序问题。
- 正式测试使用受保护的临时开发客户/员工；仅提交测试询价到数据库。邀请与承运结果写请求拦截，不发送真实邮件、不执行资金动作。临时账号、公司和询价在验证后已清理，保留真实管理员。
- 390 px 移动端询价表单及详情页均验证没有整页横向溢出；宽表格仍在自身容器内横向滚动。
- 本机 Playwright 所需 Chromium 1243 下载连接中断；本轮通过 `TRUCKFLOW_TEST_BROWSER_PATH` 使用已有 Chromium 1217 运行，未声称已验证所要求的新浏览器版本。
- 复验命令：本地开发环境先运行 `node scripts/browser-fixtures.mjs`，再运行 `pnpm test:e2e`；需要本机已有浏览器时显式设置上述环境变量；结束后运行 `node scripts/cleanup-browser-fixtures.mjs`。没有临时账号文件时，正式控件测试会跳过；不能把跳过算成通过。


## 12. Vercel 验收部署（2026-10-04）

- 登录入口：https://truckflow-neo.vercel.app/login。正式业务页面已部署，包含本次 shadcn/ui 校正；使用现有 Supabase 项目及现有管理员账号。
- Vercel 项目 `truckflow-neo`，函数区域 `icn1`；部署 ID `dpl_4gT4TuZKioii4d2CYpPyxN374pPn`。通过 CLI 从当前工作区发布，尚未配置 Git 自动发布。
- 此次使用 Vercel production 发布目标提供稳定域名，但应用 `APP_ENV=staging`，仍连接现有开发数据库，属于验收环境；没有宣称完成独立生产数据库和预览环境隔离。
- 已配置应用同源地址、Supabase 公钥/服务端密钥、受限运行时数据库连接和严格 TLS CA。迁移管理员连接没有上传 Vercel；本地环境文件、测试脚本和设计研究材料排除出部署包。
- Supabase Site URL 已改为线上域名，允许精确回跳到 `/auth/setup`、`/auth/confirm`；同时允许本地 localhost/127.0.0.1 对应路径继续开发。
- 远程安装、构建、类型检查通过。线上 HTTP 验证：登录页 200；临时客户与员工登录 200，订单和客户数据库读取 200；未登录业务 API 401，错误 Origin 写入 403。该验证不等同于在线完整资金/文件业务链路验收。临时 QA 账号和客户数据已清理，管理员保留。
- 本机直接连接 vercel.app 超时，经现有系统代理访问成功；尚未完成中国大陆多运营商网络验收。SMTP 和真实邀请/找回密码投递仍待配置与验证。

2026-10-04 域名调整：Vercel 项目改名为 `truckflow-neo`，主入口为 `https://truckflow-neo.vercel.app`；已更新 production 目标的 APP_ORIGIN 并重新部署、增加精确 Auth 回跳地址。旧 `truckflow-dun.vercel.app` 设置 307 跳转到新域名。浏览器需在新域名重新登录；临时 `truck-flow-neo.vercel.app` 别名已移除。

### 本轮自主注册与组件接入状态

公开首页和 `/register`、`/auth/verify`、`/onboarding` 已实现，正常 Supabase signUp 与邮箱确认、事务开户、客户来源及运营联系人展示已接入。首次开户固定客户业务及财务权限，生成 USD 零余额账户；Actor 仍用于业务权限，VerifiedIdentity 用于开户和设置密码。禁止通过客户端提交管理角色或客户 ID。迁移 `20261004113026_self_registration` 已应用到开发项目。

正式外壳现使用官方 Sidebar/Sheet、Avatar、DropdownMenu 和 Breadcrumb，页面分区使用 Card，客户冻结使用 AlertDialog；原有表单、表格、反馈等组件迁移保留。基础 CSS 进入 base layer，避免覆盖组件语义颜色和字号。TanStack Table 引擎和完整共享地址/金额控件仍按上述状态待后续开发。

最新部署 `dpl_1aQHaMbvSMHAw99HK45sTRMZwZ7Y` 已就绪。`REGISTRATION_ENABLED=false`，等待 SMTP 与真实投递验收；不把当前注册入口视为可获客投产。详细页面、邮件配置和验收范围见 `2026-10-04-self-registration-acceptance.md`。

2026-10-04 SMTP 开通更新：已接入 Gmail 自定义 SMTP，用户确认收到真实 Auth 密码重设邮件；正式注册回跳 `/auth/verify` 已精确加入 allowlist，邮箱确认保持开启。`REGISTRATION_ENABLED=true`，最新验收部署 `dpl_9BuqDQV1HaBoexivytxkQxF2PTWG`，线上注册按钮可用。此前 SMTP 未配置与注册关闭的状态为历史记录。当前仍为 staging，独立生产环境与大陆多运营商网络验收状态不变。
