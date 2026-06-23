<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { BusRoute, Overview, RouteStatistic, Spot } from '../types';

const props = defineProps<{
  overview: Overview;
  routes: BusRoute[];
  statistics: RouteStatistic[];
  spots: Spot[];
  collectorRunning: boolean;
  currentTime: string;
  lastUpdate: Date | null;
  totalSamples: number;
}>();

const emit = defineEmits<{
  selectRoute: [routeId: number];
}>();

const flowTrendEl = ref<HTMLDivElement | null>(null);
const routeTypeEl = ref<HTMLDivElement | null>(null);
const heatMapEl = ref<HTMLDivElement | null>(null);
const amapReady = ref(false);
const amapReason = ref('');
const heatTick = ref(0);
let charts: echarts.ECharts[] = [];
let routeTypeChart: echarts.ECharts | null = null;
let amapInstance: any = null;
let heatMapLayer: any = null;
let heatTimer = 0;

const topRoutes = computed(() =>
  [...props.statistics]
    .sort((a, b) => b.passengerFlow - a.passengerFlow)
    .slice(0, 8)
);

const hotSpots = computed(() => {
  const tick = heatTick.value;
  return [...props.spots]
    .map((spot, index) => ({
      ...spot,
      liveHeat: Math.min(99, Math.max(35, Math.round(spot.heat + (props.collectorRunning ? Math.sin(tick / 2 + index * 0.9) * 5 : 0)))),
    }))
    .sort((a, b) => b.liveHeat - a.liveHeat)
    .slice(0, 8);
});

const routeTypeStats = computed(() => {
  const map = new Map<string, number>();
  props.routes.forEach((route) => map.set(route.type, (map.get(route.type) || 0) + 1));
  return [...map.entries()].map(([name, value]) => ({ name, value }));
});

const unpositionedRoutes = computed(() =>
  props.routes.filter((route) => getRoutePath(route).length < 2)
);

const heatPoints = computed(() => {
  const routeFlow = new Map(props.statistics.map((item) => [item.routeId, item.passengerFlow]));
  const stopHeat = new Map<number, { id: number; name: string; lng: number; lat: number; value: number }>();

  props.routes.forEach((route) => {
    const routeValue = routeFlow.get(route.id) || route.statistics?.passengerFlow || Math.round(props.overview.passengerFlow / Math.max(props.routes.length, 1));
    const share = routeValue / Math.max(route.stops.length, 1);
    route.stops.forEach((stop) => {
      if (!isValidLngLat(stop.lng, stop.lat)) return;
      const current = stopHeat.get(stop.id) || { id: stop.id, name: stop.name, lng: stop.lng, lat: stop.lat, value: 0 };
      current.value += share;
      stopHeat.set(stop.id, current);
    });
  });

  const liveSpotHeat = new Map(hotSpots.value.map((spot) => [spot.id, spot.liveHeat]));
  const spotLayer = props.spots
    .filter((spot) => isValidLngLat(spot.lng, spot.lat))
    .map((spot) => ({
      id: `spot-${spot.id}`,
      name: spot.name,
      lng: spot.lng,
      lat: spot.lat,
      value: (liveSpotHeat.get(spot.id) || spot.heat) * 520,
      kind: 'spot' as const,
    }));

  const all = [
    ...Array.from(stopHeat.values()).map((item) => ({ ...item, id: `stop-${item.id}`, kind: 'stop' as const })),
    ...spotLayer,
  ];
  const max = Math.max(...all.map((item) => item.value), 1);

  return all
    .map((item) => {
      const [x, y] = normalizePoint([item.lng, item.lat]).split(',').map(Number);
      const intensity = Math.max(0.18, item.value / max);
      return {
        ...item,
        x,
        y,
        intensity,
        radius: Math.round(22 + intensity * 46),
        opacity: Number((0.18 + intensity * 0.44).toFixed(2)),
      };
    })
    .sort((a, b) => a.value - b.value);
});

const serviceScore = computed(() => Math.round(props.overview.avgPunctuality * 0.72 + 24));

const loadPressure = computed(() => {
  const maxFlow = Math.max(...props.statistics.map((item) => item.passengerFlow), 1);
  const avgFlow = props.statistics.reduce((sum, item) => sum + item.passengerFlow, 0) / Math.max(props.statistics.length, 1);
  return Math.min(99, Math.round((avgFlow / maxFlow) * 100 + (props.collectorRunning ? 8 : 0)));
});

