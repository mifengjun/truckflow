# Truckflow

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vercel + Supabase；Next.js App Router、React、TypeScript、shadcn/ui、Tailwind CSS、TanStack Table / Query、React Hook Form、Zod、Drizzle、Postgres.js、Vitest、Playwright、pnpm。

## Users

一家物流公司的海外管理人员，以及主要位于中国大陆的多个客户公司的用户。客户与管理后台为两类入口，客户数据须隔离。

## Product Purpose

将询价、报价比较、下单、订单履约、单据、结算及售后放在可追溯的业务流程中。当前任务是全系统页面结构和核心业务流程的可点击高保真原型，使后续开发有明确的页面、组件和状态依据。

## Operating Context

客户录入海外收发货及货物资料，比较承运商报价并提交订单。管理人员处理订单和异常。时间、地址、重量单位与币种需要明确显示。配送小程序是用户提供的设计方法参考，本项目仍是卡派 Web 系统。

## Capabilities and Constraints

原型范围已确认：全系统结构；客户询价、报价、下单、订单详情和后台订单处理为高保真核心流程；资金及售后等模块先做页面和状态设计。用户选择直接制作可点击页面。

首发国家、运输方式、承运商接口、资金规则等仍未决定，详见 docs/系统需求文档.md 的 D01 至 D13。原型使用明确标注的示例数据，不接生产账户，不将业务假设当成已批准规则。

## Evidence on Hand

- docs/系统需求文档.md：功能需求和待确认事项。
- docs/superpowers/specs/2026-10-04-technical-architecture-design.md：技术组合与架构。
- truck-dispatch/index.html：现有静态业务原型，另有两份相同副本。
- docs/卡派知识大全.md：业务背景；不是生产定价依据。

## Product Principles

- 关键业务通过可操作原型验证，包含失败、等待与恢复。
- 相同概念在客户门户与后台使用一致名称；员工操作说明目标客户。
- 地址和订单资料完整保存，历史记录不随常用资料更新而改变。
- 业务成功、承运商接单和资金入账分开反馈。
- 共享组件与规范成为后续 Agent 的实现依据。
