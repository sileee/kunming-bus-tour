<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { api, downloadMockCsv } from '../api';
import type { BusRoute, CollectionSample, CollectionSummary } from '../types';

const props = defineProps<{
  routes: BusRoute[];
  collectorRunning: boolean;
  collectorMessage: string;
}>();

const emit = defineEmits<{
  dataChanged: [];
  toggleCollector: [];
}>();

const samples = ref<CollectionSample[]>([]);
const summary = ref<CollectionSummary | null>(null);
const busy = ref(false);
const message = ref('');
const chartEl = ref<HTMLDivElement | null>(null);
let refreshTimer = 0;
let chart: echarts.ECharts | null = null;

const prevSummary = ref<{ sampleCount: number; avgSpeed: number; avgLoadRate: number }>({ sampleCount: 0, avgSpeed: 0, avgLoadRate: 0 });
const metricsChanged = ref({ count: false, speed: false, loadRate: false });

const form = reactive({
  routeId: props.routes[0]?.id || 1,
  speed: 28,
  passengerCount: 42,
  loadRate: 68,
  source: '人工补录'
});

const latestSamples = computed(() => samples.value.slice(-8).reverse());
const selectedRoute = computed(() => props.routes.find((route) => route.id === Number(form.routeId)) || props.routes[0]);
const visibleMessage = computed(() => props.collectorMessage || message.value);

function triggerMetricPulse(key: 'count' | 'speed' | 'loadRate') {
  metricsChanged.value[key] = true;
  setTimeout(() => { metricsChanged.value[key] = false; }, 600);
}

async function exportCsv() {
  try { await downloadMockCsv(); } catch { /* ignore */ }
}

async function loadCollection() {
  try {
    const [sampleData, summaryData] = await Promise.all([
      api.collectionSamples(),
      api.collectionSummary()
    ]);
    samples.value = sampleData;
    summary.value = summaryData;
    if (summaryData) {
      if (summaryData.sampleCount !== prevSummary.value.sampleCount) triggerMetricPulse('count');
      if (summaryData.avgSpeed !== prevSummary.value.avgSpeed) triggerMetricPulse('speed');
      if (summaryData.avgLoadRate !== prevSummary.value.avgLoadRate) triggerMetricPulse('loadRate');
      prevSummary.value = { sampleCount: summaryData.sampleCount, avgSpeed: summaryData.avgSpeed, avgLoadRate: summaryData.avgLoadRate };
    }
    renderChart();
  } catch (err) {
    message.value = err instanceof Error ? err.message : '采集数据加载失败，请检查后端服务';
  }
}

async function addSample() {
  const route = selectedRoute.value;
  if (!route) return;

  busy.value = true;
  try {
    const created = await api.createCollectionSample({
      routeId: route.id,
      speed: Number(form.speed),
      passengerCount: Number(form.passengerCount),
      loadRate: Number(form.loadRate),
      source: form.source
    });
    samples.value = [...samples.value, created].slice(-80);
    summary.value = await api.collectionSummary();
    message.value = '手动新增采集数据成功，已进入全站可视化模型';
    renderChart();
    emit('dataChanged');
  } catch (err) {
    message.value = err instanceof Error ? err.message : '采集失败，请检查后端服务';
  } finally {
    busy.value = false;
  }
}

function renderChart() {
  if (!chartEl.value) return;
  if (!chart) chart = echarts.init(chartEl.value);
  const recent = samples.value.slice(-18);
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { top: 42, left: 48, right: 20, bottom: 36 },
    animationDuration: 400,
    animationEasing: 'cubicOut',
    xAxis: {
      type: 'category',
      data: recent.map((item) => item.routeNumber || `R${item.routeId}`)
    },
    yAxis: { type: 'value', max: 110 },
    series: [
      { name: '满载率', type: 'line', smooth: true, data: recent.map((item) => item.loadRate), itemStyle: { color: '#ef4444' } },
      { name: '车内人数', type: 'bar', data: recent.map((item) => item.passengerCount), itemStyle: { color: '#5E6AD2' } },
      { name: '速度', type: 'line', smooth: true, data: recent.map((item) => item.speed), itemStyle: { color: '#14b8a6' } }
    ]
  });
}

onMounted(() => {
  loadCollection();
  refreshTimer = window.setInterval(loadCollection, 2000);
});

onUnmounted(() => {
  window.clearInterval(refreshTimer);
  chart?.dispose();
  chart = null;
});

watch(() => props.routes, () => {
  if (!form.routeId && props.routes[0]) form.routeId = props.routes[0].id;
});
</script>

