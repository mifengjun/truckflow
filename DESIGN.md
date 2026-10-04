---
name: Truckflow
description: 中文卡派业务操作界面；清晰的表单、表格与可追溯状态。
colors:
  primary: "#2856a3"
  primary-hover: "#1c407e"
  primary-soft: "#edf2ff"
  background: "#f5f6f7"
  foreground: "#243342"
  muted: "#526071"
  line: "#dfe4ec"
  surface: "#fff"
  control-border: "#cdd5e1"
  outline-border: "#cfd7e2"
  outline-text: "#354357"
  outline-hover: "#f6f8fb"
  focus: "#82aaff"
  neutral-soft: "#f0f2f5"
  success: "#18734a"
  success-soft: "#eaf6ef"
  warning: "#925c0a"
  warning-soft: "#fff4de"
  error: "#b42318"
  error-soft: "#fff0ed"
  navigation: "#1b2a3a"
  navigation-text: "#bcc9d8"
  navigation-secondary: "#afbed0"
  navigation-hover: "#2a3d51"
  navigation-active: "#344b65"
  document-line: "#d6dde5"
  section-line: "#dfe4e9"
  queue-selected: "#e7edf5"
  table-heading: "#eef1f4"
  table-heading-text: "#4a5b6e"
  table-hover: "#f3f6fa"
  control-hover: "#8d9db1"
  placeholder: "#647186"
  badge-blue: "#2454c6"
typography:
  headline:
    fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.5px"
  title:
    fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.6
  body:
    fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  description:
    fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.6
  button:
    fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.6
  amount:
    fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "26px"
    fontWeight: 600
    letterSpacing: "-0.5px"
    lineHeight: 1.6
rounded:
  badge: "4px"
  control: "4px"
  panel: "5px"
  dialog: "12px"
spacing:
  space-4: "4px"
  space-8: "8px"
  space-12: "12px"
  space-16: "16px"
  space-18: "18px"
  space-20: "20px"
  space-24: "24px"
  space-28: "28px"
  space-32: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.outline-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline-hover:
    backgroundColor: "{colors.outline-hover}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "3px 8px"
  nav-active:
    backgroundColor: "{colors.navigation-active}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "42px"
    padding: "0 12px"
  queue-action:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    padding: "8px 20px"
  queue-action-selected:
    backgroundColor: "{colors.queue-selected}"
  quote-row:
    backgroundColor: "{colors.surface}"
    rounded: "0px"
    padding: "24px"
---

# Design System: Truckflow

## Overview

**Creative North Star: "物流业务工作台"**

以真实物流业务工具为准：深海军蓝导航稳定页面骨架，浅中性工作区承载订单与单据，克制的蓝色用于操作。连续表单、对齐报价行和横向待办队列把用户注意力留给对象、状态和下一步。

视觉升级遵循已确认的纠正方向：不使用膨胀的任务卡、营销式标题或重复圆角面板。客户和运营共享系统中文字体、细边线与状态语义；数值来自原型记录，业务内容比装饰优先。记录依据最终 CSS 层叠和现有组件，视觉方向见 .impeccable/surfaces/visual-upgrade.md。

**Key Characteristics:**

- 深色导航与中性工作区形成稳定骨架。
- 连续单据式表单、连续报价行、紧凑横向待办条。
- 常用控件 4px、通用面板 5px 圆角；用边线组织内容。
- 金额等宽数字、完整地址换行、状态保留文字。

## Colors

深海军蓝与灰白是界面骨架，操作蓝保持克制。frontmatter 为已使用复用值；primary、primary-hover、navigation、background、foreground、muted、line、surface 直接对应 CSS 自定义属性，其余提取自生效选择器。

### Primary

- **操作蓝 / primary**：主要按钮、链接、运输进度和选中控件。
- **深操作蓝 / primary-hover**：主按钮悬停。
- **浅蓝 / primary-soft**：提示、完成步骤和蓝色徽标底色。它不是当前侧栏底色。
- **焦点蓝 / focus**：可见键盘焦点。

### Neutral

- **导航海军蓝 / navigation**：整个侧栏；navigation-text 和 navigation-secondary 为其普通文字与辅助信息。
- **导航悬停 / navigation-hover**、**导航当前项 / navigation-active**：深底上以白字保持清楚的选中关系。
- **工作区灰 / background**、**内容白 / surface**：未框住的路线与摘要、连续白色表单与表格。
- **正文墨 / foreground**、**辅助灰 / muted**：业务内容层级。
- **line、document-line、section-line**：通用边线、文档外框和内部段落分隔。
- **table-heading、table-heading-text、table-hover**：紧凑表格的表头和行交互。
- **queue-selected**：待办按钮的悬停与按下状态。