const collectionStatus = computed(() => [
  { label: '采集引擎', value: props.collectorRunning ? '运行中' : '待机', tone: props.collectorRunning ? 'online' : 'idle' },
  { label: '样本总量', value: formatNumber(props.totalSamples), tone: 'info' },
  { label: '覆盖线路', value: `${props.routes.length} 条`, tone: 'info' },
  { label: '热力采样点', value: `${heatPoints.value.length} 个`, tone: 'hot' },
]);

const networkBounds = computed(() => {
  const points = props.routes.flatMap((route) => getRoutePath(route));
  props.spots.forEach((spot) => {
    if (isValidLngLat(spot.lng, spot.lat)) points.push([spot.lng, spot.lat]);
  });
  const lngs = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  return {
    minLng: Math.min(...lngs, 102.62),
    maxLng: Math.max(...lngs, 102.88),
    minLat: Math.min(...lats, 24.86),
    maxLat: Math.max(...lats, 25.08),
  };
});

function formatNumber(value: number) {
  return value.toLocaleString('zh-CN');
}

function isValidLngLat(lng: unknown, lat: unknown) {
  const x = Number(lng);
  const y = Number(lat);
  return Number.isFinite(x) && Number.isFinite(y) && x > 70 && x < 140 && y > 3 && y < 55;
}

function getRoutePath(route: BusRoute): [number, number][] {
  const polyline = (route.polyline || []).filter(([lng, lat]) => isValidLngLat(lng, lat));
  if (polyline.length >= 2) return polyline;
  return (route.stops || [])
    .filter((stop) => isValidLngLat(stop.lng, stop.lat))
    .map((stop) => [stop.lng, stop.lat] as [number, number]);
}

function normalizePoint(point: [number, number]) {
  const bounds = networkBounds.value;
  const x = ((point[0] - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.01)) * 880 + 40;
  const y = 460 - ((point[1] - bounds.minLat) / Math.max(bounds.maxLat - bounds.minLat, 0.01)) * 400;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function flowTrend() {
  const base = props.overview.passengerFlow / 16;
  const factors = [0.34, 0.58, 1.26, 1.12, 0.72, 0.86, 1.18, 0.94, 0.46];
  return factors.map((factor, index) => ({
    time: `${String(index * 2 + 6).padStart(2, '0')}:00`,
    flow: Math.round(base * factor * (props.collectorRunning ? 1.08 : 1)),
  }));
}

function disposeCharts() {
  charts.forEach((chart) => chart.dispose());
  charts = [];
}

function disposeRouteTypeChart() {
  if (routeTypeChart) {
    routeTypeChart.dispose();
    routeTypeChart = null;
  }
}

function renderCharts() {
  disposeCharts();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const axisColor = isDark ? 'rgba(219, 234, 254, 0.68)' : '#64748B';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.16)' : '#E2E8F0';
  const bgColor = isDark ? 'rgba(3, 7, 18, 0.92)' : '#FFFFFF';
  const textColor = isDark ? '#eef6ff' : '#0F172A';
  const tooltip = {
    backgroundColor: bgColor,
    borderColor: isDark ? 'rgba(125, 211, 252, 0.35)' : '#E2E8F0',
    textStyle: { color: textColor },
    extraCssText: isDark ? '' : 'box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-radius: 10px;',
  };

  if (flowTrendEl.value) {
    const chart = echarts.init(flowTrendEl.value, null, { renderer: 'canvas' });
    charts.push(chart);
    const data = flowTrend();
    chart.setOption({
      tooltip: { trigger: 'axis', ...tooltip },
      grid: { top: 20, right: 18, bottom: 24, left: 52 },
      xAxis: {
        type: 'category',
        data: data.map((item) => item.time),
        axisLabel: { color: axisColor, fontSize: 10 },
        axisLine: { lineStyle: { color: gridColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: axisColor, fontSize: 10 },
        splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      },
      series: [{
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: data.map((item) => item.flow),
        lineStyle: { width: 4, color: '#22d3ee' },
        itemStyle: { color: '#facc15' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(34, 211, 238, 0.42)' },
            { offset: 1, color: 'rgba(20, 184, 166, 0.02)' },
          ]),
        },
      }],
    });
  }

}

