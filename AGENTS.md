# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 企业内部全员（产品/运营/技术），高频浏览与提交，追求高效决策
- **核心目的**: 引导行动（提交）+ 建立共识（数据透明）
- **情绪基调**: 秩序感 / 专注；避免 混乱 / 视觉疲劳

### 1.2 设计方向

- **Design Style**: Soft Blocks 柔色块 — 卡片网格承载高密度信息，柔和圆角降低商务工具冷硬感
- **Application Type**: Internal SaaS Tool — 决定布局策略为高利用率、内容优先
- **Aesthetic Direction**: 飞书式规整秩序 + Notion 轻量呼吸感，色彩仅服务于状态语义

## 2. Color System (色彩系统)

**色彩关系**: 品牌蓝主色 + 浅灰蓝底色 + 深墨文字 + 双语义点缀色（绿/橙）
**配色设计理由**: 用户指定 #2563EB/#10B981/#F59E0B，需统一衍生确保对比度与层级一致
**主色推导**: #2563EB 用于所有"可行动"入口（提交按钮、聚焦态）
**使用比例**: 70% 中性底/白卡 · 20% 文字/边框 · 10% 语义色（蓝行动/绿高优/橙待办）

### 2.1 主题颜色

| Token                | HSL 值                  | 说明                                       |
| -------------------- | ----------------------- | ------------------------------------------ |
| `background`         | hsl(210 40% 98%)        | 页面底色 #F8FAFC，微蓝灰调减少纯白刺眼     |
| `card`               | hsl(0 0% 100%)          | 卡片/表单容器背景                          |
| `foreground`         | hsl(215 28% 17%)        | 主文字 #1E293B                             |
| `muted-foreground`   | hsl(215 16% 47%)        | 次要文字/部门标签                          |
| `primary`            | hsl(217 91% 60%)        | 主交互色 #2563EB                           |
| `primary-foreground` | hsl(0 0% 100%)          | 主按钮文字                                 |
| `accent`             | hsl(217 91% 96%)        | hover/focus 反馈背景，同色相极浅变体       |
| `accent-foreground`  | hsl(215 28% 17%)        | accent 上的文字                            |
| `border`             | hsl(214 32% 91%)        | 卡片边框/分割线                            |

### 2.2 导航区配色

- **基调关系**: 复用主配色系统，顶部操作栏白底 + 底部细线分隔
- **关键状态**: 头像区域无特殊背景；「提交新需求」按钮使用 primary
- **边界与背景**: 白底 `bg-card` + `border-b border-border`，非透明

### 2.3 语义颜色

| 用途       | Token              | HSL 值           | 衍生逻辑                                |
| ---------- | ------------------ | ---------------- | --------------------------------------- |
| 校验错误   | `destructive`      | hsl(0 84% 60%)   | 表单失焦校验红框 + 提示文字             |

## 3. Typography (字体排版)

- **Heading**: Inter, "PingFang SC", "Microsoft YaHei", sans-serif
- **Body**: Inter, "PingFang SC", "Microsoft YaHei", sans-serif
- **字体策略**: 西文 Inter 保证数字/标签对齐；中文回退苹方/微软雅黑；数字场景可用 tabular-nums

## 4. Layout Strategy (布局策略)

