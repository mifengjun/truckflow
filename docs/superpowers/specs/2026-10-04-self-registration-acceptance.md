# 自主注册与 shadcn 集成验收

本轮范围：公开首页 → 注册 → 验证邮箱 → 完善客户资料 → 首次询价 → 运营人工报价。沿用美国 LTL、中文、USD/lb/in、预付余额冻结与接单扣款规则。来源为自主注册的客户与管理员创建客户在后台分别标识。

## 验收入口

- 首页：https://truckflow-neo.vercel.app/
- 注册：https://truckflow-neo.vercel.app/register
- 登录：https://truckflow-neo.vercel.app/login
- 现有管理员继续使用原账号；后台可查看客户来源与询价联系信息。

当前已配置 Gmail 自定义 SMTP，用户确认收到实际密码重设测试邮件；Vercel `REGISTRATION_ENABLED=true`，注册入口已开放，邮箱确认仍开启。注册用户必须完成邮箱验证后才能建立客户资料。既有代码验收使用临时 QA 身份；真实新客户注册收件和填写开户资料由线上验收继续验证。

## shadcn 实际接入

组件源码位于 `src/components/ui`，通过官方 CLI 安装。正式业务页面使用 Sidebar、Sheet、DropdownMenu、Avatar、Breadcrumb、Card、AlertDialog、Table、Field、Input、Textarea、Checkbox、NativeSelect、Alert、Badge、Skeleton、Empty 和 Pagination 等组件；业务封装位于 `src/components/business`。保留已确认的深蓝侧栏、浅色工作区和项目主题。手机侧栏支持关闭并恢复触发按钮焦点；冻结客户需要确认，取消不会提交请求。

## 资金与权限

验证后开户在一个数据库事务中完成：独立客户公司、USD 零余额账户、固定的客户业务及财务角色、审计记录。按用户 ID 加事务锁，重复提交不会产生第二家公司。不能从浏览器指定 staff/admin 角色或 customerId；同名公司仍彼此隔离。已有邀请、员工和停用用户受到保护。没有充值的新客户能询价和查看报价，但余额不足时不能下单。

新增迁移：`20261004113026_self_registration.sql`，在 private `app.customers` 添加受约束的 `source` 列，既有客户默认 `admin_created`。已应用到指定开发项目；未开放 app schema 公共 Data API。回退代码时可保留该列及默认值，不删除新客户数据。

## 邮件服务配置参考（Gmail SMTP 已接入）

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

以上为首次发布时的历史记录；后续 SMTP 开通状态见下节。


## SMTP 开通（2026-10-04）

- 用户已保存 Gmail SMTP，主机 smtp.gmail.com、端口 587，SMTP 密码由用户在 Supabase 后台填写，未读取或提交密码。
- 向已有管理员邮箱发送密码重设测试请求成功，用户明确确认已收到。没有修改管理员密码或角色。
- Site URL 保持 https://truckflow-neo.vercel.app，新增精确回跳 https://truckflow-neo.vercel.app/auth/verify；原有 invite/recovery 回跳保留。注册模板使用默认 ConfirmationURL。
- 用不发信的临时 QA signup 链接验证实际 Supabase 确认端点：303 到正式 /auth/verify，携带会话令牌，邮箱确认状态已生效；测试会话和身份已删除。没有在日志输出令牌。
- Vercel 注册开关开启，部署 dpl_9BuqDQV1HaBoexivytxkQxF2PTWG READY。仍是 staging 与现有开发数据库，不代表独立生产环境上线。
- Gmail 用于当前小规模验收；后续域名与专门发信服务确定后可替换 SMTP，不需重做注册系统。
