---
name: Truckflow
description: 中文卡派业务操作界面；清晰的表单、表格与可追溯状态。
colors:
  primary: "#2454c6"
  primary-hover: "#1d45a7"
  primary-soft: "#edf2ff"
  background: "#f5f7fa"
  foreground: "#182230"
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
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.6
rounded:
  badge: "4px"
  control: "6px"
  panel: "8px"
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
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 12px"
---

# Design System: Truckflow

## Overview

**Creative North Star: "操作型物流工作台"**

以已确认的操作型浅色界面为方向：让地址阅读、费用比较、状态判断和待办处理成为首要任务。白色内容区置于浅灰工作区，单一蓝色承担操作和选择，细边线组织密集信息。

客户门户与管理后台共享字体、导航、字段和状态语言。原型使用系统中文字体和线性 SVG 图标；无渐变、无产品栅格插画。此文记录当前实现，依据 src/app/globals.css、共享组件及已批准设计稿；不是尚未落地的组件库承诺。

**Key Characteristics:**

- 浅灰工作区、白色面板、单一操作蓝。
- 紧凑表格与分组表单，完整地址可换行。
- 状态同时有文字与色彩，金额使用等宽数字。
- 桌面双栏工作区，移动端单列与订单摘要。

## Colors

低饱和浅灰承载信息，清晰的操作蓝与语义状态色承担重点。上方 frontmatter 是复用色值的规范；CSS 自定义属性的直接映射为 primary、background、foreground、muted、line 和 surface，其余为已实现样式中的重复值。

### Primary

- **操作蓝 / primary**：主按钮、文本链接、当前导航与完成的运输步骤。
- **深操作蓝 / primary-hover**：主按钮悬停。
- **浅蓝选中底 / primary-soft**：当前导航、蓝色徽标、提示和完成步骤。
- **焦点蓝 / focus**：交互元素的可见键盘焦点。

### Neutral

- **工作区灰 / background** 与 **内容白 / surface**：区分工作区和内容。
- **正文墨 / foreground** 与 **辅助灰 / muted**：正文和次级信息。
- **分隔灰 / line**：面板、栏与列表分隔；control-border、outline-border 专用于控件。
- **中性状态底 / neutral-soft**：普通履约状态。

成功绿、待处理琥珀、错误红及其浅底组成语义状态对，不是额外品牌强调色。现有 notice 提示使用同色系的独立浅底与描边；徽标和提示不应混为同一具体样式。

**The Action Blue Rule.** 蓝色用于可操作内容、当前选择和流程进度；状态色保留其业务含义。

## Typography

全站使用 frontmatter 中同一系统字体栈，英文优先 Arial，中文回退至 PingFang SC / Microsoft YaHei；不依赖在线字体。字体不是装饰，页面标题直接说明任务。

- **Headline**：页面 h1；移动端缩为 22px。登录页是独立例外（30px / 1.65，1100px 以下 25px）。
- **Title**：面板 h2；h3 使用 14px / 600。
- **Body**：基础正文及常规输入。
- **Description**：页面说明、按钮附近说明和提示文字。
- **Label**：字段标签、徽标；常规辅助文案同字号但使用 400 字重。表格也是 12px，属于密集操作数据。
- **Amount**：报价总额，tabular-nums；摘要金额为 27px，表格金额为 13px / 550。

**The Legible Detail Rule.** 辅助文案采用至少 12px；金额与数量使用等宽数字，完整地址允许换行。

## Layout

桌面为固定侧栏加弹性工作区：侧栏宽 224px，顶栏高 62px；内容最大宽 1560px，内边距 30px 32px 48px。页面标题与操作并排，下面为说明与业务区。面板通常 24px 内边距，连续面板相隔 20px。间距按紧凑控件、字段组、业务区块分级，frontmatter 记录重复使用的实际值，并非单一严格倍数网格。

询价使用 `minmax(0, 1fr) 280px` 双栏与 24px 间隔，摘要在桌面距顶部 24px 粘性定位；字段两列、20px 间隔。订单详情使用主体与 300px 操作栏。

| 最大视口宽度 | 已实现适配                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| 1200px       | 表格单元左右内边距减小，表格最小宽 790px 并可横向滚动；详情操作栏 260px。                                            |
| 1100px       | 侧栏 196px、工作区内边距 26px 24px；询价摘要 240px、栏间距 20px；报价布局压缩。                                      |
| 900px        | 询价和详情主体变单列；详情辅助面板暂为两列；摘要取消粘性；工具栏换行。                                               |
| 760px        | 侧栏通过菜单展开；工作区 22px 16px 32px，面板 18px；字段、地址、辅助面板单列；订单表格改为摘要列表；运输摘要可折叠。 |

