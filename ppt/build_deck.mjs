const artifactPath = 'file:///C:/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const {
  Presentation,
  PresentationFile,
  column,
  row,
  grid,
  panel,
  text,
  rule,
  fill,
  fixed,
  hug,
  wrap,
  fr,
  auto
} = await import(artifactPath);

const deck = Presentation.create({
  slideSize: { width: 1920, height: 1080 }
});

const colors = {
  ink: '#122033',
  muted: '#64748B',
  blue: '#2563EB',
  teal: '#0F766E',
  orange: '#EA580C',
  red: '#DC2626',
  green: '#16A34A',
  bg: '#F3F7FB'
};

function addSlide(title, subtitle, bodyNodes) {
  const slide = deck.slides.add();
  slide.compose(
    column(
      { name: 'root', width: fill, height: fill, padding: { x: 96, y: 72 }, gap: 30 },
      [
        text(title, {
          name: 'title',
          width: wrap(1500),
          height: hug,
          style: { fontSize: 56, bold: true, color: colors.ink }
        }),
        text(subtitle, {
          name: 'subtitle',
          width: wrap(1360),
          height: hug,
          style: { fontSize: 26, color: colors.muted }
        }),
        rule({ name: 'rule', width: fixed(220), stroke: colors.blue, weight: 5 }),
        ...bodyNodes
      ]
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 }
  );
}

function bullet(label, value) {
  return row(
    { name: `bullet-${label}`, width: fill, height: hug, gap: 22 },
    [
      text(label, {
        width: fixed(170),
        height: hug,
        style: { fontSize: 25, bold: true, color: colors.blue }
      }),
      text(value, {
        width: wrap(1180),
        height: hug,
        style: { fontSize: 25, color: colors.ink }
      })
    ]
  );
}

function metric(value, label, color) {
  return panel(
    { name: `metric-${label}`, width: fill, height: fixed(150), padding: { x: 30, y: 24 } },
    column(
      { width: fill, height: fill, gap: 10 },
      [
        text(value, { width: fill, height: hug, style: { fontSize: 44, bold: true, color } }),
        text(label, { width: fill, height: hug, style: { fontSize: 20, color: colors.muted } })
      ]
    )
  );
}

addSlide(
  '昆明公交旅游路线数据可视化平台',
  'Vue 3 + Express + MySQL + 高德地图 + ECharts 的完整课程实训工程',
  [
    grid(
      { name: 'cover-grid', width: fill, height: fixed(470), columns: [fr(1), fr(1), fr(1)], rows: [auto, auto], columnGap: 26, rowGap: 26 },
      [
        metric('10', '旅游相关公交线路', colors.blue),
        metric('28', '昆明公交站点', colors.teal),
        metric('12', '代表性旅游景点', colors.orange),
        metric('36.5万+', '仿真单日客流样本', colors.red),
        metric('file/mysql', '双模式数据访问', colors.green),
        metric('7份', '工程开发文档', colors.blue)
      ]
    )
  ]
);

addSlide(
  '项目背景与目标',
  '模拟智慧城市公共交通可视化业务场景，服务游客出行和城市运营分析。',
  [
    bullet('场景', '围绕昆明翠湖、滇池、民族村、世博园、官渡古镇、斗南花市等旅游目的地组织公交出行数据。'),
    bullet('目标', '把线路、站点、景点、客流、热度、拥挤度等数据整合到一个可交互 Web 应用中。'),
    bullet('成果', '形成可运行源码、MySQL 脚本、接口服务、前端可视化、开发文档和成果展示 PPT。')
  ]
);

addSlide(
  '系统架构',
  '前后端分离，后端提供 REST API，前端负责地图与图表交互。',
  [
    bullet('前端', 'Vue 3、TypeScript、Vite、ECharts、高德地图 JS API；无地图 Key 时使用内置降级地图。'),
    bullet('后端', 'Node.js + Express 提供线路、站点、景点、统计和后台管理接口。'),
    bullet('数据', 'MySQL 持久化公交线路、站点、景点、关联关系和仿真统计指标。'),
    bullet('模式', 'DATA_MODE=file 便于演示，DATA_MODE=mysql 满足数据库型工程要求。')
  ]
);

