<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { Overview, RouteStatistic, Spot } from '../types';

const props = defineProps<{
  overview: Overview;
  statistics: RouteStatistic[];
  spots: Spot[];
  collectorRunning: boolean;
}>();

const flowChart = ref<HTMLDivElement | null>(null);
const spotChart = ref<HTMLDivElement | null>(null);
const districtChart = ref<HTMLDivElement | null>(null);
const congestionChart = ref<HTMLDivElement | null>(null);

let flowInstance: echarts.ECharts | null = null;
let spotInstance: echarts.ECharts | null = null;
let districtInstance: echarts.ECharts | null = null;
let congestionInstance: echarts.ECharts | null = null;

function heatColor(h: number) {
  if (h >= 85) return '#ef4444';
  if (h >= 70) return '#f97316';
  return '#5E6AD2';
}

function renderCharts() {
  if (!flowChart.value || !spotChart.value || !districtChart.value || !congestionChart.value) return;

  if (!flowInstance) flowInstance = echarts.init(flowChart.value);
  if (!spotInstance) spotInstance = echarts.init(spotChart.value);
  if (!districtInstance) districtInstance = echarts.init(districtChart.value);
  if (!congestionInstance) congestionInstance = echarts.init(congestionChart.value);

  const flowSorted = props.statistics.slice().sort((a, b) => b.passengerFlow - a.passengerFlow);
  const spotSorted = props.spots.slice().sort((a, b) => b.heat - a.heat).slice(0, 8);

  // ── Passenger flow: vertical bars with gradient, rounded corners, labels ──
  flowInstance.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e5edf5',
      textStyle: { color: '#172033', fontSize: 13 },
      formatter: (p: any) => {
        const d = p[0];
        return `<strong>${d.name}</strong><br/>客流量 <b style="color:#5E6AD2;">${d.value.toLocaleString()}</b> 人次/日`;
      }
    },
    grid: { top: 18, left: 8, right: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: flowSorted.map((item) => item.routeNumber),
      axisLine: { lineStyle: { color: '#e5edf5' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11, fontWeight: 600 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, formatter: (v: number) => v >= 10000 ? (v / 10000).toFixed(1) + 'w' : v }
    },
    animationDuration: 600,
    animationEasing: 'cubicOut',
    series: [{
      type: 'bar',
      data: flowSorted.map((item) => ({
        value: item.passengerFlow,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#5E6AD2' }, { offset: 1, color: '#8B92E8' }
          ])
        }
      })),
      barWidth: 22,
      emphasis: {
        itemStyle: { color: '#6872D9' }
      },
      label: {
        show: true,
        position: 'top',
        color: '#64748b',
        fontSize: 10,
        fontWeight: 600,
        // Keep live increments visible; compact “3.2w” labels hide small batches.
        formatter: (p: any) => Number(p.value).toLocaleString('zh-CN')
      }
    }]
  });

  // ── Spot heat: horizontal bars, fresh teal-green gradient ──
  const spotNames = spotSorted.map((s) => s.name);
  const spotValues = spotSorted.map((s) => s.heat);
  spotInstance.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e5edf5',
      textStyle: { color: '#172033', fontSize: 13 },
      formatter: (p: any) => {
        const d = p[0];
        return `<strong>${d.name}</strong><br/>热度指数 <b style="color:#8B92E8;">${d.value}</b> / 100`;
      }
    },
    grid: { top: 8, left: 72, right: 36, bottom: 6 },
    xAxis: {
      type: 'value', max: 100,
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 }
    },
    yAxis: {
      type: 'category',
      data: spotNames,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#334155', fontSize: 12, fontWeight: 500, width: 68, overflow: 'truncate' }
    },
    animationDuration: 600,
    animationEasing: 'cubicOut',
    series: [{
      type: 'bar',
      data: spotValues.map((v) => ({
        value: v,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#8B92E8' }, { offset: 0.5, color: '#6872D9' }, { offset: 1, color: '#5E6AD2' }
          ])
        }
      })),
      barWidth: 15,
      label: {
        show: true,
        position: 'right',
        color: '#0d9488',
        fontSize: 11,
        fontWeight: 700,
        formatter: '{c}'
      }
    }]
  });

  // ── District distribution: donut with modern palette ──
  const districtColors = ['#5E6AD2', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444'];
  districtInstance.setOption({
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e5edf5', textStyle: { color: '#172033' } },
    animationDuration: 500,
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '52%'],
      avoidLabelOverlap: false,
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 4 },
      label: { show: true, position: 'outside', color: '#64748b', fontSize: 11, formatter: '{b}\n{d}%' },
      emphasis: { label: { fontSize: 16, fontWeight: 'bold' }, scaleSize: 12 },
      data: Object.entries(props.overview.districtStopCount).map(([name, value], i) => ({
        name, value,
        itemStyle: { color: districtColors[i % districtColors.length] }
      }))
    }]
  });

  // ── Congestion & punctuality: dual lines with area fill ──
  congestionInstance.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e5edf5',
      textStyle: { color: '#172033', fontSize: 13 }
    },
    legend: {
      top: 0,
      itemWidth: 16,
      itemHeight: 3,
      textStyle: { fontSize: 12, color: '#64748b' }
    },
    grid: { top: 28, left: 8, right: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: props.statistics.map((item) => item.routeNumber),
      axisLine: { lineStyle: { color: '#e5edf5' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11, fontWeight: 600 }
    },
    yAxis: {
      type: 'value', max: 100,
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 }
    },
    animationDuration: 600,
    animationEasing: 'cubicOut',
    series: [
      {
        name: '拥堵指数', type: 'line',
        data: props.statistics.map((item) => item.congestion),
        smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { width: 3, color: '#dc2626' },
        itemStyle: { color: '#dc2626' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(220,38,38,0.15)' }, { offset: 1, color: 'rgba(220,38,38,0)' }]) }
      },
      {
        name: '准点率', type: 'line',
        data: props.statistics.map((item) => item.punctuality),
        smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { width: 3, color: '#16a34a' },
        itemStyle: { color: '#16a34a' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(22,163,74,0.15)' }, { offset: 1, color: 'rgba(22,163,74,0)' }]) }
      }
    ]
  });
}

