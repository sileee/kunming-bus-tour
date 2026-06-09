# 昆明公交旅游路线数据可视化平台

> **Kunming Bus Tour Route Data Visualization Platform**
>
> 智慧城市 · 公共交通数据可视化场景 · 项目式实训课程设计成果
>
> 版本：V5.1 &nbsp;&nbsp;|&nbsp;&nbsp;日期：2026-06-09 &nbsp;&nbsp;|&nbsp;&nbsp;部署：EdgeOne Pages（腾讯云纯静态托管）

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 系统实现逻辑](#2-系统实现逻辑)
- [3. 技术路线（作品 + 文档 + 源码）](#3-技术路线作品--文档--源码)
  - [3.1 前端工程（Frontend）](#31-前端工程frontend)
  - [3.2 后端工程（Backend）](#32-后端工程backend)
  - [3.3 浏览器端 Mock API（V5.1 核心创新）](#33-浏览器端-mock-api51-核心创新)
  - [3.4 游客导览子系统（Tourist）](#34-游客导览子系统tourist)
  - [3.5 客流仿真模型](#35-客流仿真模型)
  - [3.6 项目文档与演示材料](#36-项目文档与演示材料)
- [4. 部署过程（V5.1 — EdgeOne Pages 纯静态托管）](#4-部署过程51--edgeone-pages-纯静态托管)
  - [4.1 部署方案演进](#41-部署方案演进)
  - [4.2 当前部署架构](#42-当前部署架构)
  - [4.3 部署步骤详解](#43-部署步骤详解)
  - [4.4 本地开发 vs 线上生产](#44-本地开发-vs-线上生产)
- [5. 项目结构总览](#5-项目结构总览)
- [6. 使用说明](#6-使用说明)
- [附录](#附录)

---

## 1. 项目概述

本平台以**昆明市公交旅游路线**为数据基础，构建了一个集**数据采集、客流仿真、统计分析和可视化展示**于一体的公交数据管理平台。平台面向公交运营管理者与游客两类用户：

| 用户角色 | 核心功能 | 入口 |
|---------|---------|------|
| **公交运营管理者** | 运营总览、可视化大屏、动态地图、数据采集、线路管理、数据分析 | `index.html`（管理后台，需登录） |
| **游客** | 景点浏览、路线推荐、地图导览 | `tourist.html`（游客导览页） |

**核心亮点**：

- 基于学术文献的**重力模型（Gravity Model v2）客流仿真引擎**，融合节假日系数、时间因子、空间竞争模型
- 支持**实时数据采集**与**模型-观测混合预测**（指数平滑法，α = 0.35）
- **纯浏览器端运行全部后端逻辑**，零服务器成本部署

---

## 2. 系统实现逻辑

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │ 运营总览  │   │ 可视化大屏│   │ 动态地图  │   │  数据分析     │ │
│  │Dashboard │   │BigScreen │   │  MapView │   │  Analytics   │ │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────┬───────┘ │
│       │              │              │                 │         │
│       └──────────────┴──────────────┴─────────────────┘         │
│                            │                                     │
│                     ┌──────┴──────┐                              │
│                     │   api.ts    │  ← 统一 API 调用层           │
│                     │ 自动检测    │  ← 生产环境 → Mock           │
│                     │ Real/Mock   │  ← 开发环境 → 真实后端       │
│                     └──────┬──────┘                              │
│              ┌─────────────┴─────────────┐                       │
│              │  开发环境     │  生产环境   │                      │
│              │  fetch() 请求  │  mockApi.ts │                     │
│              │  → Express    │  → 浏览器内  │                    │
│              └───────┬───────┴──────┬──────┘                     │
│                      │              │                            │
│  ┌───────────────────┴──────────────┴─────────────────────────┐ │
│  │                   data / state 层                           │ │
│  │  · routes[]    10条公交线路（站点、景点关联）               │ │
│  │  · stops[]     28个公交站点                                 │ │
│  │  · spots[]     12个昆明景点                                 │ │
│  │  · collectionSamples[]  车辆运行采集样本                    │ │
│  │  · trendBuffer[]        趋势快照环形缓冲区                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                     ┌──────┴────────┐                            │
│                     │  客流仿真引擎   │                           │
│                     │  Gravity Model │                           │
│                     │  v2            │                           │
│                     │  · 重力模型    │                           │
│                     │  · 距离衰减    │                           │
│                     │  · 空间竞争    │                           │
│                     │  · 时间因子    │                           │
│                     │  · 节假日系数  │                           │
│                     └───────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

1. 用户操作界面组件（Dashboard / BigScreen / Map 等）
2. 组件通过 `api.ts` 统一接口层请求数据
3. `api.ts` 检测运行环境：
   - **本地开发**（`VITE_API_BASE_URL=http://localhost:3000`）→ 真实 HTTP 请求到 Express 后端
   - **线上生产**（`VITE_API_BASE_URL` 为空且 `PROD=true`）→ 调用 `mockApi.ts` 在浏览器内运行
4. `mockApi.ts` 内部维护数据状态、客流仿真引擎、JWT 登录模拟
5. 数据经 Vue 响应式系统驱动 UI 更新

### 2.3 登录认证流程

```
用户输入用户名/密码
    │
    ▼
api.login(username, password)
    │
    ├── 开发模式 → POST /api/auth/login → Express → JWT 签名 → 返回 token
    │
    └── 生产模式 → mockApi.ts → simpleJwtSign() → Base64 编码 → 返回 token
                        │
                        ▼
              前端存储 token 到 localStorage
                        │
                        ▼
              后续请求携带 Authorization: Bearer <token>
                        │
              后端/ Mock 验证 → 鉴权通过 → 返回数据
```

---

## 3. 技术路线（作品 + 文档 + 源码）

### 3.1 前端工程（Frontend）

**技术栈**

| 层级 | 选型 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Vue 3 (Composition API) | ^3.5.13 | 组件化 UI 开发 |
| 构建工具 | Vite | ^6.0.7 | 开发服务器 + 生产构建 |
| 类型系统 | TypeScript | ^5.7.2 | 静态类型检查 |
| UI 组件库 | Element Plus | ^2.14.0 | 表格、表单、消息提示 |
| 数据可视化 | ECharts | ^5.6.0 | 运营总览图表、数据分析图表 |
| 地图引擎 | Leaflet + 高德地图 JSAPI 2.0 | ^1.9.4 | 动态地图、公交线路绘制、热力图 |
| 地图特效 | leaflet-ant-path + leaflet.heat | ^1.3.0 | 线路蚂蚁线动画、景点热力图 |
| 地理分析 | @antv/l7 | ^2.25.4 | 高级地理可视化（大屏模式） |

**源码结构**

```
frontend/
├── src/
│   ├── main.ts                      # 管理后台入口
│   ├── App.vue                      # 根组件（路由、侧边栏、全局状态管理）
│   ├── api.ts                       # ★ 统一 API 层（Real ↔ Mock 自适应切换）
│   ├── mockApi.ts                   # ★ V5.1 浏览器端完整后端逻辑（约 550 行）
│   ├── styles.css                   # 全局样式（暗色/亮色 CSS 变量主题）
│   ├── types.ts                     # TypeScript 类型定义
│   ├── env.d.ts                     # Vite 环境变量类型声明
│   ├── leaflet-plugins.d.ts        # Leaflet 插件类型补丁
│   ├── data/
│   │   └── busData.ts              # 前端侧数据常量
│   ├── components/
│   │   ├── DashboardView.vue        # 运营总览（KPI 指标卡片 + 路线热榜 + 华容道游戏）
│   │   ├── BigScreenView.vue        # 可视化大屏（全屏展示，适合答辩投屏）
│   │   ├── MapView.vue              # 动态地图（Leaflet + 高德驾驶路径 + 箭头动画）
│   │   ├── RouteDetailView.vue      # 线路详情（站点时间线 + 运营指标）
│   │   ├── AnalyticsView.vue        # 数据分析（ECharts 客流排行/热度/拥挤度/准点率）
│   │   ├── CollectionView.vue       # 数据采集（自动/手动采集 + 实时趋势图 + CSV 导出）
│   │   ├── ChartPanel.vue           # 图表面板（饼图、趋势图 2×2 网格布局）
│   │   ├── AdminView.vue            # 后台管理（线路 CRUD + 列表筛选）
│   │   ├── LoginView.vue            # 登录页
│   │   └── ToastStack.vue           # 全局消息提示组件
│   └── tourist/
│       ├── main.ts                  # 游客导览入口
│       ├── TouristApp.vue           # 游客导览根组件
│       ├── TouristMap.vue           # 游客地图（高德地图 JSAPI 2.0）
│       ├── TouristSpots.vue         # 景点卡片网格（可展开游玩攻略）
│       ├── TouristRoutes.vue        # 路线推荐卡片
│       ├── TouristDetail.vue        # 景点/路线详情弹窗
│       ├── tourist-api.ts           # 游客侧 API 封装
│       ├── spotGuides.ts            # 12 个景点导游文案数据
│       └── tourist-styles.css       # 手绘 scrapbook 风格样式
├── index.html                       # 管理后台 HTML 入口
├── tourist.html                     # 游客导览 HTML 入口
├── vite.config.ts                   # Vite 构建配置（多页面入口）
├── tsconfig.json                    # TypeScript 配置
├── .env                             # 本地开发环境变量（不提交 Git）
├── .env.example                     # 环境变量模板
└── .env.production                  # 生产环境变量（V5.1 新增，提交 Git）
```

### 3.2 后端工程（Backend）

**技术栈**

| 层级 | 选型 | 版本 | 用途 |
|------|------|------|------|
| 运行时 | Node.js | ≥18 | JavaScript 服务端 |
| Web 框架 | Express | ^4.21.2 | RESTful API 路由 + 中间件 |
| 认证 | jsonwebtoken (JWT) | ^9.0.3 | 无状态 Token 认证（24h 过期） |
| 跨域 | cors | ^2.8.5 | CORS 中间件 |
| 数据库驱动 | mysql2 | ^3.11.5 | MySQL 连接池（可选，默认用 file 模式） |
| 环境管理 | dotenv | ^16.4.7 | .env 环境变量加载 |

**源码结构**

```
backend/
├── src/
│   ├── server.js                    # ★ Express 服务入口 + 全部 18 个 API 路由
│   ├── authMiddleware.js            # ★ JWT 认证中间件（生成 + 验证）
│   ├── data/
│   │   └── kunmingTransitData.js    # ★ 昆明公交静态数据（28 站点 + 12 景点 + 10 线路）
│   └── repositories/
│       ├── index.js                 # 数据仓库选择器（环境变量 DATA_MODE 控制）
│       ├── fileRepository.js        # ★ 文件模式：内存数据 + 客流仿真引擎（约 500 行）
│       └── mysqlRepository.js       # MySQL 模式（生产环境可选）
├── package.json
├── .env                             # 本地环境变量（不提交 Git）
└── .env.example                     # 环境变量模板（提交 Git）
```

**API 接口清单**（共 18 个端点）

| 方法 | 路径 | 认证 | 说明 |
|------|------|:--:|------|
| GET | `/api/health` | — | 健康检查 + 数据模式 |
| POST | `/api/auth/login` | — | 管理员登录 |
| POST | `/api/auth/verify` | ✅ | Token 有效性验证 |
| GET | `/api/routes` | — | 公交线路列表（支持 keyword/type/spotId 筛选） |
| GET | `/api/routes/:id` | — | 线路详情（含站点、景点、统计数据） |
| GET | `/api/stops` | — | 站点列表 |
| GET | `/api/stops/:id` | — | 站点详情（含关联线路、附近景点） |
| GET | `/api/spots` | — | 景点列表（含动态热度） |
| GET | `/api/statistics/overview` | — | 运营总览指标（线路数/站点数/客流/准点率） |
| GET | `/api/statistics/routes` | — | 各线路统计数据 |
| GET | `/api/statistics/trend` | — | 客流趋势（环形缓冲区，60 个快照） |
| GET | `/api/collection/samples` | — | 采集样本列表（支持 routeId/limit 筛选） |
| POST | `/api/collection/samples` | — | 新增采集样本（含数据校验） |
| GET | `/api/collection/summary` | — | 采集汇总统计 |
| GET | `/api/collection/samples/export` | — | CSV 导出（BOM 头，兼容中文 Excel） |
| POST | `/api/admin/routes` | ✅ | 新增线路 |
| PUT | `/api/admin/routes/:id` | ✅ | 更新线路 |
| DELETE | `/api/admin/routes/:id` | ✅ | 删除线路 |
| POST | `/api/admin/recalculate-heat` | ✅ | 重算景点热度 |

### 3.3 浏览器端 Mock API（V5.1 核心创新）

> **这是 V5.1 版本相对于之前版本的最大变化。**

**背景**：EdgeOne Pages 是纯静态文件托管平台，无法运行 Node.js Express 后端进程。为保障课设完整展示，我们将后端**全部业务逻辑**迁移至前端浏览器中运行。

**实现方案**：新建 `frontend/src/mockApi.ts`（约 550 行），完整替代 Express 后端：

| 后端功能 | Mock 实现方式 | 代码行数 |
|---------|-------------|:--:|
| 数据查询（routes/stops/spots） | 复用 `kunmingTransitData.js` 数据结构，TypeScript 常量 | ~80 行 |
| 客流仿真（Gravity Model v2） | 完整移植——重力模型、距离衰减、空间竞争、节假日/时间因子 | ~200 行 |
| 采集样本存储 | 浏览器内存 `collectionSamples[]` 数组 | ~50 行 |
| JWT 登录认证 | 简化版 JWT（Base64 编码 + exp 过期检查），零 npm 依赖 | ~30 行 |
| CSV 导出 | `Blob` + `URL.createObjectURL` 浏览器端生成下载 | ~20 行 |
| 趋势快照 | `setInterval` 30 秒定时采集到 `trendBuffer[]` | ~20 行 |
| 线路 CRUD | 直接操作内存中的 `routes[]` 数组 | ~50 行 |

**自适应切换机制**（核心代码在 `api.ts` 中）：

```typescript
// 生产环境无后端时自动启用浏览器端 Mock
const useMock = !baseUrl && import.meta.env.PROD;
```

| 环境 | `baseUrl` | `PROD` | `useMock` | 数据来源 |
|------|-----------|--------|-----------|---------|
| 本地开发 | `http://localhost:3000` | `false` | `false` | Express 后端 |
| 线上部署 | `""` (空字符串) | `true` | `true` | mockApi.ts |

**关键设计原则**：`api.ts` 对外接口签名完全不变，`App.vue` 和各组件代码**零修改**。前端代码完全不感知数据来源是真实后端还是浏览器 Mock。

### 3.4 游客导览子系统（Tourist）

独立的 Vite 多页面入口（`tourist.html`），面向游客用户：

**设计风格**：
- 手写 scrapbook 美学（Google Fonts: Kalam + Patrick Hand）
- graph-paper 点阵背景
- wobbly 不规则边框、tape/tack 物理装饰元素
- 与管理员后台的科技暗色风格完全区分

**功能模块**：
| 模块 | 组件 | 说明 |
|------|------|------|
| 动态地图 | `TouristMap.vue` | 高德地图 JSAPI 2.0，公交线路箭头动画 + 景点标注 |
| 景点浏览 | `TouristSpots.vue` | 12 个景点卡片网格，点击展开完整游玩攻略 |
| 路线推荐 | `TouristRoutes.vue` | 10 条公交旅游线路卡片 |

**权限分离**：游客看不到 KPI 面板、数据表格、图表、数据采集控件、后台管理等管理功能。

### 3.5 客流仿真模型

> 基于 5 篇学术文献构建，详见 `backend/src/repositories/fileRepository.js` 和 `frontend/src/mockApi.ts` 中的注释。

**模型公式**：

```text
PassengerFlow(route) = Σᵢⱼ (M_i × M_j × d_ij^(-γ)) × gravityScale
  × RouteTypeFactor × MonthSeasonality × HolidayBoost
  × HourFactor × SpatialCompetition × StochasticNoise
```

**学术依据**：

| 模型组件 | 依据文献 | 核心方法 |
|---------|---------|---------|
| 重力模型 | Zhao et al. (2024, Sustainability) | `Flow_ij = M_i × M_j × f(d_ij)` |
| 距离衰减 | Yang et al. (2023, JTR) | `f(d) = d^(-γ)`，旅游线路 γ=1.25，常规线路 γ=0.85 |
| 干预机会 | Rong et al. (2023) | 4km 半径内景点竞争系数：`1/(1 + N × 0.12)` |
| 节假日系数 | Zhou et al. (2025) | 春节 1.48×、国庆 1.50×、周末 1.24× |
| 时间因子 | Ren et al. (2025, TRR) | 早高峰 1.38×、午间低谷 0.70×、夜间 0.10× |

**采集数据融合**：采集样本通过指数平滑（α = 0.35）修正模型预测：

```text
finalFlow = modelFlow × 0.65 + observedFlow × 0.35
```

### 3.6 项目文档与演示材料

| 文档 | 路径 | 内容 |
|------|------|------|
| **项目说明文档** | `README.md`（本文件） | 项目概述、实现逻辑、技术路线、部署过程 |
| **PPT 演示文稿** | `ppt/成果展示.pptx` | 课设答辩演示用 |
| **PPT 构建脚本** | `ppt/build_deck.mjs` | 自动生成 PPT |
| **实训课程计划** | `项目式实训课程计划.docx` | 课程设计文档 |
| **EdgeOne 配置** | `edgeone.json` | EdgeOne Pages 构建配置 |
| **Vercel 备选** | `vercel.json` / `api/express.js` | Vercel Serverless 备选部署方案 |
| **Render 备选** | `render.yaml` | Render 一键部署备选方案 |

---

## 4. 部署过程（V5.1 — EdgeOne Pages 纯静态托管）

### 4.1 部署方案演进

| 版本 | 部署方式 | 前端 | 后端 | 月费 | 状态 |
|------|---------|------|------|:--:|:--:|
| v1.0 | 本地开发 | Vite Dev Server (:5173) | Node Express (:3000) | — | 开发阶段 |
| v3.0 | 本地开发 | Vite Dev Server | Express file 模式 | — | 课堂演示 |
| v4.0 | Render 方案 | 与后端合并在同一服务 | Express（免费 750h/月） | ¥0 | 备用（需绑卡） |
| v4.1 | Vercel 方案 | 静态托管 | Serverless Functions | ¥0 | 备用 |
| **v5.1** | **EdgeOne Pages** | **纯静态托管** | **浏览器端 Mock API ★** | **¥0** | **当前方案** |

**V5.1 选择 EdgeOne Pages 的原因**：

1. **完全免费**：无需绑定银行卡
2. **国内访问快**：腾讯全球 CDN 节点，中国大陆低延迟
3. **无需后端服务器**：`mockApi.ts` 在浏览器内运行全部后端逻辑
4. **Git 自动部署**：推送到 GitHub 自动触发构建和部署
5. **配置简单**：一个 `edgeone.json` 文件即可

### 4.2 当前部署架构

```
┌─────────────────────────────────────────────────────┐
│                   GitHub 仓库                         │
│           github.com/sileee/kunming-bus-tour         │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  源代码（frontend/ + backend/ + 配置文件）      │  │
│  └────────────────────┬───────────────────────────┘  │
└───────────────────────┼──────────────────────────────┘
                        │ git push (SSH: git@github.com)
                        ▼
┌─────────────────────────────────────────────────────┐
│              EdgeOne Pages（腾讯云）                   │
│                                                      │
│  ① 检测到 Git 更新，触发自动构建                      │
│  ② 读取 edgeone.json 配置                            │
│  ③ 安装依赖：cd frontend && npm install               │
│  ④ 编译打包：cd frontend && npm run build             │
│     ┌──────────────────────────────────────────┐     │
│     │  npm install   → 安装 Vue/ECharts/Leaflet │     │
│     │  vue-tsc -b    → TypeScript 类型检查      │     │
│     │  vite build    → 打包为 dist/ 静态文件    │     │
│     └──────────────────────────────────────────┘     │
│  ⑤ 部署静态文件：frontend/dist/ → 腾讯 CDN 全球节点   │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  用户访问：https://xxx.edgeone.app               │  │
│  │  ↓                                              │  │
│  │  浏览器加载 index.html / tourist.html            │  │
│  │  ↓                                              │  │
│  │  Vue 应用启动 → api.ts 检测 PROD 模式            │  │
│  │  ↓                                              │  │
│  │  mockApi.ts 浏览器内运行全部后端逻辑              │  │
│  │  ↓                                              │  │
│  │  页面完整可用（登录/大屏/采集/客流仿真全功能）    │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 4.3 部署步骤详解

**前置条件**：

- 注册 [GitHub](https://github.com) 账号
- 注册 [腾讯云](https://cloud.tencent.com) 账号（需实名认证）
- 本地安装 Git 并配置 SSH Key

#### 步骤 1：推送代码到 GitHub

```bash
# 初始化 Git 仓库
git init
git remote add origin git@github.com:sileee/kunming-bus-tour.git

# 提交所有代码
git add -A
git commit -m "昆明公交旅游路线可视化平台 V5.1"
git push -u origin main
```

#### 步骤 2：创建 EdgeOne Pages 项目

1. 打开 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
2. 点击 **"创建项目"** → 选择 **"从 Git 仓库导入"**
3. 授权 GitHub 账号，搜索并选择 `kunming-bus-tour` 仓库
4. 点击 **"导入"**

#### 步骤 3：配置构建参数

EdgeOne Pages 会自动检测项目根目录的 `edgeone.json`：

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": ""
}
```

如未自动填充，手动设置：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 安装命令 | `cd frontend && npm install` | 安装前端依赖 |
| 构建命令 | `cd frontend && npm run build` | TypeScript 检查 + Vite 打包 |
| 输出目录 | `frontend/dist` | 构建产物目录 |

#### 步骤 4：开始部署

1. 点击 **"开始部署"**
2. 等待 3-5 分钟（npm install + vite build）
3. 部署完成后获得访问域名（格式：`https://xxx.edgeone.app`）

#### 步骤 5：验证部署结果

打开获得的域名，确认以下功能：

- [x] 登录页面正常显示
- [x] 使用 `admin` / `admin123` 登录成功
- [x] 运营总览 KPI 数据正常
- [x] 可视化大屏正常展示
- [x] 动态地图正常加载（需配置高德 Key 白名单）
- [x] 数据采集功能可用
- [x] 游客导览页 `/tourist.html` 可访问
- [x] 暗色/亮色主题可切换

#### 步骤 6：配置高德地图密钥白名单

1. 登录 [高德地图开放平台](https://console.amap.com)
2. 进入 **"应用管理"** → 找到 Key `725c214891fe73d91e805a4b10365a99`
3. 在 **"服务平台"** 中添加 EdgeOne Pages 分配的域名
4. 保存设置（约 5 分钟生效）

> **安全说明**：高德 Key 和 SecurityJsCode 在前端代码中是公开的，这是高德 JSAPI 的正常使用方式。Key 已绑定域名白名单，非授权域名无法调用。

### 4.4 本地开发 vs 线上生产

| 特性 | 本地开发 | 线上生产（EdgeOne Pages） |
|------|---------|--------------------------|
| 前端运行方式 | `npm run dev`（Vite HMR 热更新） | 构建后的静态 JS/CSS/HTML |
| API 调用方式 | HTTP fetch → `localhost:3000` (Express) | 函数调用 → `mockApi.ts`（浏览器内） |
| 登录验证 | Express + jsonwebtoken | 浏览器端 Base64 JWT |
| 数据存储 | 后端内存（重启清空） | 浏览器内存（刷新页面清空） |
| 客流仿真 | Express 服务端运行 | 浏览器主线程运行 |
| 数据持久化 | 可选 MySQL | 不支持（课设演示足够） |
| 修改代码生效 | 即时热更新 | 需 push 到 GitHub 重新部署 |
| 地图 API | localhost 白名单 | 线上域名白名单 |

**本地开发启动方式**：

```bash
# 终端 1：启动后端
cd backend
npm install
npm run dev              # → http://localhost:3000

# 终端 2：启动前端
cd frontend
npm install
npm run dev              # → http://localhost:5173
```

---

## 5. 项目结构总览

```
Bus_Tour_Route_Theme/
│
├── README.md                         # ★ 项目完整文档（本文件）
├── edgeone.json                      # ★ EdgeOne Pages 部署配置
├── vercel.json                       # Vercel 备选部署配置
├── render.yaml                       # Render 备选部署配置
├── .gitignore                        # Git 忽略规则
│
├── frontend/                         # ★ 前端工程（Vue 3 + Vite + TypeScript）
│   ├── index.html                    #   管理后台入口
│   ├── tourist.html                  #   游客导览入口
│   ├── package.json                  #   依赖声明（Vue / ECharts / Leaflet / Element Plus）
│   ├── vite.config.ts                #   Vite 构建配置（多页面：index + tourist）
│   ├── tsconfig.json                 #   TypeScript 配置
│   ├── .env                          #   本地环境变量（Git 忽略）
│   ├── .env.example                  #   环境变量模板
│   ├── .env.production               # ★ 生产环境变量（V5.1 新增）
│   ├── node_modules/                 #   依赖包（Git 忽略）
│   └── src/
│       ├── main.ts                   #   管理后台入口
│       ├── App.vue                   #   根组件（路由切换/侧边栏/全局状态/主题/采集引擎）
│       ├── api.ts                    # ★ 统一 API 层（Real/Mock 自适应）
│       ├── mockApi.ts                # ★ V5.1 浏览器端完整后端（约 550 行）
│       ├── styles.css                #   全局样式（暗色/亮色 CSS 变量）
│       ├── types.ts                  #   类型定义
│       ├── env.d.ts                  #   环境变量类型
│       ├── leaflet-plugins.d.ts      #   Leaflet 插件类型
│       ├── data/
│       │   └── busData.ts            #   前端侧数据
│       ├── components/
│       │   ├── DashboardView.vue     #   运营总览
│       │   ├── BigScreenView.vue     #   可视化大屏
│       │   ├── MapView.vue           #   动态地图
│       │   ├── RouteDetailView.vue   #   线路详情
│       │   ├── AnalyticsView.vue     #   数据分析
│       │   ├── CollectionView.vue    #   数据采集
│       │   ├── ChartPanel.vue        #   图表面板
│       │   ├── AdminView.vue         #   后台管理
│       │   ├── LoginView.vue         #   登录页
│       │   └── ToastStack.vue        #   消息提示
│       └── tourist/
│           ├── main.ts               #   游客导览入口
│           ├── TouristApp.vue        #   游客根组件
│           ├── TouristMap.vue        #   游客地图
│           ├── TouristSpots.vue      #   景点列表
│           ├── TouristRoutes.vue     #   路线推荐
│           ├── TouristDetail.vue     #   详情弹窗
│           ├── tourist-api.ts        #   游客 API
│           ├── spotGuides.ts         #   12 个景点导游文案
│           └── tourist-styles.css    #   手绘 scrapbook 风格样式
│
├── backend/                          # 后端工程（Node.js Express — 本地开发使用）
│   ├── package.json                  #   依赖声明（Express / JWT / MySQL2）
│   ├── .env                          #   本地环境变量（Git 忽略）
│   ├── .env.example                  #   环境变量模板
│   ├── node_modules/                 #   依赖包（Git 忽略）
│   └── src/
│       ├── server.js                 # ★ Express 服务 + 全部 18 个 API 路由
│       ├── authMiddleware.js         #   JWT 认证中间件
│       ├── data/
│       │   └── kunmingTransitData.js # ★ 昆明公交数据（28 站 + 12 景点 + 10 线路）
│       └── repositories/
│           ├── index.js              #   数据仓库选择器
│           ├── fileRepository.js     # ★ 文件模式（内存 + 客流仿真引擎 ~500 行）
│           └── mysqlRepository.js    #   MySQL 模式
│
├── api/                              # Vercel Serverless 入口（备选方案）
│   └── express.js
│
├── functions/                        # EdgeOne Cloud Functions 入口（备选方案）
│   └── api.js
│
├── ppt/                              # 演示材料
│   ├── 成果展示.pptx                 #   课设答辩演示文稿
│   └── build_deck.mjs               #   PPT 自动构建脚本
│
└── 项目式实训课程计划.docx           # 课程设计文档
```

---

## 6. 使用说明

### 管理员登录

| 项目 | 值 |
|------|-----|
| 线上地址 | `https://xxx.edgeone.app`（EdgeOne Pages 分配） |
| 用户名 | `admin` |
| 密码 | `admin123` |

### 功能导航

| 菜单 | 功能描述 |
|------|---------|
| 🏠 **运营总览** | 核心指标卡片（线路/站点/客流/准点率）+ 热门线路排行 + 华容道路网游戏 |
| 🖥 **可视化大屏** | 全屏展示模式，适合答辩/演示投屏 |
| 🗺 **动态地图** | Leaflet + 高德 Driving API 真实道路路径 + 线路箭头同步动画 |
| 📡 **数据采集** | 自动采集引擎（1.5 秒/批）+ 手动补录 + 实时趋势图 + CSV 导出 |
| 🚌 **线路详情** | 站点时间线 + 运营指标面板 + 关联景点列表 |
| 📊 **数据分析** | ECharts 客流排行/景点热度/区域分布/拥挤度-准点率双线图 |
| 📈 **数据图表** | 4 个 ECharts 图表 2×2 网格布局（饼图/柱状图/趋势图） |
| ⚙ **后台管理** | 线路 CRUD（新增/编辑/删除）+ 景点热度手动刷新 |

### 自动数据采集演示

1. 进入 **"数据采集"** 页面
2. 点击 **"启动自动采集"** 按钮
3. 系统每 1.5 秒批量生成 3 条线路的仿真车辆运行数据
4. 数据实时推送到运营总览、大屏、分析图表，全站联动更新
5. 再次点击按钮暂停采集

> **答辩演示建议流程**：登录 → 运营总览（展示 KPI）→ 启动自动采集 → 切到数据分析/大屏（观察实时变化）→ 游览游客导览页 → 展示后台管理。

---

## 附录

### 环境变量说明

**后端（`backend/.env`）**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 后端服务端口 |
| `DATA_MODE` | `file` | 数据模式（`file` = 内存 / `mysql` = 数据库） |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT 签名密钥 |
| `ADMIN_USER` | `admin` | 管理员用户名 |
| `ADMIN_PASS` | `admin123` | 管理员密码 |
| `MYSQL_HOST` | `127.0.0.1` | MySQL 地址 |
| `MYSQL_PORT` | `3306` | MySQL 端口 |
| `MYSQL_USER` | `root` | MySQL 用户 |
| `MYSQL_PASSWORD` | — | MySQL 密码 |
| `MYSQL_DATABASE` | `kunming_bus_tour` | MySQL 数据库名 |

**前端（`frontend/.env`）**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:3000` | 后端 API 地址（留空 = 自动 Mock） |
| `VITE_AMAP_KEY` | — | 高德地图 Web 端 JSAPI Key |
| `VITE_AMAP_SECURITY_JS_CODE` | — | 高德地图安全密钥 |

### 版本更新记录

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| V1.0 | 2026-04 | 初始版本：Vue 3 + Express 本地开发架构 |
| V2.0 | 2026-05 | 增加客流仿真模型（Gravity Model v1） |
| V3.0 | 2026-05 | 增加数据采集引擎、MySQL 模式、景点导览页 |
| V3.2 | 2026-05 | 华容道路网游戏、数据模式动态读取、MySQL CRUD 完善 |
| V4.0 | 2026-05 | 新增游客导览子系统（tourist.html）、手绘 scrapbook 风格、Vite 多页面构建 |
| V5.0 | 2026-05 | 增加 JWT 登录认证、权限分离（管理端/游客端） |
| **V5.1** | **2026-06** | **部署至 EdgeOne Pages、浏览器端 Mock API、纯静态托管完整运行 ★** |

### 技术参考

| 文献 | 应用 |
|------|------|
| Zhao et al. (2024, *Sustainability*) | 重力模型基础框架 |
| Yang et al. (2023, *JTR*) | 距离衰减函数参数标定 |
| Rong et al. (2023) | 空间竞争 / 干预机会模型 |
| Zhou et al. (2025) | 节假日客流乘数系数 |
| Ren et al. (2025, *TRR*) | 旅游城市公交客流预测 + 时间因子 |

---

> **版本**：V5.1 &nbsp;&nbsp;|&nbsp;&nbsp;**最后更新**：2026-06-09
>
> **部署平台**：[EdgeOne Pages](https://console.cloud.tencent.com/edgeone)（腾讯云）
>
> **源码仓库**：[github.com/sileee/kunming-bus-tour](https://github.com/sileee/kunming-bus-tour)
