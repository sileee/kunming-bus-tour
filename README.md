# 昆明公交旅游路线数据可视化平台

> 课设项目 · 公交路线数据可视化 · 前后端分离 + 纯静态部署
>
> V5.1 | 2026-06 | 自定义域名：`www.kunming-bus-tour.top`

---

## 目录

- [项目概述](#项目概述)
- [线上访问地址](#线上访问地址)
- [数据联动机制](#数据联动机制)
- [系统运行架构](#系统运行架构)
- [技术栈](#技术栈)
  - [前端](#前端)
  - [后端（本地开发与真实部署扩展）](#后端本地开发与真实部署扩展)
  - [游客导览子系统](#游客导览子系统)
  - [客流仿真引擎](#客流仿真引擎)
- [V5.1 核心改造](#v51-核心改造)
- [运行与部署](#运行与部署)
  - [本地开发](#本地开发)
  - [线上部署](#线上部署)
  - [项目文件结构](#项目文件结构)
- [验收演示流程](#验收演示流程)
- [版本迭代说明](#版本迭代说明)

---

## 项目概述

本项目面向昆明公交旅游出行场景，构建了一个集景点导览、公交路线展示、客流仿真、数据采集、地图可视化和后台管理于一体的 Web 应用。线上首页采用手绘 scrapbook 风格的景点导览页，游客可直接浏览 12 个昆明景点、4 条推荐路线和 8 道本地美食，无需注册或登录。

管理端入口位于首页右上角云朵图标，并独立部署在 `/admin.html`。管理员登录后可使用运营总览 KPI、可视化大屏、动态地图、数据采集、线路管理和 ECharts 数据分析等功能。生产环境采用浏览器端 Mock API 支撑完整演示流程，本地开发环境可切换至 Express 后端接口。

**系统按游客端和管理端进行职责分离**：

| 角色 | 能做什么 | 入口 |
|------|---------|------|
| 游客 | 景点卡片、游玩攻略、公交线路推荐、高德地图导览、本地美食展示 | 首页 `/` |
| 管理员 | 登录后：运营总览、可视大屏、动态地图、线路 CRUD、数据采集、ECharts 分析 | `/admin.html`（角落云朵图标） |

游客端强调信息浏览效率和旅游场景体验，管理端强调数据监控、采集管理和可视化分析，两类页面在入口、功能范围和视觉风格上均保持隔离。

---

## 线上访问地址

| 类型 | 地址 | 用途 |
|------|------|------|
| 自定义域名（主地址） | `https://www.kunming-bus-tour.top` | 课设展示与对外访问，Cloudflare Pages 托管 |
| Cloudflare 默认域名 | `https://kunming-bus-tour.pages.dev` | 自动部署预览与 DNS 备用访问 |
| EdgeOne 备用地址 | `https://kunming-bus-tour-om27p1wk.edgeone.cool` | 国内网络备用演示地址 |

当前线上版本采用纯静态部署：前端页面由 Cloudflare Pages / EdgeOne Pages 托管，生产环境通过浏览器端 `mockApi.ts` 提供同名 API 数据，用于无服务器环境下完整演示游客端、管理端、采集联动和图表分析。

---

## 数据联动机制

系统并非静态数据展示页面，而是内置了客流仿真与采集联动机制。后台“数据采集”页面启动自动采集后，系统每隔 1.5 秒生成 3 条线路的模拟车载传感器数据，包括运行速度、满载率和车内人数。

采集样本写入后，会驱动运营总览 KPI、可视化大屏、线路热度排行、数据分析图表和地图遥测面板同步刷新，形成“采集样本 → 模型计算 → 指标更新 → 可视化展示”的闭环链路。

客流计算基于改进重力模型，综合考虑站点区位、线路类型、季节因素、节假日因素和小时级出行特征，得到各线路的理论客流量。采集样本通过指数平滑（α=0.35）融合进模型预测值，形成 `模型 × 0.65 + 观测 × 0.35` 的混合结果。

因此，系统能够在演示过程中持续产生可观察的数据变化，模拟公交调度和运营监控场景中的动态趋势。

---

## 系统运行架构

```
浏览器打开网页
    │
    ├── 首页 / → public/index.html → 手绘景点导览（纯静态页面）
    │
    ├── /admin.html → Vue 启动 → 显示登录页
    │        │
    │        ▼ 登录成功
    │   App.vue（侧边栏 + 路由）
    │        │
    │   ┌────┴────┬────────┬─────────┬──────────┐
    │   ▼         ▼        ▼         ▼          ▼
    │ Dashboard BigScreen  Map  Collection  Analytics ...
    │        │
    │        ▼
    │   api.ts  ← 所有组件只调这一层
    │        │
    │   检测：baseUrl 为空 && 是生产环境？
    │        │
    │   ┌────┴────┐
    │   ▼ YES     ▼ NO
    │ mockApi.ts  fetch() 请求
    │ (浏览器内)  → Express 后端
    │        │        │
    │        └───┬────┘
    │            ▼
    │    data / state（routes/stops/spots/采集样本/趋势缓冲）
    │            │
    │            ▼
    │   客流仿真引擎（Gravity Model v2）
    │   · 重力模型 · 距离衰减 · 空间竞争
    │   · 月份系数 · 节假日系数 · 小时因子
    │   · 随机扰动（截断正态）
```

**关键设计**：`api.ts` 是统一 API 入口。业务组件不直接依赖具体数据来源；本地开发环境请求 Express 后端，生产静态部署环境请求浏览器端 Mock API。两种模式保持一致的接口签名，从而降低部署形态切换对业务组件的影响。

---

## 技术栈

### 前端

| 技术项 | 选型 | 作用 |
|------|---------|---------|
| 框架 | Vue 3（Composition API + `<script setup>`） | 所有组件 |
| 构建 | Vite 6 | 开发热更新 + 多页面打包（admin / tourist 两个 Vue 入口，首页由静态 `index.html` 承载） |
| 类型 | TypeScript | 类型定义 + `vue-tsc` 编译检查 |
| 后台 UI | Element Plus | 表格、表单、弹窗、消息提示 |
| 图表 | ECharts 5 | 运营总览饼图柱图、数据分析双线图、2×2 图表面板 |
| 地图 | Leaflet + 高德 JSAPI 2.0 | 动态地图页：Leaflet 加载高德瓦片底图，Driving API 拉真实道路路径 |
| 地图效果 | leaflet-ant-path + leaflet.heat | 蚂蚁线箭头动画 + 景点热力图 |
| 大屏 | @antv/l7 | 可视化大屏的地理图层分析 |

**13 个组件**：

```
DashboardView    — 运营总览（KPI 卡片 + 路线热榜 + 华容道路网拼图）
BigScreenView    — 可视化大屏（全屏，答辩投屏用）
MapView          — 动态地图（Leaflet + 高德行车路径 + 站点标注）
RouteDetailView  — 线路详情（站点时间线 + 拥挤度/准点率指标）
AnalyticsView    — 数据分析（客流排行 + 景点热度 + 区域分布 + 准点率-拥挤度双线图）
CollectionView   — 数据采集（自动引擎 + 手动补录 + 实时趋势 + CSV 导出）
ChartPanel       — 图表面板（饼图/柱图/折线 2×2 网格）
AdminView        — 后台 CRUD（线路增删改 + 筛选 + 景点热度刷新）
LoginView        — 登录页
ToastStack       — 全局 Toast 消息
TouristApp       — 游客导览容器（手绘风，地图/景点/线路三 Tab 切换）
TouristMap       — 游客地图（高德 JSAPI 2.0 + 公交路线 + 景点弹出气泡）
TouristSpots/TouristRoutes/TouristDetail — 游客卡片网格、线路推荐、详情弹窗
```

### 后端（本地开发与真实部署扩展）

| 技术项 | 选型 | 
|------|---------|
| 运行时 | Node.js ≥18 |
| 框架 | Express 4 |
| 认证 | JWT（jsonwebtoken），24 小时过期 |
| 数据库 | 可选 MySQL 8（默认用内存 file 模式，不需要装数据库就能跑） |

18 个 API 端点：线路 CRUD、景点查询、站点详情（含附近线路和景点）、统计总览、客流趋势、采集样本增删查、CSV 导出、登录验证、景点热度重算。

### 游客导览子系统

游客导览子系统为独立页面，与管理端功能解耦。页面使用 Google Fonts 手写字体（Kalam + Patrick Hand）、点阵背景、不规则边框、胶带和图钉等视觉元素，形成面向旅游导览场景的手绘风格界面。

功能范围包括：高德地图展示 10 条公交线路与路线动画、12 个景点标注气泡、景点卡片攻略展开、线路卡片推荐以及景点与线路的关联查看。

### 客流仿真引擎

客流仿真模型参考了 5 篇相关研究文献，用于支撑参数选取与趋势模拟：

- Zhao et al. (2024, *Sustainability*) — 重力模型理论框架
- Yang et al. (2023, *JTR*) — 距离衰减参数：旅游线路 γ=1.25，常规 γ=0.85
- Rong et al. (2023) — 空间竞争：4km 半径内景点越多，单点客流越分散
- Zhou et al. (2025) — 节假日乘数：春节 1.48×、国庆 1.50×、周末 1.24×
- Ren et al. (2025, *TRR*) — 时间因子：早高峰 1.38× / 午间 0.70× / 夜间仅 0.10×

基本公式：线路客流 = Σ 所有 OD 对的 (起点区质量 × 终点区质量 × 距离衰减) × 线路类型系数 × 季节系数 × 节假日系数 × 时段系数 × 空间竞争系数 × 随机噪声。

---

## V5.1 核心改造

早期版本依赖 Express 后端运行，线上部署需要服务器或 Serverless API。V5.1 面向 Cloudflare Pages / EdgeOne Pages 等静态托管环境进行了部署适配，使项目在无后端进程的情况下仍可完成完整演示。

核心实现是在 `frontend/src/mockApi.ts` 中实现浏览器端 Mock API：

- 数据查询 → TypeScript 常量数组（28 站 + 12 景点 + 10 线路）
- 客流仿真 → 完整移植重力模型引擎到前端
- 采集存储 → 浏览器内存数组
- 登录验证 → Base64 编码的简化 JWT（exp 过期检查，零依赖）
- CSV 导出 → Blob + URL.createObjectURL
- 趋势快照 → setInterval 每 30 秒

该模块约 550 行。生产环境未配置 `VITE_API_BASE_URL` 时，`api.ts` 自动切换至 Mock API；本地开发环境仍然可通过 `fetch` 请求 Express 后端。该设计保证同一套前端组件能够适配静态演示版和真实后端版两种运行方式。

---

## 运行与部署

### 本地开发

```bash
# 装后端依赖并启动
cd backend
npm install
npm run dev          # http://localhost:3000

# 另开终端，装前端依赖并启动
cd frontend
npm install
npm run dev          # http://localhost:5173
```

前端 `.env` 里设了 `VITE_API_BASE_URL=http://localhost:3000`，开发时自动走 Express。

### 线上部署

代码推到 GitHub 后，由 Cloudflare Pages 自动构建并部署。Cloudflare Pages 配置如下：

| 配置项 | 值 |
|------|------|
| Production branch | `main` |
| Build command | `cd frontend && npm install && npm run build` |
| Build output directory | `frontend/dist` |
| Custom domain | `www.kunming-bus-tour.top` |

同时保留 EdgeOne Pages 配置，便于国内网络备用演示。EdgeOne 需要 `edgeone.json`：

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist"
}
```

高德地图需要把线上域名加到 Key 的白名单里，否则地图不显示。

### 项目文件结构

```
项目根/
├── README.md
├── edgeone.json                 # EdgeOne Pages 构建配置
├── vercel.json / render.yaml   # Vercel 和 Render 的备选配置
├── .gitignore
│
├── frontend/                    # Vue 3 + Vite + TS
│   ├── index.html               # → 首页源码（手绘景点导览，兼容本地预览）
│   ├── admin.html               # → 管理员后台入口
│   ├── tourist.html             # → 游客导览（移动端适配版）
│   ├── vite.config.ts           # admin / tourist 两个 Vue 构建入口配置
│   ├── public/index.html        # → EdgeOne Pages 首页静态文件
│   ├── package.json
│   ├── .env.example
│   ├── .env.production
│   └── src/
│       ├── main.ts              # 后台入口（/admin.html 加载）
│       ├── App.vue              # 侧边栏 + 路由 + 登录态 + 主题 + 采集引擎
│       ├── api.ts               # 统一 API 层（生产 → mockApi / 开发 → fetch）
│       ├── mockApi.ts           # 浏览器端后端（~550 行）
│       ├── types.ts / styles.css
│       ├── components/          # 12 个后台组件
│       └── tourist/             # 游客子系统（5 个组件）
│
├── backend/                     # Express 后端（本地开发用）
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js            # 18 个 API 路由
│       ├── authMiddleware.js    # JWT 签发 + 验证
│       ├── data/kunmingTransitData.js  # 静态数据
│       └── repositories/        # file 模式 + mysql 模式
│
├── ppt/成果展示.pptx
└── 项目式实训课程计划.docx
```

---

## 验收演示流程

本流程用于现场答辩、项目验收和线上部署回归检查，覆盖游客端、管理端、静态部署、数据联动和可视化核心链路。

| 阶段 | 验收点 | 操作路径 | 预期结果 |
|------|--------|----------|----------|
| 1 | 线上静态首页 | 访问 `https://www.kunming-bus-tour.top/` | 首屏展示手绘景点导览页，无登录门槛，无接口报错 |
| 2 | 游客导览能力 | 浏览景点卡片、展开景点攻略、切换美食区域 | 可查看 12 个景点、4 条推荐线路、8 道本地美食，游客端不出现管理功能 |
| 3 | 管理端入口隔离 | 点击首页角落云朵图标，或直接访问 `/admin.html` | 进入管理员登录页，证明游客端与管理端入口分离 |
| 4 | 认证与后台总览 | 完成管理员登录，进入运营总览 | 展示线路、站点、景点、动态客流等 KPI 指标和线路热度排行 |
| 5 | 数据采集链路 | 进入“数据采集”，启动自动采集任务 | 系统持续生成速度、载客人数、满载率等采集样本，样本数实时增长 |
| 6 | 可视化联动 | 切换到“数据分析”和“可视化大屏” | ECharts 图表、排行、KPI 指标随采集数据刷新，体现数据驱动闭环 |
| 7 | 地图展示能力 | 打开“动态地图”页面并查看线路/景点 | 公交线路、站点、景点标注和地图动效正常展示 |
| 8 | 主题与体验完整性 | 切换明暗主题，再返回游客端首页 | 管理端主题切换正常，游客端和管理端视觉风格保持区分 |
| 9 | 静态部署验证 | 确认线上无需启动 Express 后端 | 生产环境由 `mockApi.ts` 在浏览器端提供同名接口，页面刷新后仍可运行 |

---

## 版本迭代说明

项目按“基础能力 → 可视化增强 → 游客端拆分 → 权限隔离 → 边缘云部署”的路径迭代，保证每个版本都有明确交付目标、工程改动和验收结果。

| 版本 | 交付目标 | 核心改动 | 验收结果 |
|------|----------|----------|----------|
| V1.0 | 完成基础全栈原型 | 搭建 Vue 3 + Express 项目结构，整理公交线路、站点、景点基础数据，建立 REST API 雏形 | 前后端可本地联调，线路和景点数据可正常查询 |
| V2.0 | 建立数据可视化主流程 | 接入 ECharts、动态地图、运营总览、线路详情、后台管理等核心页面 | 形成“线路数据查询 → 地图展示 → 图表分析”的闭环 |
| V3.0 | 增强动态数据能力 | 增加数据采集引擎、客流仿真模型、CSV 导出、趋势快照和多图表联动 | 采集样本可驱动 KPI、排行、地图和图表实时变化 |
| V3.1-V3.2 | 优化模型与展示效果 | 升级 Gravity Model v2，引入时段、节假日、距离衰减、空间竞争等参数；完善高德真实路线和主题切换 | 数据变化更接近真实交通调度场景，演示稳定性提升 |
| V4.0 | 拆分游客端体验 | 新增 `tourist.html` 和 `frontend/src/tourist/`，游客端采用手绘 scrapbook 风格，管理端保持数据大屏风格 | 游客浏览路径和后台管理路径分离，避免普通用户看到管理控件 |
| V5.0 | 完成权限隔离 | 新增 JWT 登录认证、管理员路由保护、登录态持久化和退出登录能力 | 管理接口需要 Token，游客端无需登录即可浏览 |
| V5.1 | 适配静态边缘部署 | 首页改为手绘景点导览页，管理员入口迁移至 `/admin.html`；新增 `mockApi.ts`，生产环境无后端时由浏览器端 Mock API 提供同名接口；清理敏感配置和无关交付物；接入 Cloudflare Pages 自定义域名 | `www.kunming-bus-tour.top`、Cloudflare 默认域名和 EdgeOne 备用地址均可访问，游客端、管理端、数据采集和可视化联动均可在线演示 |

**当前生产部署形态**：

```text
Cloudflare Pages / EdgeOne Pages 静态托管
    ├── www.kunming-bus-tour.top  自定义域名主入口
    ├── /                         手绘景点导览首页
    ├── /tourist.html             游客导览页
    ├── /admin.html               管理端入口
    └── mockApi.ts                浏览器端模拟后端接口
```

**可扩展生产形态**：

```text
自有域名 / 云服务器 / Serverless API
        ↓
Express 或云函数 API
        ↓
MySQL / 云数据库
```

当前仓库保留 `backend/`、`database/schema.sql`、`database/seed.sql` 和 MySQL Repository，后续可从 V5.1 静态演示版平滑升级为真实数据库部署版。

---

> 源码：[github.com/sileee/kunming-bus-tour](https://github.com/sileee/kunming-bus-tour)
>
> 部署：Cloudflare Pages（自定义域名）/ EdgeOne Pages（备用） · 前端 Vue 3 + Vite · 后端 Express（本地）/ 浏览器 Mock（生产） · 地图 高德 JSAPI