<template>
  <section class="collection-layout">
    <article class="panel collector-hero">
      <div>
        <p class="eyebrow">数据采集过程</p>
        <h2>车载终端 -> API 接口 -> 全站可视化联动</h2>
        <p>点击开始采集后，系统会持续模拟公交车 GPS、客流传感器和电子站牌上报数据；切换页面也会继续运行，并驱动首页、地图、详情和分析图表变化。</p>
      </div>
      <button
        class="collector-switch"
        :class="{ running: collectorRunning }"
        :disabled="busy"
        @click="emit('toggleCollector')"
      >
        {{ collectorRunning ? '停止采集' : '开始采集' }}
      </button>
    </article>

    <!-- Data pipeline visualization -->
    <article class="pipeline-flow">
      <div class="pipeline-node" :class="{ active: collectorRunning }">车载终端<br/><small>GPS / 传感器</small></div>
      <div class="pipeline-arrow" :class="{ flowing: collectorRunning }"></div>
      <div class="pipeline-node" :class="{ active: collectorRunning }">POST API<br/><small>/collection/samples</small></div>
      <div class="pipeline-arrow" :class="{ flowing: collectorRunning }"></div>
      <div class="pipeline-node" :class="{ active: collectorRunning }">数据入库<br/><small>collection_samples</small></div>
      <div class="pipeline-arrow" :class="{ flowing: collectorRunning }"></div>
      <div class="pipeline-node" :class="{ active: collectorRunning }">客流模型<br/><small>collectionFactor</small></div>
      <div class="pipeline-arrow" :class="{ flowing: collectorRunning }"></div>
      <div class="pipeline-node" :class="{ active: collectorRunning }">全站可视化<br/><small>运营总览/地图/图表</small></div>
    </article>

    <section class="dashboard-grid">
      <article class="metric-panel" :class="{ 'metric-pulse': collectorRunning, 'value-changed': metricsChanged.count }">
        <span>采集样本</span>
        <strong>{{ summary?.sampleCount || 0 }}</strong>
        <small>最近运行数据</small>
      </article>
      <article class="metric-panel" :class="{ 'metric-pulse': collectorRunning }">
        <span>在线设备</span>
        <strong>{{ summary?.onlineDevices || 0 }}</strong>
        <small>模拟上报终端</small>
      </article>
      <article class="metric-panel" :class="{ 'metric-pulse': collectorRunning, 'value-changed': metricsChanged.speed }">
        <span>平均速度</span>
        <strong>{{ summary?.avgSpeed || 0 }}</strong>
        <small>km/h</small>
      </article>
      <article class="metric-panel" :class="{ 'metric-pulse': collectorRunning, 'value-changed': metricsChanged.loadRate }">
        <span>平均满载率</span>
        <strong>{{ summary?.avgLoadRate || 0 }}%</strong>
        <small>影响客流模型</small>
      </article>
    </section>

    <section class="content-grid two-columns">
      <article class="panel chart-panel">
        <div class="section-title">
          <div>
            <p class="eyebrow">实时可视化</p>
            <h2>采集数据趋势</h2>
          </div>
          <span :class="{ 'live-badge': collectorRunning }">{{ collectorRunning ? '采集中' : '已暂停' }}</span>
        </div>
        <div ref="chartEl" class="chart"></div>
      </article>

      <article class="panel">
        <div class="section-title">
          <div>
            <p class="eyebrow">新增数据</p>
            <h2>手动补录样本</h2>
          </div>
        </div>
        <form class="admin-form" @submit.prevent="addSample">
          <label>
            线路
            <select v-model.number="form.routeId">
              <option v-for="route in routes" :key="route.id" :value="route.id">
                {{ route.number }} {{ route.name }}
              </option>
            </select>
          </label>
          <label>速度 km/h<input v-model.number="form.speed" type="number" min="0" /></label>
          <label>车内人数<input v-model.number="form.passengerCount" type="number" min="0" /></label>
          <label>满载率 %<input v-model.number="form.loadRate" type="number" min="0" max="100" /></label>
          <label>来源<input v-model="form.source" /></label>
          <button class="primary-btn" :disabled="busy">新增并驱动全站变化</button>
        </form>
        <p v-if="visibleMessage" class="form-message">{{ visibleMessage }}</p>
      </article>
    </section>

    <article class="panel">
      <div class="section-title">
        <h2>最近采集记录</h2>
        <div class="title-actions">
          <span>每 2 秒刷新</span>
          <a href="#" @click.prevent="exportCsv" class="export-btn">导出 CSV</a>
        </div>
      </div>
      <div class="admin-table">
        <div class="admin-row collection-head">
          <span>线路</span><span>来源</span><span>速度</span><span>人数</span><span>满载率</span>
        </div>
        <div v-for="item in latestSamples" :key="item.id" class="admin-row collection-row">
          <strong>{{ item.routeNumber }}</strong>
          <span>{{ item.source }}</span>
          <span>{{ item.speed }} km/h</span>
          <span>{{ item.passengerCount }}</span>
          <span>{{ item.loadRate }}%</span>
        </div>
      </div>
    </article>
  </section>
</template>