addSlide(
  '核心功能',
  '驾驶舱、地图、详情、分析、后台管理覆盖完整业务闭环。',
  [
    bullet('驾驶舱', '展示线路总数、站点总数、景点总数、客流总量和热门线路排行。'),
    bullet('地图', '展示公交线路 Polyline、站点 Marker、景点 Marker 和线路筛选。'),
    bullet('详情', '展示单条线路运营时间、票价、站点顺序、附近景点和运营指标。'),
    bullet('分析', '通过 ECharts 展示客流排行、景点热度、区域分布、拥挤度和准点率。')
  ]
);

addSlide(
  '数据库设计',
  '用关系模型表达“线路-站点-景点-统计指标”的核心数据关系。',
  [
    bullet('bus_routes', '公交线路基础表，保存编号、名称、起终点、运营时间、票价、类型和渲染颜色。'),
    bullet('bus_stops', '公交站点表，保存站名、经纬度和所属行政区。'),
    bullet('route_stops', '线路站点关联表，通过 sequence 字段表达途经顺序。'),
    bullet('route_statistics', '线路运营统计表，保存客流量、准点率、拥挤度和热度值。')
  ]
);

addSlide(
  '接口设计',
  'REST API 统一返回 JSON，前端不直接依赖静态数据文件。',
  [
    bullet('线路', 'GET /api/routes、GET /api/routes/:id，支持关键词、类型和景点筛选。'),
    bullet('资源', 'GET /api/stops、GET /api/spots，支撑地图站点和景点图层。'),
    bullet('统计', 'GET /api/statistics/overview、GET /api/statistics/routes，支撑驾驶舱和分析页。'),
    bullet('管理', 'POST/PUT/DELETE /api/admin/routes，提供后台基础维护能力。')
  ]
);

addSlide(
  '数据可视化设计',
  '地图解决空间关系，图表解决运营对比，详情页解决路线解释。',
  [
    bullet('空间', '以昆明为中心展示线路轨迹，串联主城区、滇池片区、官渡和呈贡。'),
    bullet('对比', '用柱状图对比线路客流和景点热度，用饼图展示站点区域分布。'),
    bullet('运营', '用折线图对比拥挤度和准点率，说明公共交通管理价值。')
  ]
);

addSlide(
  '测试与展示流程',
  '按照“启动后端、启动前端、演示功能、说明文档”的顺序展示。',
  [
    bullet('后端', '运行 npm run test --prefix backend，验证健康检查、线路列表和首页统计接口。'),
    bullet('前端', '运行 npm run build --prefix frontend，验证 TypeScript 类型和 Vite 构建。'),
    bullet('演示', '依次展示驾驶舱、地图、线路详情、数据分析和后台管理。'),
    bullet('说明', '展示 README、数据库设计、接口文档、测试报告和开源项目借鉴说明。')
  ]
);

addSlide(
  '创新点与总结',
  '项目既满足课程技能覆盖，也保留答辩时可解释的工程完整性。',
  [
    bullet('创新', '把公交路线和旅游目的地结合，形成更具体的城市文旅出行场景。'),
    bullet('稳定', '提供高德地图真实模式和 SVG 降级模式，降低现场演示风险。'),
    bullet('完整', '覆盖前端、后端、数据库、接口、文档、测试和 PPT。'),
    bullet('边界', '不声称接入真实实时公交，运营指标明确为仿真数据。')
  ]
);

const pptxBlob = await PresentationFile.exportPptx(deck);
await pptxBlob.save('ppt/成果展示.pptx');
console.log('created ppt/成果展示.pptx');
