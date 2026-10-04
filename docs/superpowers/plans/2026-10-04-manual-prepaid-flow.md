# 人工报价与预付订单完整流程 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in the current session, task by task.

**Goal:** 在已确认视觉上实现真实身份、客户隔离、地址、询价、人工报价、充值核验、资金占用、订单处理及单据的首版开发测试闭环。

**Architecture:** Next.js 模块化单体；Cookie Supabase Auth，业务服务独立授权；Drizzle/Postgres.js 连接私有 app schema。SQL 事务保存订单与资金，私有 Storage 保存凭证与订单文件。

**Tech Stack:** 已确认技术组合，依赖固定版本及锁文件。

**Spec:** `docs/首版开发规格.md`。本计划承接第一阶段计划，并按用户“完整流程开发”的指示覆盖后续人工预付流程。

## Global Constraints

- 美国 LTL、中文、USD/lb/in；管理员邀请；人工报价、审核与下单。
- 提交冻结、接单扣款、明确拒单解冻、未知结果保持冻结；线下充值核验后入账。
- `/prototype` 保留；正式入口为 `/login`、`/portal`、`/admin`；原型状态不进入正式服务。
- 指定项目 `halitnbbzwwfirscmnlf` 为本轮开发接入目标；现有 public/app 无业务表。测试资料显式标记，不导入真实订单或真实资金。
- 服务端角色与迁移角色分离；TLS 根证书校验；配置不进入 Git。
- 不自动发布、推送 main、发送客户真实通知或执行银行交易。

## Review Focus

- 两客户互相读取/修改 ID、报价成本泄露；Task 1/2/3/5 验证。
- 旧会话与停用身份、邀请失败恢复、非法跳转、跨来源请求；Task 2/5 验证。
- 重复充值、重复订单、并发资金占用；Task 3/5 真数据库验证。
- 未知外部结果重新提交、重复接单扣费；Task 3/5 验证。
- 私有凭证跨客户下载、历史地址快照变化、长地址手机排版；Task 3/4/5 验证。

## Task 1: 基础与迁移

Files: `src/infrastructure/config.ts`、`database/{client,schema}.ts`、`src/modules/business/{rules,contracts}.ts`、`supabase/migrations/*`、`tests/unit/*`、`tests/integration/*`。
Produces: 配置校验、Actor 权限规则、询价/金额/状态契约、类型化表、运行时 DB 与事务。

- [ ] 先写并运行配置/权限/字段/资金规则失败测试。
- [ ] 创建完整流程的新迁移（用 CLI 生成文件名），增量应用到指定项目；建立受限 runtime 角色并将随机密码仅写本地配置。
- [ ] 实现服务端连接和表定义；数据库测试验证约束、Data API 不可直读、TLS 连接、事务回滚与非管理员权限。
- [ ] 单元与集成测试通过后提交基础。

## Task 2: 身份与基础资料

Files: `src/infrastructure/auth/*`、`src/proxy.ts`、`src/modules/business/{customers,addresses}.ts`、`src/app/api/v1/[[...path]]/route.ts`、`src/app/auth/*`。
Consumes: Task 1 数据库和权限。Produces: verified Actor、Cookie 会话、同源 API、客户邀请与地址读写。

- [ ] 先写身份/越权/停用/邀请冲突/Origin 失败测试。
- [ ] 实现真实登录/退出/设置密码/找回，解析数据库当前权限，禁止公开注册提权；邀请记录可恢复。
- [ ] 实现客户与常用地址服务、审计；不允许修改客户归属。
- [ ] API/数据库验证后提交。

## Task 3: 询价、人工报价、资金与订单服务

Files: `src/modules/business/{inquiries,quotes,finance,orders,attachments}.ts`、私有 Storage 设置、对应 API 路由映射。
Consumes: Actor、客户、地址、数据库事务。Produces: 待报价询价→人工发布→资金核验→幂等订单→审核领取→结果回填的业务接口。

- [ ] 先写真数据库测试：费用精确累计；过期/版本拒绝；同 key 同单，不同 payload 冲突；余额不足不建单；并发不超占。
- [ ] 实现人工报价来源与成本独立存储、销售 DTO；订单保存输入/金额快照。
- [ ] 实现私有凭证与充值申请，实际到账参考唯一、核验仅一次。
- [ ] 实现冻结/扣款/解冻同事务与不可重复流水；unknown 保持冻结，failed 重试重新检查报价及冻结。
- [ ] 真数据库验证接单/拒单回填和资金原子性、未知结果限制、重复请求、附件授权，提交服务。

## Task 4: 正式前端贯通

Files: `src/components/business/*`、`src/app/{login,portal,admin}/*`、`src/app/page.tsx`、追加正式布局 CSS。
Consumes: Task 2/3 API。Produces: 当前视觉下可操作的完整前端。

- [ ] 实现真实登录与正式导航，按权限显示可用菜单；API 仍独立授权。
- [ ] 客户：地址、新询价分步录入、询价历史/报价比较、独立确认、订单列表/详情、充值申请/流水。
- [ ] 后台：客户与邀请、待报价及报价发布、充值核验、待审核/未知结果队列、详情操作及单据。
- [ ] 统一加载/空/错误/重试，写请求禁重复、表单错误定位；新页面复用当前视觉，完整地址换行。
- [ ] 浏览器实测客户→后台→客户流程及手机视口；提交前端。

## Task 5: 验收与交接

Files: `docs/正式系统开发验收.md`、README、测试脚本与安全检查记录。

- [ ] Run lint、typecheck、完整单元测试、真实数据库集成测试、build，全部通过。
- [ ] 浏览器验证登录/会话刷新/退出、客户隔离、持久化、充值、报价、冻结、unknown、接单、拒单和单据；保存截图。
- [ ] 独立代码审阅一次，必要修复先失败回归再修复；运行 Supabase advisors。
- [ ] 为用户指定管理员邮箱准备邀请；未提供邮箱或邮件供应商不阻塞测试账号验收，但明确实际账号限制。
- [ ] 留下迁移/运行脚本、实测结果和仍需生产配置的项目，不宣称上线或真实付款。


## 执行结果（2026-10-04）

Tasks 1–4 的交付结果已完成；Task 5 验证结果详见《正式系统开发验收》。正式账号邀请得到用户实际接受与登录确认。

与原任务步骤的差异：本轮持续在当前会话及同一特性分支开发，阶段提交合并为一个最终审阅提交；未按原步骤顺序逐条执行的历史核对项保留不打勾。核心资金测试先失败再实现，邀请故障注入先复现再修复；HTTP 与部分 UI 验证在实现后补充。手机发现的 Grid 溢出通过实测宽度复现并修正。内置浏览器文件点击未捕获下载事件，以授权 HTTP 内容读取确认文件接口。

没有为取消/退款、售后、自动承运商、在线支付等后续模块生成正式占位实现；这些不属于本轮首版闭环。生产部署与生产邮件/网络验收另行进行。