function renderRouteTypeChart() {
  if (!routeTypeEl.value) return;
  disposeRouteTypeChart();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const axisColor = isDark ? 'rgba(219, 234, 254, 0.68)' : '#64748B';
  const tooltip = {
    backgroundColor: isDark ? 'rgba(3, 7, 18, 0.92)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(125, 211, 252, 0.35)' : '#E2E8F0',
    textStyle: { color: isDark ? '#eef6ff' : '#0F172A' },
  };
  routeTypeChart = echarts.init(routeTypeEl.value, null, { renderer: 'canvas' });
  routeTypeChart.setOption({
    tooltip: { trigger: 'item', ...tooltip },
    color: ['#3B82F6', '#F97316', '#6366F1', '#38A169', '#EF4444', '#EAB308'],
    series: [{
      type: 'pie',
      radius: ['54%', '74%'],
      center: ['50%', '50%'],
      animation: false,
      label: { color: axisColor, formatter: '{b}\n{d}%', fontSize: 10 },
      labelLine: { lineStyle: { color: isDark ? 'rgba(224, 242, 254, 0.35)' : '#CBD5E1' } },
      data: routeTypeStats.value,
    }],
  });
}

function handleResize() {
  charts.forEach((chart) => chart.resize());
  if (routeTypeChart) routeTypeChart.resize();
  if (amapInstance) amapInstance.resize();
}

