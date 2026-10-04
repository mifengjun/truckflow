# Self Registration and shadcn Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 用户此前选择当前会话顺序实现，本计划沿用该方式。

**Goal:** 用户从公开入口注册、验证邮箱、建立客户资料并询价；正式页面统一使用 shadcn/ui 组件，由现有运营后台报价。

**Architecture:** 保留 Next.js 模块化单体、Supabase Auth 和 app 私有 schema。身份验证与业务开户分离，业务开户事务按用户 ID 串行执行，所有客户归属与角色由服务端确定；既有客户范围隔离和预付业务继续复用。

**Tech Stack:** Next.js App Router、TypeScript、Supabase Auth、Drizzle/Postgres.js、shadcn/ui/Radix、Tailwind v4、Zod、Vitest、Playwright、pnpm。

**Spec:** [自主注册获客与 shadcn/ui 页面统一设计](../specs/2026-10-04-self-registration-shadcn-design.md)

## Global Constraints

- 美国 LTL、中文、USD/lb/in、人工报价与预付订单规则不变；询价不要求预存余额。
- 新主账号角色固定为 `customer_operator`、`customer_finance`；同名公司不自动合并；既有邀请和员工身份不可覆盖。
- 注册必须验证邮箱；不使用 `email_confirm:true` 绕过真实注册验证，不信任 `user_metadata` 授权字段。
- 主题保留已确认蓝色视觉；基础组件通过官方 CLI 获取，业务组件负责组合，不重新造 Sidebar/Card 等已有组件。
- 当前验收入口 `https://truckflow-neo.vercel.app`，Vercel 项目 `truckflow-neo`；旧域名仅兼容跳转。
- 报价通知本轮为站内可见；SMTP 未配置、投递未验收前不声称外部自主注册已开放。
- 不发送邮件给真实客户、不改真实管理员密码、不产生真实转账；保留既有未提交修改和设计研究材料。
- 编码前阅读仓库 AGENTS.md、所涉 Next.js 当前文档；Supabase 与 shadcn 接口核对官方文档。

## Review Focus

1. 验证邮件在另一设备打开：可建立会话并进入开户，不依赖原浏览器 PKCE verifier。
2. 员工或受邀账号访问开户：返回原身份或拒绝，不能建立新客户或改写角色。
3. 开户提交已成功但响应丢失：重试得到原客户，联系方式不会覆盖已有档案。
4. 验证失败、SMTP 失败与重复邮箱：反馈可恢复且不泄露邮箱是否注册，不将发信失败显示为成功。
5. 移动端侧栏和键盘菜单：收起、焦点恢复、退出登录可用；不能被保留的全局 CSS 覆盖。

## File Structure

新增 `src/infrastructure/auth/identity.ts`（验证真实会话和邮箱）、`src/modules/business/onboarding.ts`（事务开户）、`src/modules/business/registration.ts`（注册与重发）、`src/modules/business/auth-contracts.ts`（输入及回跳约束）。

新增 `/register`、`/auth/verify`、`/onboarding` 页面与 `RegistrationForm`、`VerificationNotice`、`OnboardingForm` 业务组件；现有 `/auth/confirm`、AuthForm、Layout、API route 负责接线，不将全部逻辑塞进 catch-all route。

新 shadcn 组件位于 `src/components/ui`，业务外壳位于 Shell/shared，页面分区改动限定正式 business 组件。数据库迁移通过 `supabase migration new self_registration` 生成实际文件名，不手写猜测时间戳。

### Task 1: 会话身份与事务开户

**Files:** Create `src/infrastructure/auth/identity.ts`, `src/modules/business/onboarding.ts`, `src/modules/business/auth-contracts.ts`, `tests/integration/onboarding.test.ts`; Modify `src/infrastructure/auth/actor.ts`, `src/infrastructure/database/schema.ts`; Create CLI-generated migration.

