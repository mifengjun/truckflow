# 自主注册与 shadcn 集成验收

本轮范围：公开首页 → 注册 → 验证邮箱 → 完善客户资料 → 首次询价 → 运营人工报价。沿用美国 LTL、中文、USD/lb/in、预付余额冻结与接单扣款规则。来源为自主注册的客户与管理员创建客户在后台分别标识。

## 验收入口

- 首页：https://truckflow-neo.vercel.app/
- 注册：https://truckflow-neo.vercel.app/register
- 登录：https://truckflow-neo.vercel.app/login
- 现有管理员继续使用原账号；后台可查看客户来源与询价联系信息。

目前没有 SMTP，`REGISTRATION_ENABLED=false`。注册页面可验收布局、输入、验证提示和导航，但不会发送邮件或建立未验证的正式客户。已有账号正常使用。验证、开户和询价自动测试使用临时 QA 身份和不发信的验证链接；不代表真实邮件投递已经验收。

## shadcn 实际接入

组件源码位于 `src/components/ui`，通过官方 CLI 安装。正式业务页面使用 Sidebar、Sheet、DropdownMenu、Avatar、Breadcrumb、Card、AlertDialog、Table、Field、Input、Textarea、Checkbox、NativeSelect、Alert、Badge、Skeleton、Empty 和 Pagination 等组件；业务封装位于 `src/components/business`。保留已确认的深蓝侧栏、浅色工作区和项目主题。手机侧栏支持关闭并恢复触发按钮焦点；冻结客户需要确认，取消不会提交请求。

## 资金与权限

验证后开户在一个数据库事务中完成：独立客户公司、USD 零余额账户、固定的客户业务及财务角色、审计记录。按用户 ID 加事务锁，重复提交不会产生第二家公司。不能从浏览器指定 staff/admin 角色或 customerId；同名公司仍彼此隔离。已有邀请、员工和停用用户受到保护。没有充值的新客户能询价和查看报价，但余额不足时不能下单。

新增迁移：`20261004113026_self_registration.sql`，在 private `app.customers` 添加受约束的 `source` 列，既有客户默认 `admin_created`。已应用到指定开发项目；未开放 app schema 公共 Data API。回退代码时可保留该列及默认值，不删除新客户数据。

## 邮件服务后续配置

准备 SMTP 服务商、已验证发件域名或邮箱、SMTP 主机、端口、用户名及密码/API Key。敏感信息只填入 Supabase 私有 SMTP 配置，不提交代码或通过聊天发送。

1. 在 Supabase Auth 配置自定义 SMTP，保持邮箱确认开启。
2. Site URL 为 `https://truckflow-neo.vercel.app`；精确允许 `/auth/verify`、`/auth/confirm`、`/auth/setup` 回跳。本地测试允许相同路径的 `http://127.0.0.1:3000`，不要使用宽泛通配符。
3. 默认注册邮件支持跨设备回到 `/auth/verify`；如定制模板，使用 `/auth/confirm?token_hash={{ .TokenHash }}&type=signup`。邀请与 recovery 继续进入 `/auth/setup`。
4. 用指定测试邮箱验收注册、重复邮箱、重发、过期链接、跨设备验证及找回密码；完成后再设置 Vercel `REGISTRATION_ENABLED=true` 并重新发布。

## 部署边界

当前为稳定 Vercel 域名上的验收环境，`APP_ENV=staging`，连接现有开发 Supabase，尚未建立独立生产数据库与预览环境隔离。大陆多运营商访问、真实邮件投递、备份恢复演练等生产事项仍待完成。迁移管理员数据库连接没有上传 Vercel。

## 本轮验证结果

- 单元测试 23/23；真实数据库及 HTTP 集成 29/29；正式与原型浏览器 11/11。扩展后的真实浏览器询价→员工保存及发布报价→客户查看报价用例单独复跑通过。
- 类型检查、lint、构建及差异空白检查通过。桌面首页/后台、手机注册/侧栏截图检查完成，手机注册页无横向溢出。
- 最终独立审查发现“开户前找回密码”入口被业务 profile 限制；回归先得到 403，改为验证身份和账号状态后更新密码，全量集成通过。
- 最新部署：`dpl_1aQHaMbvSMHAw99HK45sTRMZwZ7Y`。线上首页、注册和登录 200；匿名 401、跨站写入 403、邮件未准备注册 503；QA 客户与员工登录及业务数据读取 200。
- 临时浏览器客户、员工及开户 QA 身份已清理；只删除这些 QA 邮箱的登录计数，没有调整正常限流。真实管理员 `fengjun.mi@gmail.com` 活跃员工和管理权限已核验保留。

SMTP 的真实性与投递质量仍未验收；Supabase 当前允许邮箱注册、邮箱确认开启，应用额外开关阻止公开发信。`/auth/verify` 精确回跳 allowlist 在配置 SMTP 时补齐并实测。