- **导航意图**: 仅需顶部操作栏（左CTA+右用户），无全局 Sidebar；至多一套，非透明背景
- **页面架构**: 居中容器 `max-w-6xl`，卡片网格/表单/详情均在此宽度内自适应
- **响应式**: 桌面端多列网格 → 移动端单列堆叠；详情页左右分栏 → 移动端上下堆叠

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-xl (12px)` · 阴影 `shadow-sm` (hover: `shadow-md`) · 间距 `standard`
- **识别签名**: 柔和卡片 + 部门标签 + 状态徽章
- **装饰策略**: 仅状态标识（丝带/角标/徽章）作视觉锚点，无纯装饰图形
- **动效原则**: 卡片 hover 上浮 150ms；数字 countUp 600ms ease-out
- **可及性**: 正文 ≥ 4.5:1；橙色角标仅用于大字号/图标旁，配合文字标签

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/Card 覆盖 Default/Hover/Focus/Disabled/Error；Focus 环用 primary
- **层级清晰**: Primary 按钮填充色 vs Ghost 按钮透明+边框；表单 Error 红框+下方文案
- **一致性**: 所有卡片统一 `rounded-xl p-4 gap-4`；分数徽章固定位置；评论区分割线 `border-border`

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: 空状态插图（需求广场无数据时居中展示）
- **Image Art Direction**: 扁平矢量插画，线条简洁，使用 primary/success/muted 三色，人物抽象无面部细节，传达"发起第一个提议"的邀请感
- **Image Prompt Keywords**: flat vector illustration, minimal line art, collaboration, idea lightbulb, soft blue green palette, no face detail, white background, inviting gesture, business casual style
- **Image Avoidance**: 3D 渲染、写实人物照片、复杂渐变、通用科技齿轮/灯泡素材库风格

## 8. 应避免 (Anti-patterns)

- ❌ 卡片内使用深色/渐变背景破坏白色网格秩序感
- ❌ 橙色 #F59E0B 用作正文字色（对比度不足），仅限角标/图标/大号数字
- ❌ 详情页添加侧边导航或 Footer 分散阅读注意力

## 9. 应用架构 (Architecture)

企业需求收集与整合系统，按「工具需求栏目」组织：管理员创建栏目收集用户对不同工具的需求，全员在栏目内提交需求，管理员可在栏目内整合需求。

### 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 广场概览 PlazaOverviewPage | Tab 容器：需求栏目 Tab（板块选择→栏目卡片）+ 规则 Tab（板块选择→规则列表）；切换 Tab 通过 CSS hidden 保持各区域状态 |
| `/category/:categoryId` | 需求广场 HomePage | 某栏目下的需求卡片网格 + 滚动加载，提交需求为弹窗（带 categoryId），顶部含返回栏目列表 |
| `/demand/:id` | 需求详情 DemandDetailPage | 正文 + 评论区，返回按钮回退上一页 |
| `/merged-demands` | 整合栏目列表 MergedCategoryListPage | 仅 `demand_admin`，板块选择 → 选择栏目进入整合 |
| `/merged-demands/:categoryId` | 需求整合 MergedDemandPage | 管理员可见，按栏目隔离的单一需求表格 + 手动整合 + AI 智能整合 |
| `/rule-plaza` | → 重定向至 `/` | 旧链接兼容 |
| `/rule-management` | 规则管理 RuleManagementPage | 仅管理员，板块选择 → 规则管理 tab（上传/编辑/删除规则）+ 申请审核 tab（通过/驳回加白加黑申请） |

- 全局 Layout：顶部固定操作栏（应用名 + 导航 + 当前用户下拉），导航项为：广场概览、我的需求、需求管理（CanRole 包裹）、规则管理（ShieldCheck 图标，CanRole 包裹）。CanRole roles 均为 ALL_ADMIN_ROLES（demand_admin + 5 个板块管理员角色）。广场概览页（`/`）含两个 Tab：需求栏目（CategoryListPage）与规则（RulePlazaPage），通过 CSS hidden 切换以保持状态

### 前端结构

- `pages/CategoryListPage/`：CategoryListPage（板块选择 → 栏目入口，管理员含管理态）、CategoryCard（通栏栏目卡片，复用）、BoardCard（板块选择卡片，复用，含状态进度条与管理员展示）、CategoryFormDialog（新建/编辑栏目，含板块选择与启用开关）、FormFieldEditor（内容场板块栏目自定义表单字段编辑器，增删字段/配置类型/必填/选项）、status-constants（STATUS_ORDER/PROGRESS_BAR_COLORS 共享常量）
- `pages/MergedCategoryListPage/`：MergedCategoryListPage（管理员整合，板块选择 → 栏目选择，复用 CategoryCard 与 BoardCard）
- `pages/HomePage/`：HomePage（栏目内需求广场）、DemandCard、SubmitDemandDialog（提交带 categoryId）、CustomDemandForm（内容场板块动态表单，根据 formFields 渲染 6 种字段类型：文本/多行文本/日期/链接/图片/下拉单选）
- `pages/DemandDetailPage/`：DemandDetailPage、CommentSection
- `pages/MergedDemandPage/`：MergedDemandPage（栏目内整合，编排+权限守卫+整合模式）、UnifiedDemandTable（支持 formFields 动态列，内容场板块时隐藏标准列并生成自定义列）、ManualMergeDialog、AIMergeDialog（均带 categoryId）、unified-rows（含 customFields 透传）
- `pages/RulePlazaPage/`：RulePlazaPage（板块选择（显示规则数量）→ 规则列表）、RuleCard（规则文件卡片，含下载链接）
- `pages/RuleManagementPage/`：RuleManagementPage（管理员，板块选择 → 规则管理/申请审核双 tab，权限守卫 useUserSections）、RuleUploadDialog（规则上传/编辑弹窗，含文件上传 uploadFile）、ApplicationReviewCard（申请审核卡片，通过/驳回+审批意见弹窗）
- `api/demand-category.ts`、`api/demand.ts`、`api/merged-demand.ts`、`api/rule.ts`：经 `api/index.ts` 以 `demandCategory`/`demand`/`mergedDemand`/`rule` 命名空间导出
- 富文本：背景字段用 TiptapEditorComplete 编辑与只读渲染（HTML）
- 提出部门：栏目可由管理员在 CategoryFormDialog 自定义「提出部门选项」(`demand_category.departments`)；用户提交需求时部门下拉来自所在栏目配置，栏目未配置时回退 SubmitDemandDialog 内置默认列表（均用 shadcn Select，不依赖通讯录数据）
- 板块（section）：预置 5 个板块（消费券&货品板块/追补板块/内容场板块/货架场板块/大促运营工具包板块，定义在 `shared/api.interface.ts` 的 `BOARD_SECTIONS`）；首页先展示板块卡片，选择板块后展示该板块下栏目；管理员在 CategoryFormDialog 中选择栏目所属板块；整合页同样支持板块筛选
- 自定义表单字段（仅内容场板块）：管理员在 CategoryFormDialog 中通过 FormFieldEditor 配置 `form_fields`（字段类型：单行文本/多行文本/日期/链接/图片/下拉单选）；用户提交时根据 `form_fields` 动态渲染 CustomDemandForm（title 自动取第一个文本字段前 50 字符）；需求详情页和整合表格根据 `form_fields` 展示自定义字段值；仅 `section === '内容场板块'` 且 `formFields` 非空时生效，其他板块完全保留原有硬编码表单

### 后端结构

- `server/modules/demand-category/`：DemandCategoryModule，接口前缀 `/api/demand-categories`；`GET /` 公开仅返回启用栏目（含 demandCount），`GET /all`、`POST /`、`PUT /:id` 加 `@CanRole(['demand_admin'])`，写操作加 `@NeedLogin()`；`GET /board-admins` 通过 AuthorizationSDK 查询各板块管理员角色成员，返回 `Record<string, string[]>`（板块名→用户ID列表）
- `server/modules/demand/`：DemandModule，接口前缀 `/api/demands`，list 与 create 按 `categoryId` 隔离；DemandService 已 export 供整合模块复用读取
- `server/modules/merged-demand/`：MergedDemandModule，接口前缀 `/api/merged-demands`，全部加 `@CanRole(['demand_admin'])`，list/source-demands/create 均按 `categoryId` 隔离；`DELETE :id/sources/:demandId` 释放单条关联，剩余关联不足 2 条时自动解散整条整合需求
- `worker/routes/ai.ts`：`POST /api/ai/merge-suggestions` 仅管理员可用，并按栏目板块复用权限校验；服务端读取未整合需求并调用 OpenRouter
- `server/modules/rule/`：RuleModule，接口前缀 `/api/rules`；`GET /` 公开（支持 section/type/status/creator=me 过滤分页），`GET /:id` 公开，`POST /` 加 `@NeedLogin`（type='规则' 需板块管理员权限并自动设 '已通过'，type='加白'/'加黑' 自动设 '待审批'），`PUT /:id`/`DELETE /:id` 加 `@CanRole(ALL_ADMIN_ROLES)`+`@NeedLogin`（仅 type='规则' + section 权限校验），`PATCH /:id/status` 加 `@CanRole(ALL_ADMIN_ROLES)`+`@NeedLogin`（仅 type='加白'/'加黑' + status='待审批' + section 权限校验）。权限校验用 `canManageRuleSection(sectionKey, roles)`，与 `getUserSections` 对 undefined roles 处理一致（视为超管）
- 当前用户从 `req.userContext.userId` 获取

### 数据库

- `demand_category`：工具需求栏目表（name/description/enabled/departments/section/form_fields，departments 为该栏目可选的提出部门候选列表，section 为所属板块名称，form_fields 为 JSONB 存储自定义表单字段定义，仅内容场板块栏目使用）
- `demand`：需求主表（category_id/title/background/expected_value(预期价值类型 gmv/efficiency)/gmv_level/efficiency_affected/efficiency_saved_minutes/department/expected_online_time/demand_type/is_blocking/priority/creator/image/custom_fields，custom_fields 为 JSONB 存储自定义表单提交值，仅内容场板块需求使用）
- `demand_comment`：评论表
- `merged_demand`：整合需求主表（category_id/title/reason）
- `merged_demand_source`：整合需求与原始需求的一对多关联表（merged_demand_id/demand_id），编辑时全量重建
- `rule`：规则与加白加黑申请表（name/type(规则|加白|加黑)/content/reason(可空)/section(coupon|goods|replenish)/file(file_attachment)/effective_time/scope/status(待审批|已通过|已驳回)/creator/reviewer/review_feedback/reviewed_at），idx_rule_status + idx_rule_section 索引
- 需求列表按提交时间 `_created_at` 降序排序；升级时历史需求与整合需求自动归入「默认栏目」

### AI 能力

- `AIMergeDialog` 调用同源 `/api/ai/merge-suggestions`；Worker 读取同栏目未整合需求，限制数量和提示长度，通过服务端 Secret 调用 OpenRouter，并校验、清洗返回的 JSON 分组
- `OPENROUTER_MODEL` 可配置模型，未配置时使用安全默认值；`OPENROUTER_API_KEY` 仅允许配置为 Worker Secret

### 权限

- 平台角色 `demand_admin`（需求管理员）可管理全部需求板块。板块管理员角色（admin_goods/admin_coupon/admin_replenish/admin_content/admin_shelf/admin_campaign）仅管理各自板块
- 规则模块权限：`RULE_SECTIONS` 定义 3 个规则板块（coupon=营销优惠规则/goods=货品规则/replenish=加白规则），每个板块对应一个 adminRole（admin_coupon/admin_goods/admin_replenish）。`canManageRuleSection(sectionKey, roles)` 校验逻辑：demand_admin 可管理全部板块，板块管理员仅管理对应板块。前端 `useUserSections` 返回 board section names，需映射到 rule section keys（coupon/goods → 消费券&货品板块，replenish → 追补板块）