成功绿、琥珀等待色、错误红与相应浅底专用于状态。现有蓝色徽标仍使用独立 badge-blue，不能把它误记为主操作蓝；notice 使用各自已有的浅底与边线。

**The Operational Color Rule.** 深色导航承载定位，操作蓝承载行动；业务状态使用独立语义色和文字。

## Typography

所有角色采用系统字体栈：Arial，中文回退至 PingFang SC / Microsoft YaHei。不依赖在线字体。页面标题直接命名业务任务，不添加装饰眉题或营销语。

- **Headline**：24px / 650，移动端 22px。登录页独立标题 30px / 1.65，在 1100px 以下为 25px。
- **Title**：通用 h2 与承运商名称 16px / 650；带分隔线的面板标题为 15px / 650，摘要标题 14px。
- **Body / Description / Label**：14px 正文与输入、13px 说明与按钮、12px 字段标签和辅助文字。表格数据为 12px。
- **Amount**：报价金额 26px / 600，负字距与等宽数字；摘要金额 27px，表格金额 14px / 550。
- **Queue count**：桌面 20px / 600，移动端 16px；表示已有订单计数。

**The Legible Detail Rule.** 辅助文字至少 12px，金额和数量采用等宽数字，完整地址允许换行。

## Layout

桌面侧栏宽 208px，顶栏高 52px。内容最大宽 1560px，工作区内边距 28px 32px 40px。标题行下留 22px，订单待办条与表格紧接排列。待办条上下边线之间采用 12px 纵向留白，按钮由竖线分隔，不包成独立彩色卡片。

询价主表单与摘要为 `minmax(0, 1fr) 280px`，间隔 24px；字段两列，间隔 20px。主表单是一个外框，内部小节 24px 内边距，彼此零间隙且用横线分隔。桌面摘要透明无框，仅左侧分隔线，内边距 4px 0 16px 22px，并距顶 24px 粘性定位。详情仍为主体加 300px 操作栏。

报价路线无卡片底色，仅上下边线。所有承运商报价收进一个 4px 圆角外框，行与行零间隙；主行内边距 24px。桌面以承运商、参考时效、右对齐价格、操作四列比较。

| 最大视口宽度 | 当前生效行为                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1200px       | 表格横向内边距压缩，最小宽 790px 并允许容器滚动；详情操作栏 260px。                                                                            |
| 1100px       | 侧栏 190px，工作区内边距 24px；询价摘要 240px；待办标题和辅助说明隐藏；报价三列，按钮在第三列。                                                |
| 900px        | 询价及详情主体单列，摘要不粘性；详情辅助区暂为两列；工具栏可换行。                                                                             |
| 760px        | 深色侧栏通过菜单展开、宽 230px；工作区 24px 16px；订单改摘要列表；待办条保留横向紧凑排列，隐藏图标，数字缩小；报价两列且按钮跨两列；询价单列。 |

移动端通用面板内边距 18px，询价内部小节 20px 18px；摘要恢复细外框与 4px 圆角，并可折叠。普通按钮和输入最小高由 40px 变 44px；分页、小按钮、评审工具保留各自尺寸。52px 顶栏高度由最终全局规则覆盖早先移动规则。

## Elevation & Depth

业务表格、待办队列、表单和报价均以色面与边线分层，不使用浮起的卡片阴影。模态遮罩和对话框保留功能性深度。

- **Dialog**：`0 20px 90px #15213630`；遮罩 `#15213660`。
- **Review selection**：`0 1px 3px #34486612`；只属于评审角色选中项。

**The Document Surface Rule.** 连续业务资料通过边线分组，报价通过连续行比较，避免重复卡片制造层级。

导航背景和文字、按钮背景和边线、输入边线使用 140ms 过渡；CSS 未指定 easing，使用默认 ease。无缩放或位移动效。prefers-reduced-motion 关闭过渡及动画。未使用的 elevation 自定义属性不是已落地的投影规范。

## Shapes