function loadAmapScript() {
  const key = import.meta.env.VITE_AMAP_KEY;
  if (!key) return Promise.reject(new Error('未配置 VITE_AMAP_KEY'));
  const existingAmap = (window as any).AMap;
  if (existingAmap?.HeatMap) return Promise.resolve();
  if (existingAmap?.plugin) {
    return new Promise<void>((resolve, reject) => {
      existingAmap.plugin(['AMap.HeatMap'], () => {
        existingAmap.HeatMap ? resolve() : reject(new Error('高德热力图插件加载失败'));
      });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE;
    if (securityJsCode) {
      (window as any)._AMapSecurityConfig = { securityJsCode };
    }
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.HeatMap`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.head.appendChild(script);
  });
}

function renderAmapHeatMap() {
  const AM = (window as any).AMap;
  if (!AM || !heatMapEl.value) return;

  if (!amapInstance) {
    amapInstance = new AM.Map(heatMapEl.value, {
      center: [102.72, 25.01],
      zoom: 11.2,
      pitch: 0,
      resizeEnable: true,
      dragEnable: true,
      zoomEnable: true,
      rotateEnable: false,
      showLabel: false,
      features: ['bg', 'road'],
      mapStyle: 'amap://styles/darkblue',
    });
  }

  const data = heatPoints.value.map((point) => ({
    lng: point.lng,
    lat: point.lat,
    count: Math.max(1, Math.round(point.value / 100)),
  }));
  const max = Math.max(...data.map((item) => item.count), 1);

  if (!heatMapLayer) {
    heatMapLayer = new AM.HeatMap(amapInstance, {
      radius: 34,
      opacity: [0.08, 0.88],
      gradient: {
        0.18: '#22d3ee',
        0.42: '#34d399',
        0.62: '#facc15',
        0.8: '#fb923c',
        1.0: '#ef4444',
      },
    });
  }

  heatMapLayer.setDataSet({ data, max });
}

async function initAmapHeatMap() {
  try {
    await loadAmapScript();
    amapReady.value = true;
    amapReason.value = '';
    renderAmapHeatMap();
  } catch (error) {
    amapReady.value = false;
    amapReason.value = error instanceof Error ? error.message : '地图 API 加载失败';
  }
}

watch(
  () => [props.overview.passengerFlow, props.routes.length, props.statistics.length, props.spots.length, props.collectorRunning, heatTick.value],
  () => nextTick(() => {
    renderCharts();
    renderAmapHeatMap();
  })
);

watch(
  () => props.routes.map((route) => `${route.id}:${route.type}`).join('|'),
  () => nextTick(renderRouteTypeChart)
);

onMounted(() => {
  nextTick(renderCharts);
  nextTick(renderRouteTypeChart);
  nextTick(initAmapHeatMap);
  heatTimer = window.setInterval(() => {
    if (props.collectorRunning) heatTick.value += 1;
  }, 1600);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  disposeCharts();
  disposeRouteTypeChart();
  if (amapInstance) {
    amapInstance.destroy();
    amapInstance = null;
    heatMapLayer = null;
  }
  window.clearInterval(heatTimer);
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <section class="big-screen" :class="{ live: collectorRunning }">
    <header class="screen-header">
      <div class="screen-title">
        <span>Kunming Smart Transit Command Center</span>
        <h2>昆明旅游公交运营可视化大屏</h2>
      </div>
      <div class="screen-meta">
        <span class="screen-time">{{ currentTime }}</span>
        <span>{{ lastUpdate ? lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--' }} 更新</span>
      </div>
    </header>

    <div class="screen-kpis">
      <article>
        <span>实时客流</span>
        <strong>{{ formatNumber(overview.passengerFlow) }}</strong>
        <small>全网模型估算</small>
      </article>
      <article>
        <span>准点指数</span>
        <strong>{{ serviceScore }}%</strong>
        <small>线路服务评分</small>
      </article>
      <article>
        <span>负载压力</span>
        <strong>{{ loadPressure }}%</strong>
        <small>高峰容量占用</small>
      </article>
      <article>
        <span>采集样本</span>
        <strong>{{ totalSamples }}</strong>
        <small>{{ collectorRunning ? '采集中' : '待机' }}</small>
      </article>
    </div>

    <div class="screen-layout">
      <aside class="screen-column">
        <article class="screen-panel">
          <div class="panel-head">
            <span>线路热度 TOP 8</span>
            <em>Passenger Flow</em>
          </div>
          <div class="big-rank-list">
            <button v-for="(route, index) in topRoutes" :key="route.routeId" type="button" @click="emit('selectRoute', route.routeId)">
              <b>{{ String(index + 1).padStart(2, '0') }}</b>
              <span>
                <strong>{{ route.routeNumber }}</strong>
                <small>{{ route.routeName }}</small>
              </span>
              <i :style="{ width: `${Math.max(12, route.heat)}%` }"></i>
              <em>{{ formatNumber(route.passengerFlow) }}</em>
            </button>
          </div>
        </article>

        <article class="screen-panel">
          <div class="panel-head">
            <span>公交类型结构</span>
            <em>Route Mix</em>
          </div>
          <div ref="routeTypeEl" class="screen-chart donut"></div>
        </article>
      </aside>

      <main class="screen-map-panel heat-map-only">
        <div class="map-panel-head">
          <span :class="{ active: collectorRunning }"></span>
          <strong>{{ collectorRunning ? '实时人流热力更新中' : '人流热力分布' }}</strong>
          <em>{{ heatPoints.length }} 个热力采样点 / {{ overview.stopCount }} 个站点 / {{ overview.spotCount }} 个景点</em>
        </div>
        <div class="heat-legend">
          <strong>人流热力</strong>
          <span><i class="heat-low"></i>低</span>
          <span><i class="heat-mid"></i>中</span>
          <span><i class="heat-high"></i>高</span>
        </div>
        <div v-if="unpositionedRoutes.length" class="route-data-warning">
          {{ unpositionedRoutes.map((route) => route.number).join('、') }} 缺少经过站点，暂不参与地图定位
        </div>
        <div ref="heatMapEl" class="amap-heatmap" :class="{ ready: amapReady }"></div>
        <div v-if="!amapReady" class="map-fallback-note">
          {{ amapReason || '地图 API 正在加载...' }}
        </div>
        <svg v-if="!amapReady" class="route-network fallback-heatmap" viewBox="0 0 960 520" role="img" aria-label="昆明旅游公交人流热力图">
          <defs>
            <radialGradient id="crowdHeat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95" />
              <stop offset="34%" stop-color="#fb923c" stop-opacity="0.62" />
              <stop offset="68%" stop-color="#ef4444" stop-opacity="0.24" />
              <stop offset="100%" stop-color="#ef4444" stop-opacity="0" />
            </radialGradient>
          </defs>
          <path d="M92 90 C260 12 378 102 504 82 S768 26 878 122 S832 358 684 418 S342 500 192 404 S-6 228 92 90Z" class="city-outline" />
          <path d="M110 384 C220 438 358 486 534 456 C682 430 798 356 834 260" class="map-contour" />
          <path d="M124 130 C236 94 354 122 478 106 C626 88 756 98 842 176" class="map-contour weak" />
          <path d="M188 294 C318 238 476 224 658 246 C742 256 806 300 838 348" class="map-contour weak" />
          <g class="heat-layer">
            <circle
              v-for="point in heatPoints"
              :key="point.id"
              :cx="point.x"
              :cy="point.y"
              :r="point.radius"
              :opacity="point.opacity"
              fill="url(#crowdHeat)"
            >
              <title>{{ point.name }} 人流指数 {{ Math.round(point.value) }}</title>
            </circle>
          </g>
          <g class="map-place-labels">
            <text x="450" y="210">主城核心区</text>
            <text x="695" y="374">呈贡方向</text>
            <text x="214" y="365">滇池西岸</text>
          </g>
        </svg>
      </main>

      <aside class="screen-column">
        <article class="screen-panel">
          <div class="panel-head">
            <span>时段客流趋势</span>
            <em>Today</em>
          </div>
          <div ref="flowTrendEl" class="screen-chart trend"></div>
        </article>

        <article class="screen-panel">
          <div class="panel-head">
            <span>热门景点热力</span>
            <em>Tourism Heat</em>
          </div>
          <div class="spot-heat-list">
            <div v-for="spot in hotSpots" :key="spot.id">
              <span>{{ spot.name }}</span>
              <i><b :style="{ width: `${spot.liveHeat}%` }"></b></i>
              <em>{{ spot.liveHeat }}</em>
            </div>
          </div>
        </article>

        <article class="screen-panel compact">
          <div class="panel-head">
            <span>采集状态</span>
            <em>Collection</em>
          </div>
          <div class="collection-status-grid">
            <div v-for="item in collectionStatus" :key="item.label" :class="`status-${item.tone}`">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </article>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.big-screen {
  min-height: calc(100vh - 150px);
  padding: 18px;
  border: 1px solid var(--border-default);
  border-radius: 16px;
  color: var(--foreground);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
:global([data-theme="dark"]) .big-screen {
  color: #e0f2fe;
  background:
    linear-gradient(135deg, rgba(8, 47, 73, 0.72), rgba(3, 7, 18, 0.98) 52%, rgba(20, 83, 45, 0.42)),
    radial-gradient(circle at 50% 6%, rgba(34, 211, 238, 0.2), transparent 34%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 24px 80px rgba(0, 0, 0, 0.32);
  border-color: rgba(125, 211, 252, 0.16);
}

.screen-header,
.screen-kpis,
.screen-layout {
  position: relative;
  z-index: 1;
}

.screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 10px 16px;
}

.screen-title span,
.panel-head em,
.screen-meta span,
.screen-kpis small {
  color: var(--foreground-muted);
  font-size: 12px;
}
:global([data-theme="dark"]) .screen-title span,
:global([data-theme="dark"]) .panel-head em,
:global([data-theme="dark"]) .screen-meta span,
:global([data-theme="dark"]) .screen-kpis small {
  color: rgba(186, 230, 253, 0.66);
}

.screen-title h2 {
  margin: 4px 0 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0;
}

.screen-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.screen-time {
  min-width: 108px;
  padding: 7px 10px;
  border: 1px solid var(--border-accent);
  border-radius: 8px;
  color: var(--accent) !important;
  font-variant-numeric: tabular-nums;
  text-align: center;
  font-weight: 600;
}
:global([data-theme="dark"]) .screen-time {
  border-color: rgba(34, 211, 238, 0.3);
  color: #fef08a !important;
}

.screen-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.screen-kpis article,
.screen-panel,
.screen-map-panel {
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}
:global([data-theme="dark"]) .screen-kpis article,
:global([data-theme="dark"]) .screen-panel,
:global([data-theme="dark"]) .screen-map-panel {
  border-color: rgba(125, 211, 252, 0.14);
  background: rgba(2, 6, 23, 0.58);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.screen-kpis article {
  padding: 14px 16px;
}

.screen-kpis span {
  display: block;
  color: var(--foreground-muted);
  font-size: 13px;
}
:global([data-theme="dark"]) .screen-kpis span { color: rgba(219, 234, 254, 0.72); }

.screen-kpis strong {
  display: block;
  margin: 4px 0;
  color: var(--foreground);
  font-size: 28px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
:global([data-theme="dark"]) .screen-kpis strong { color: #ffffff; }

.screen-layout {
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) minmax(420px, 1.6fr) minmax(240px, 0.9fr);
  gap: 12px;
  align-items: stretch;
}

.screen-column {
  display: grid;
  gap: 12px;
}

.screen-panel {
  min-height: 210px;
  padding: 14px;
}

.screen-panel.compact {
  min-height: 170px;
}

.panel-head,
.map-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.panel-head span,
.map-panel-head strong {
  color: var(--foreground);
  font-size: 15px;
  font-weight: 700;
}
:global([data-theme="dark"]) .panel-head span,
:global([data-theme="dark"]) .map-panel-head strong { color: #f8fafc; }

.screen-chart {
  width: 100%;
}

.screen-chart.trend {
  height: 180px;
}

.screen-chart.donut {
  height: 190px;
}

.screen-chart.district {
  height: 140px;
}

.big-rank-list {
  display: grid;
  gap: 9px;
}

.big-rank-list button {
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  color: var(--foreground);
  background: var(--surface);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
}
.big-rank-list button:hover { background: var(--surface-hover); border-color: var(--accent); }
:global([data-theme="dark"]) .big-rank-list button {
  color: #e0f2fe;
  background: rgba(15, 23, 42, 0.72);
  border-color: transparent;
}
:global([data-theme="dark"]) .big-rank-list button:hover { background: rgba(30,41,59,0.85); }

.big-rank-list b {
  position: relative;
  z-index: 1;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.big-rank-list span,
.big-rank-list em {
  position: relative;
  z-index: 1;
}

.big-rank-list strong,
.big-rank-list small {
  display: block;
  text-align: left;
}

.big-rank-list small {
  color: var(--foreground-muted);
  font-size: 11px;
}
:global([data-theme="dark"]) .big-rank-list small { color: rgba(186, 230, 253, 0.58); }

.big-rank-list i {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, rgba(59,130,246,0.12), rgba(99,102,241,0.04));
}
:global([data-theme="dark"]) .big-rank-list i {
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.34), rgba(250, 204, 21, 0.1));
}

.big-rank-list em {
  padding-right: 10px;
  color: var(--accent);
  font-size: 12px;
  font-style: normal;
  font-variant-numeric: tabular-nums;
}

.screen-map-panel {
  position: relative;
  min-height: 576px;
  padding: 14px;
  background: var(--surface);
  border-radius: 12px;
}
:global([data-theme="dark"]) .screen-map-panel {
  background:
    linear-gradient(rgba(8, 47, 73, 0.22) 1px, transparent 1px),
    linear-gradient(90deg, rgba(8, 47, 73, 0.22) 1px, transparent 1px),
    rgba(2, 6, 23, 0.66);
  background-size: 34px 34px;
}

.heat-map-only {
  background: var(--surface);
}
:global([data-theme="dark"]) .heat-map-only {
  background:
    radial-gradient(circle at 48% 48%, rgba(14, 165, 233, 0.12), transparent 38%),
    linear-gradient(rgba(8, 47, 73, 0.14) 1px, transparent 1px),
    linear-gradient(90deg, rgba(8, 47, 73, 0.14) 1px, transparent 1px),
    rgba(2, 6, 23, 0.72);
  background-size: auto, 52px 52px, 52px 52px, auto;
}

.heat-legend {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--foreground-muted);
  font-size: 11px;
  box-shadow: var(--shadow-card);
}
:global([data-theme="dark"]) .heat-legend {
  background: rgba(2, 6, 23, 0.7);
  color: rgba(224, 242, 254, 0.78);
  border-color: rgba(125, 211, 252, 0.18);
}

.heat-legend strong {
  color: var(--foreground);
  font-size: 12px;
}
:global([data-theme="dark"]) .heat-legend strong { color: #f8fafc; }

.heat-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.heat-legend i {
  width: 14px;
  height: 8px;
  border-radius: 999px;
}

.heat-low {
  background: #22d3ee;
}

.heat-mid {
  background: #facc15;
}

.heat-high {
  background: #ef4444;
}

.route-data-warning {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 2;
  max-width: min(440px, calc(100% - 170px));
  padding: 8px 10px;
  border: 1px solid rgba(250, 204, 21, 0.28);
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.10);
  color: #92400E;
  font-size: 12px;
}
:global([data-theme="dark"]) .route-data-warning {
  background: rgba(113, 63, 18, 0.38);
  color: #fef3c7;
}

.amap-heatmap {
  width: 100%;
  height: calc(100% - 34px);
  min-height: 500px;
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.35s ease;
  overflow: hidden;
}

.amap-heatmap.ready {
  opacity: 1;
}

.amap-heatmap :deep(.amap-logo),
.amap-heatmap :deep(.amap-copyright) {
  opacity: 0.36;
}

.map-fallback-note {
  position: absolute;
  left: 18px;
  top: 56px;
  z-index: 2;
  padding: 7px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--foreground-muted);
  font-size: 12px;
  box-shadow: var(--shadow-card);
}
:global([data-theme="dark"]) .map-fallback-note {
  border-color: rgba(125, 211, 252, 0.2);
  background: rgba(2, 6, 23, 0.68);
  color: rgba(224, 242, 254, 0.74);
}

.map-panel-head span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.8);
}

.map-panel-head span.active {
  background: #facc15;
  box-shadow: 0 0 18px rgba(250, 204, 21, 0.9);
  animation: livePulse 1s ease-in-out infinite;
}

.map-panel-head em {
  margin-left: auto;
  color: var(--foreground-muted);
  font-size: 12px;
  font-style: normal;
}
:global([data-theme="dark"]) .map-panel-head em { color: rgba(186, 230, 253, 0.68); }

.route-network {
  width: 100%;
  height: calc(100% - 34px);
  min-height: 500px;
}

.fallback-heatmap {
  position: absolute;
  inset: 48px 14px 14px;
  width: calc(100% - 28px);
  height: calc(100% - 62px);
}

.heat-layer {
  mix-blend-mode: screen;
  pointer-events: none;
}

.live .heat-layer circle {
  transform-box: fill-box;
  transform-origin: center;
  animation: heatBreath 2.4s ease-in-out infinite;
}

.city-outline {
  fill: rgba(14, 165, 233, 0.045);
  stroke: rgba(125, 211, 252, 0.24);
  stroke-width: 2;
}

.map-contour {
  fill: none;
  stroke: rgba(125, 211, 252, 0.13);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 6 10;
}

.map-contour.weak {
  stroke: rgba(125, 211, 252, 0.08);
  stroke-width: 1.5;
}

.map-place-labels text {
  fill: rgba(186, 230, 253, 0.32);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  paint-order: stroke;
  stroke: rgba(2, 6, 23, 0.86);
  stroke-width: 5px;
}

.spot-heat-list {
  display: grid;
  gap: 13px;
}

.spot-heat-list div {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 10px;
  color: var(--foreground);
  font-size: 12px;
}
:global([data-theme="dark"]) .spot-heat-list div { color: rgba(224, 242, 254, 0.86); }

.spot-heat-list i {
  height: 8px;
  border-radius: 999px;
  background: var(--surface);
  overflow: hidden;
}
:global([data-theme="dark"]) .spot-heat-list i { background: rgba(15, 23, 42, 0.92); }

.spot-heat-list b {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #3B82F6, #F97316, #EF4444);
}

.spot-heat-list em {
  color: var(--accent);
  font-style: normal;
  text-align: right;
  font-weight: 600;
}

.collection-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.collection-status-grid div {
  min-height: 58px;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--surface);
}
:global([data-theme="dark"]) .collection-status-grid div {
  border-color: rgba(125, 211, 252, 0.12);
  background: rgba(15, 23, 42, 0.58);
}

.collection-status-grid span,
.collection-status-grid strong {
  display: block;
}

.collection-status-grid span {
  color: var(--foreground-muted);
  font-size: 12px;
}
:global([data-theme="dark"]) .collection-status-grid span { color: rgba(186, 230, 253, 0.66); }

.collection-status-grid strong {
  margin-top: 6px;
  color: var(--foreground);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
:global([data-theme="dark"]) .collection-status-grid strong { color: #f8fafc; }

.collection-status-grid .status-online strong {
  color: #34d399;
}

.collection-status-grid .status-idle strong {
  color: #94a3b8;
}

.collection-status-grid .status-hot strong {
  color: #facc15;
}

@keyframes livePulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.7); opacity: 0.56; }
}

@keyframes heatBreath {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

@media (max-width: 1180px) {
  .screen-layout {
    grid-template-columns: 1fr;
  }

  .screen-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .screen-header,
  .screen-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .screen-kpis,
  .screen-column {
    grid-template-columns: 1fr;
  }

  .screen-title h2 {
    font-size: 22px;
  }

  .screen-map-panel {
    min-height: 420px;
  }

  .route-network {
    min-height: 360px;
  }

  .heat-legend,
  .route-data-warning {
    position: static;
    max-width: none;
    margin-bottom: 8px;
  }
}
</style>