**Interfaces:**
- `VerifiedIdentity = { id: string; email: string }`，仅由 `requireVerifiedIdentity(): Promise<VerifiedIdentity>` 返回；验证 claims、当前 session_active 和 Auth 用户邮箱确认状态。
- `getOnboardingState(identity: VerifiedIdentity): Promise<{ destination: string; needsOnboarding: boolean }>`；无身份返回 `/onboarding`，已开户返回现有角色首页，停用账号拒绝。
- `completeOnboarding(identity: VerifiedIdentity, value: unknown): Promise<{ customerId: string; destination: string }>`；首开户 destination 为 `/portal/inquiry`，后续重复调用按已有身份返回合法入口。
- 输入仅 `companyName`、`contact`、`phone`（分别 trim 后 1–100、1–100、3–40 字符）；邮箱来自验证身份。未知字段拒绝。来源由服务端固定为 `self_signup`，既有/管理员创建默认 `admin_created`。

- [ ] 写开户集成测试：验证身份缺失/邮箱未确认拒绝；两个并发调用得到相同 customerId，账户 USD/0，两个客户角色固定；已有员工、受邀客户和停用账号不被覆盖。
- [ ] 运行 `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/onboarding.test.ts`，记录新增接口未实现导致的失败。
- [ ] 添加 source 列约束及 Drizzle 字段；用受限 runtime 实施事务，按用户 ID advisory transaction lock 串行化，核对 profiles 和 invitations 防止抢占待邀请身份；按客户→账户→profile→审计顺序写入，失败整体回滚。不得给浏览器授予 app 表权限。
- [ ] 将会话校验提取到 identity，requireActor 复用；完成已有用户回跳规则和 onboarding 输入校验。
- [ ] 测试事务故障回滚、成功后丢失响应的重试、同名公司仍为独立客户、来源缺省值；受限 runtime 能执行迁移后的查询，不提升为 postgres。
- [ ] 上述集成测试及既有 schema/权限测试通过，核验实际 schema 和安全检查；只提交本任务文件。

### Task 2: 自助注册 API 与正确的认证回跳

**Files:** Create `src/modules/business/registration.ts`, `tests/unit/auth-contracts.test.ts`, `tests/integration/registration-http.test.ts`; Modify `src/app/api/v1/[[...path]]/route.ts`, `src/app/auth/confirm/route.ts`, `src/infrastructure/auth/throttle.ts`.

**Interfaces:**
- `registerCustomer(value: unknown): Promise<{ message: string }>`；输入 email/password/confirmPassword，邮箱标准化，密码 12–200 字符并必须一致，不允许 roles/customerId。
- `resendSignupVerification(value: unknown): Promise<{ message: string }>`；只接受 email。注册及重发每邮箱独立沿用 15 分钟最多 10 次限流，公网滥用再结合 Supabase 服务端限额。
- API `POST auth/register`、`POST auth/resend`、`GET auth/onboarding`、`POST auth/onboarding`；前三者不要错误依赖已开户 Actor，开户读写必须依赖 VerifiedIdentity。所有写入保留现有 Origin、类型、体积校验。
- 注册确认邮件采用 token_hash + type=signup 的受控 `/auth/confirm` 路径以支持跨设备。signup 成功走 Task 1 状态检查，invite/recovery 成功走 `/auth/setup`；错误走 `/auth/verify?status=invalid`。仅接受明确列出的类型和站内固定目的地。

- [ ] 写输入与目的地测试：密码不一致、未知角色字段、外部 next 拒绝；signup/invite/recovery 跳转各自准确，错误/过期链接可恢复。
- [ ] 执行新增 unit/HTTP 测试并确认红灯。
- [ ] 核对 Supabase 当前 signUp/resend/verifyOtp 及邮箱模板文档；正常 signUp 使用 sessionClient，不用 admin createUser；重复邮箱返回通用提示，服务故障不显示发信成功。脱敏错误与有限诊断信息保留。
- [ ] 接入新增 API；登录成功允许有效已验证但未开户用户保留会话返回 `/onboarding`，不能继续走当前 catch 分支立即 signOut。现有管理员/受邀/停用用户保持行为。
- [ ] 为 Auth code 分支定义明确受限 intent，不能仅靠未经验证 query type 决定提高权限；code 成功仍按真实用户和业务状态确定目的地。维持旧邀请链接兼容。
- [ ] 测试跨设备 token_hash 确认、已用 token、真实 SDK 错误映射、限流 429、错误 Origin 403、无会话开户 401；确保响应和日志不含密码或令牌。
- [ ] 新增测试通过；既有 invitations/http 测试通过；只提交本任务文件。

