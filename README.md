# 昆明公交旅游路线数据可视化平台

> 版本：V5.0 &nbsp;&nbsp;|&nbsp;&nbsp;日期：2026-05-26

这是一个完整前后端课程实训项目，主题为”公交路线数据可视化”。项目以昆明市公交旅游路线为场景，集成高德真实地图、动态公交车辆、数据采集、客流仿真模型、ECharts 图表、后台数据维护、景点导览 Landing 页和双主题系统。

## V3.2 更新要点

- 首页运营总览右侧改为生成式公交路网可视化图片，替换原 DOM 示意图。
- 首页图片加入轻量 3x3 华容道小游戏：默认展示完整图片，点击后进入拼图，支持复原与继续游戏，并带水波扩散动效。
- 后台状态栏的数据模式改为读取 `/api/health` 的真实 `dataMode`，不再写死为 File。
- MySQL 模式补齐 `POST /api/admin/recalculate-heat`，景点热度刷新可写入数据库。
- 后台新增线路在 MySQL 模式下确认写入 `bus_routes`，便于 Navicat 查看和课堂演示。

## V4.0 更新要点 — 游客导览视图

- 新增独立游客导览页面 `tourist.html`，采用与景点导览页一致的手绘 scrapbook 美学风格（Kalam + Patrick Hand 手写字体、graph-paper 点阵背景、wobbly 不规则边框、tape/tack 物理装饰元素）。
- 游客视图仅展示：动态地图（公交线路箭头动画 + 景点标注）、景点卡片网格（可展开查看游玩攻略）、公交旅游线路卡片。
- 游客看不到：饼图、柱状图、数据表格、KPI 指标面板、数据采集控件、后台管理等管理员功能。
- 景点导览 Landing 页链接全部指向新的游客导览页（`/tourist.html`），形成完整的游客浏览路径。
- Vite 多页面构建，游客页面独立打包，不加载 ECharts 和 Element Plus。

## V5.0 更新要点 — 管理员登录与权限分离

- 后台管理平台（`/`）增加 JWT 登录认证，默认账号 `admin` / `admin123`。
- 后端新增 `POST /api/auth/login` 和 `GET /api/auth/verify` 认证接口。
- 管理员 API（线路 CRUD、景点热度刷新）需要 Bearer Token 鉴权，未登录返回 401。
- 游客端 API（线路查询、景点查询、数据采集上报）保持公开，无需登录。
- 后台页面标题改为"昆明公交旅游路线数据管理平台"，侧边栏增加退出登录按钮。
- 游客导览页与后台管理平台完全分离，权限清晰。

## 技术栈

- 前端：Vue 3、Vite、TypeScript、ECharts、高德地图 JS API
- 后端：Node.js、Express
- 数据库：MySQL 8，可选；默认 file 模式可直接演示
- 可视化：高德地图线路图层、动态车辆、采集趋势图、客流排行、景点热度、拥挤度分析

## 运行方式

安装依赖：

```cmd
cmd /c npm run install:all
```

启动后端：

```cmd
cmd /c npm run dev:backend
```

启动前端：

```cmd
cmd /c npm run dev:frontend
```

访问：

- 游客导览页：`http://localhost:5173/tourist.html`
- 景点导览页：`http://localhost:5173/landing.html`
- 后台管理平台：`http://localhost:5173`（需登录，默认 admin / admin123）

## 高德地图配置