function disposeCharts() {
  flowInstance?.dispose();
  spotInstance?.dispose();
  districtInstance?.dispose();
  congestionInstance?.dispose();
  flowInstance = null;
  spotInstance = null;
  districtInstance = null;
  congestionInstance = null;
}

let resizeHandler = () => {
  flowInstance?.resize();
  spotInstance?.resize();
  districtInstance?.resize();
  congestionInstance?.resize();
};

onMounted(() => {
  renderCharts();
  window.addEventListener('resize', resizeHandler);
});

onUnmounted(() => {
  disposeCharts();
  window.removeEventListener('resize', resizeHandler);
});

watch(() => [props.statistics, props.spots, props.overview], () => renderCharts(), { deep: true });
</script>

<template>
  <section class="analytics-grid">
    <article class="panel chart-panel">
      <div class="section-title">
        <h2>线路客流排行</h2>
        <div class="live-indicator-row">
          <span v-if="collectorRunning" class="live-badge">采集中</span>
          <span class="metric-label">人次 / 日</span>
        </div>
      </div>
      <div ref="flowChart" class="chart chart-lg"></div>
    </article>
    <article class="panel chart-panel">
      <div class="section-title">
        <h2>景点热度指数</h2>
        <span>动态刷新 · 0-100</span>
      </div>
      <div ref="spotChart" class="chart chart-lg"></div>
    </article>
    <article class="panel chart-panel">
      <div class="section-title"><h2>站点区域分布</h2><span>按行政区</span></div>
      <div ref="districtChart" class="chart chart-lg"></div>
    </article>
    <article class="panel chart-panel">
      <div class="section-title">
        <h2>拥挤度与准点率</h2>
        <span>线路对比</span>
      </div>
      <div ref="congestionChart" class="chart chart-lg"></div>
    </article>
  </section>
</template>