### Task 3: 注册、验证、开户页面与公开获客首页

**Files:** Create `src/app/register/page.tsx`, `src/app/auth/verify/page.tsx`, `src/app/onboarding/page.tsx`, `src/components/business/RegistrationForm.tsx`, `VerificationNotice.tsx`, `OnboardingForm.tsx`, `tests/e2e/registration.spec.ts`; Modify `src/app/page.tsx`, `src/components/business/AuthForm.tsx`, `Layout.tsx`.

**Interfaces:** 页面只调用 Task 2 API；开户服务端页面根据 Task 1 状态限制访问。成功注册→验证提示→开户→`/portal/inquiry`。`VerificationNotice` 支持手工输入邮箱重发，不把密码或 token 放入 URL/localStorage。本轮仅记录 self_signup，不额外存 UTM。

- [ ] 写浏览器测试：公开首页两个真实入口；注册字段错误定位；验证提示/重发故障恢复；未完成开户再次登录能继续，员工不能通过开户改变身份。
- [ ] 运行新增 Playwright 测试确认失败。
- [ ] 用官方 shadcn Card/Field/Alert 构建页面，表单使用 RHF+Zod、busy/disabled、字段级错误、提交失败保留输入；密码不持久化。登录补注册入口。
- [ ] 首页只写已确认服务事实：美国 LTL、人工报价、USD/lb/in、询价资料准备、预付下单；不写虚构时效和案例。已登录用户保留进入其工作区的明确入口。
- [ ] 修改 BusinessLayout：未开户且已验证的客户跳开户；无会话跳登录；停用/其它权限错误显示对应信息，不能通过宽泛 catch 制造登录循环。
- [ ] 在 390 px 手机和桌面测试无整页横向溢出、键盘提交、重新登录继续开户；涉及邮件 SDK 的 UI 测试使用受控拦截，不冒充真实邮件投递验收。
- [ ] 浏览器测试通过、typecheck/lint 通过；只提交本任务文件。

### Task 4: shadcn 外壳、导航与业务分区统一

**Files:** Add official `sidebar`, `sheet`, `card`, `breadcrumb`, `avatar`, `dropdown-menu`, `alert-dialog` and their CLI dependencies in `src/components/ui`; Modify `src/components/business/Shell.tsx`, `shared.tsx`, `AuthForm.tsx`, `Customers.tsx`, `Finance.tsx`, `Addresses.tsx`, `Inquiries.tsx`, `InquiryForm.tsx`, `Orders.tsx`, `Shipment.tsx`, `src/app/globals.css`, `package.json`, `pnpm-lock.yaml`; Extend `tests/e2e/shadcn-business.spec.ts`.

**Interfaces:** 保留 Shell 的 actor/children/environment props、导航角色过滤、现有 API 与业务 shared 导出接口。分区封装 `BusinessSection({ title, description?, children, footer? })` 组合 CardHeader/Title/Description/Content/Footer；新页面同样复用。

- [ ] 扩展浏览器测试：客户与员工的授权菜单准确；手机打开关闭 Sidebar、Escape、焦点恢复、账号菜单和退出登录可用，错误反馈保留。
- [ ] 运行测试，确认新增导航交互断言失败。
- [ ] 使用 `pnpm dlx shadcn@latest info --json` 和 docs 获取当前组件接口；安装缺少组件，保留已有组件和当前 Radix 基础；依赖与锁文件一并检查，不以写一个同名组件代替官方组件。
- [ ] 替换 Shell 为 SidebarProvider/Sidebar/SidebarInset/SidebarTrigger 全组合；账号 Avatar/Fallback、DropdownMenu；Breadcrumb 只展示真实路由层级；保留环境提示、权限与移动导航行为。
- [ ] 实现 BusinessSection 并替换正式页面分区为 Card 组合；危险确认适用 AlertDialog，但独立订单确认页不改成弹窗。不改变资金与文件操作接口。
- [ ] 清理只针对旧正式外壳的 CSS；原型样式以明确作用域保留。颜色/文字/控件状态由主题与 variants 控制，避免全局 button/table 样式覆盖。
- [ ] 浏览器测试通过；保留现有询价、角色勾选、确认框的正式回归和原型回归；记录桌面/手机截图并人工查看。
- [ ] typecheck/lint/build 通过，只提交本任务新增及修改文件，排除原先用户研究材料。