常规按钮和输入桌面最小高 40px，移动端 44px。小按钮、分页和评审工具有独立尺寸，不能声称所有目标均达到 44px。移动端订单摘要保留订单、路线、费用与状态；其余表格仍可在容器内滚动。

## Elevation & Depth

工作区总体扁平，白底和细描边形成层次。主按钮与面板没有投影，也没有缩放悬停。模态对话框以遮罩和柔和阴影突出；评审角色开关有微小阴影。

- **Dialog**：`0 20px 90px #15213630`，背景遮罩 `#15213660`。
- **Review selection**：`0 1px 3px #34486612`，只用于评审工具的当前角色。

**The Flat Workspace Rule.** 业务面板以边线与底色分层；阴影仅见于对话框和评审工具的选中角色。

没有通用过渡时长或 easing token；当前状态直接切换。减少动态效果媒体查询关闭动画与过渡，并使用自动滚动行为。

## Shapes

面板使用轻圆角（panel），按钮、输入、提示和导航使用更紧的圆角（control），徽标采用 badge 圆角，对话框采用 dialog 圆角。边线一般为 1px。圆形仅承担头像、步骤编号、状态点和起点标记等含义；终点使用方形标记帮助区分。

## Components

### Buttons

共享 Button 的 default、outline、ghost、destructive 对应主蓝、白底描边、蓝字透明底、错误红实底。默认尺寸见 frontmatter；sm 为最小高 32px、4px 10px 内边距、12px 字号。主按钮和描边按钮各有背景悬停值；ghost 和 destructive 当前没有专门悬停或按下变化。禁用按钮为半透明（opacity 0.5）与 not-allowed 光标。

所有主要交互元素使用 3px 焦点蓝 outline，向外偏移 3px。保留图标加文字形式；图标来自线性 SVG。

### Chips

Badge 提供 neutral、success、warning、error、blue；每个包含 5px 同色点和可读状态文字，不是可点击筛选器。下单结果与履约状态分别显示。筛选标签是另一种真实按钮模式，以下边线和文字表示选中。

### Cards / Containers

Panel 是白底、细边线的基础容器。面板标题通常与辅助操作同排，下留 20px。表格容器不重复增加内部留白，单元格提供密度。桌面表格有浅灰表头、水平分隔线、轻微悬停底色；金额等宽、路线完整换行。

### Inputs / Fields

输入、select 和 textarea 使用白底、control-border 描边与 control 圆角。文本框可纵向调整且最小高 80px。FormField 生成关联的 label、提示和错误描述；aria-invalid 对应错误红描边，文字说明在字段下方。未实现独立的输入禁用视觉规范，不从按钮禁用样式推断。

### Navigation

侧栏链接高 44px，文字与线性图标同列；当前项浅蓝底、蓝字、600 字重，普通项辅助灰，悬停工作区灰。窄屏通过菜单展开白色侧栏与遮罩。上方评审工具有独立淡蓝底，与业务菜单清楚区分。

### Shipment summary and progress

运输摘要复用起点圆形与终点方形标记，地址支持换行。事实用左右对齐的定义列表显示，金额单独以分隔线和较大数字突出。桌面摘要粘性定位，移动端使用带 aria-expanded 的展开按钮。步骤编号与运输进度用线连接，以填充蓝与文字共同表示进度；窄屏询价步骤取消连接线并允许换行。

### Dialogs and feedback

Radix Dialog 提供标题、说明、关闭按钮及焦点管理；宽度 `min(520px, calc(100vw - 32px))`，最大高 85dvh 并可滚动。空状态居中显示线性图标、标题、说明与恢复操作。加载状态使用静态浅灰占位条。错误、成功、等待提示保留可读说明，不用纯色块代替业务结果。

## Do's and Don'ts

### Do:

- **Do** 使用主蓝表达主要操作、链接和当前选择。
- **Do** 保留明确标题、可见字段标签、错误说明及键盘焦点。
- **Do** 显示币种、单位、时区和状态文字；金额采用 tabular-nums。
- **Do** 沿用现有断点与真实组件状态，保持长地址可读。

### Don’t:

- **Don’t** 添加渐变、装饰性插画或多种竞争的主操作色。
- **Don’t** 仅靠颜色表达订单状态或输入错误。
- **Don’t** 将标题上方装饰眉题作为页面模式。
- **Don’t** 将报价低价视觉包装成推荐承运商。