复制 `frontend/.env.example` 为 `frontend/.env`，填写：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_AMAP_KEY=你的高德Web端Key
VITE_AMAP_SECURITY_JS_CODE=你的安全密钥
```

Key 类型必须选择“Web端(JS API)”。配置后需要重启前端。

## 核心功能

### 游客端（无需登录）
- **游客导览页** (`/tourist.html`)：手绘 scrapbook 美学，地图 + 景点 + 线路三大模块，与景点导览页风格统一。
- **动态地图**：高德真实地图，所有公交线路同步动画，景点标注可点击查看详情。
- **景点浏览**：12 个景点卡片网格，点击展开完整游玩攻略（怎么玩/体验什么/最佳时节）。
- **线路浏览**：10 条公交旅游线路卡片，点击查看途经站点与沿线景点。
- **景点导览 Landing** (`/landing.html`)：手绘风格落地页，12 个景点卡片 + 4 条推荐路线 + 8 道昆明美食。

### 管理员端（需要登录）
- **运营总览**：KPI 指标面板、热门线路排行、路线卡片、客流仿真模型展示。
- **动态地图**：全部线路同时监控、遥测面板、3 视角切换、速率控制、车辆跟随气泡。
- **数据采集**：全局采集引擎、手动补录、实时趋势图、管道动画、CSV 导出。
- **线路详情**：站点时间线、运营指标面板、关联景点列表。
- **数据分析**：客流排行、景点热度、区域分布、拥挤度-准点率双线图。
- **数据图表**：4 个 ECharts 图表 2x2 网格布局。
- **后台管理**：线路 CRUD、景点热度手动刷新。
- **双主题**：暗色/白天一键切换。

## 客流仿真模型

项目不是固定数字看板。后端基于改进重力模型（Gravity Model v2）动态计算线路客流：

```text
PassengerFlow(route) = Σᵢⱼ (M_i × M_j × d_ij^(-γ)) × gravityScale
  × RouteTypeFactor × MonthSeasonality × HolidayBoost
  × HourFactor × SpatialCompetition × StochasticNoise
```

模型学术依据：Zhao et al. (2024, *Sustainability*) 重力模型 + Yang et al. (2023, *JTR*) 距离衰减 + Rong et al. (2023) 介入机会理论 + Zhou et al. (2025) & Ren et al. (2025, *TRR*) 节假日客流。

采集样本通过指数平滑（α=0.35）融入模型：`finalFlow = modelFlow × 0.65 + observedFlow × 0.35`。

在”数据采集”页点击”开始采集”后，全局采集器持续运行并批量生成运行样本；首页数字、热门排行、详情指标和分析图表都会跟随变化。凌晨 0-5 点及 22 点后客流归零（公交停运）。

## 真实景点图片

真实景点图片放在：

```text
frontend/public/spot-real-images
```

命名规则见：

```text
frontend/public/spot-real-images/README.md
```

如果真实图片不存在，页面会回退到内置 SVG 占位图。

## MySQL 模式

默认使用 file 模式，便于课堂演示。若使用 MySQL：

1. 执行 `database/schema.sql`
2. 执行 `database/seed.sql`
3. 复制 `backend/.env.example` 为 `backend/.env`
4. 设置：

```env
DATA_MODE=mysql
```

V3.2 起，顶部状态栏会显示后端真实数据模式。若仍显示 `file`，需要确认 `backend/.env` 已设置 `DATA_MODE=mysql` 并重启后端。

## 推荐展示流程

### 游客端展示
1. 打开”景点导览”Landing 页（`/landing.html`），展示 12 个景点的卡片和真实图片。
2. 点击任意景点卡片跳转游客导览页”动态地图”，展示高德真实地图和公交车辆运行。
3. 在游客导览页浏览景点卡片（点击展开游玩攻略）和公交线路卡片。
4. 游客全程无需登录，看不到任何管理功能。

### 管理员端展示
1. 打开后台管理平台（`/`），使用 admin / admin123 登录。
2. 查看运营总览 KPI 面板、热门排行和路线卡片。
3. 打开”数据采集”，点击”开始采集”，等待系统持续生成多线路运行样本。
4. 切回”运营总览”或”数据分析”，观察数字和图表变化。
5. 切换暗色/白天双主题，展示主题系统。
6. 展示 CSV 导出和趋势快照 API。
7. 展示文档中的动态数据模型和接口设计。