### Task 5: 新客户在运营后台可识别并完成报价

**Files:** Modify `src/components/business/Customers.tsx`, `Inquiries.tsx`, `src/modules/business/inquiries.ts` as needed for authorized display fields; Add `tests/integration/self-signup-flow.test.ts`, extend `tests/e2e/registration.spec.ts`.

**Interfaces:** 客户响应使用 Task 1 source 字段；询价列表只补权限允许的公司/联系人展示，不把员工成本或别人的资料发到客户浏览器。报价发布与客户查看沿用现有 API。

- [ ] 写真实数据库集成用例：独立开户 A/B，A 询价，staff 报价发布，A 可见，B 404；账户零余额允许询价但下单返回 INSUFFICIENT_FUNDS。
- [ ] 确认新来源展示及业务链路测试在新需求处失败。
- [ ] 后台添加来源 Badge 和客户联系人，零数据用 Empty；避免每行独立请求造成 N+1，列表查询维持范围限制。不增加未实现菜单。
- [ ] 执行集成链路；沿用已有冻结/扣款/解冻事务测试复验，真实充值与承运商操作不发生。
- [ ] 浏览器验证客户提交成功、员工看到待报价、发布后客户报价展示；只提交本任务文件。

### Task 6: 邮件配置核验、完整回归与 Vercel 验收发布

**Files:** Update `docs/正式系统开发验收.md`, `docs/superpowers/specs/2026-10-04-technical-architecture-design.md`, design status and this plan checkboxes; Extend fixture cleanup scripts only for new test-owned resources if needed.

**Interfaces:** Supabase 注册开启且邮箱确认必须生效；模板使用 Task 2 回调。线上 APP_ORIGIN 保持 `https://truckflow-neo.vercel.app`，redirect allowlist 保留精确回调与本地开发，不使用任意通配符。

- [ ] 核验当前 Auth 注册开关、验证策略、邮件模板与 SMTP 是否可用。需要用户提供发件服务与发件地址；敏感配置通过私有环境配置，不写入文档/日志。未提供时继续完成代码、自动测试与验收部署，将“外部邮件可用”明确保持未完成。
- [ ] 在指定开发 Supabase 项目应用迁移并验证受限 runtime、数据来源、已有管理员角色和客户资料未改变；准备数据库兼容回退说明。不开启 app schema 公共 Data API 访问。
- [ ] 执行 `pnpm typecheck`、`pnpm lint`、`pnpm exec vitest run`、`pnpm test:integration`、正式和原型 Playwright；使用已可用浏览器 executablePath，必要时报告版本限制；`pnpm build` 和 `git diff --check` 通过。
- [ ] 仅对本轮临时账号验证跨设备链接和开户询价。若真实 SMTP 配置完成，用用户指定测试邮箱验收注册、重发、找回密码；未经用户授权不向真实客户发信。
- [ ] 发布到现有 Vercel truckflow-neo，核验首页/注册入口、401/403、线上 API/数据库和新客户可见报价；将线上验证与本地验证区别记录。SMTP 不可用时不把公开入口宣传为可获客投产。
- [ ] 清理所有本轮临时客户、Auth 用户、附件及会话文件；核实真实管理员保留。更新部署 ID、验证证据、SMTP 与网络等剩余限制，提交任务文件。

## Execution Handoff

用户已要求按设计稿继续；设计视为已审阅，计划等待审阅。沿用当前会话顺序实现，不新建用户任务。计划确认后使用 executing-plans 逐项执行；缺少邮件服务不阻断代码和受控验收，但阻断外部自主注册的真实投递验收。