常用按钮、输入、导航、头像和文档外框为 4px 圆角，通用面板为 5px。询价内部小节、报价内部行、桌面路线与摘要无圆角。步骤编号为 3px 小方角；状态点、起点标记、运输进度节点仍为圆形。对话框保留 12px 圆角。

现有提示和服务选项仍为 6px；页面索引导览与资金汇总保留 8px，这是局部存量组件，不应扩散为新业务页的默认容器规范。边线通常为 1px。

## Components

### Buttons

Button 的 default、outline、ghost、destructive 分别对应操作蓝实底、白底描边、透明底蓝字、错误红实底。default 与 outline 有背景悬停变化；后两者没有专门按下或悬停背景。小尺寸为 32px 最小高、4px 10px 内边距、12px 字号。禁用按钮 opacity 0.5，并显示 not-allowed 光标。

主要交互元素采用 3px 焦点蓝 outline，偏移 3px。图标使用线性 SVG，功能仍由文字说明。

### Chips

Badge 是非交互状态标记，4px 圆角、3px 8px 内边距，包含 5px 色点及文字。neutral、success、warning、error、blue 均使用现有业务映射，下单结果与履约状态分别呈现。列表筛选标签是独立按钮模式，以底线表达选中。

### Cards / Containers

Panel 保留白底、通用边线和 5px 圆角供独立信息块使用。面板标题区下内边距 14px、细底线、下外边距 20px。询价通过更具体的选择器覆盖为连续无框小节；报价覆盖为连续行，不能照搬通用面板间距。订单表外框 4px，无阴影；表头加重至 600，行纵向内边距 16px，悬停使用 table-hover。

### Inputs / Fields

白底、4px 圆角、control-border 描边，悬停描边转为 control-hover。占位文案为 placeholder，输入光标用操作蓝。textarea 可纵向调整且最小高 80px。FormField 关联 label、提示及错误；aria-invalid 触发红边，字段下方同时显示错误文字。禁用输入没有独立视觉规范，不从按钮样式推断。

### Navigation

深色侧栏链接高 42px，普通文字为 navigation-text，悬停 navigation-hover 底配白字；当前项 navigation-active 底配白字、600 字重。导航项间隔 3px。标志为无色块的线性图标，头像为小方角。移动端展开同一深色导航与遮罩。顶部评审工具为中性浅灰，作为原型辅助层独立存在。

### Operations queue strip

后台待办条包含“结果待确认”“待审核”“提交异常”，数字直接统计已有记录。每个按钮桌面 8px 20px 内边距，左侧竖线分隔；悬停和 aria-pressed 使用 queue-selected。选择后筛选订单列表；键盘焦点沿用全局 outline。移动端保留横排，隐藏装饰性图标与说明，以短标签加数字完成判断。

### Quote comparison rows

承运商名称直接起行，不展示图标色块。价格与操作形成末端对齐组，金额清楚显示币种。费用 details 在行内展开，默认浅底，打开后底色稍深；过期报价显示禁用操作和错误说明。没有最低价推荐标记。移动端各字段重新排布，操作占整行。

### Shipment summary and progress

起点圆、终点方，地址完整换行；事实列表左右对齐。摘要桌面为旁注式透明栏，移动端为可折叠边框区。询价步骤是透明底的底线栏，小方角编号，当前编号浅蓝底深蓝字；运输履约进度仍使用圆节点和连接线，不能将两者当成同一视觉组件。

### Dialogs and feedback

Radix Dialog 保留焦点管理、标题和关闭操作；宽 `min(520px, calc(100vw - 32px))`，最大高 85dvh，内部可滚动。空状态给出说明与恢复操作，加载使用静态占位条；成功、等待、失败均用业务文字说明，不以颜色替代含义。

## Do's and Don'ts

### Do:

- **Do** 使用深色导航、克制的操作蓝和中性业务内容区。
- **Do** 用连续表单、对齐数据行和细分隔线组织复杂任务。
- **Do** 让待办条筛选已有订单，保留按下状态和可见键盘焦点。
- **Do** 显示币种、单位、时区和状态文字；金额采用 tabular-nums。

### Don’t:

- **Don’t** 使用膨胀任务卡、营销式标题、重复圆角面板或装饰性图标色块。
- **Don’t** 添加渐变、装饰地图或虚构指标来填充业务页面。
- **Don’t** 仅靠颜色表达状态或错误，或添加标题眉题。
- **Don’t** 将最低报价视觉包装成承运商推荐。
