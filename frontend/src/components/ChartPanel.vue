<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { busRoutes, stations, timeFlowData, routeTypes } from '../data/busData';

const flowChartEl = ref<HTMLDivElement | null>(null);
const timeChartEl = ref<HTMLDivElement | null>(null);
const stationChartEl = ref<HTMLDivElement | null>(null);
const typeChartEl = ref<HTMLDivElement | null>(null);

let charts: echarts.ECharts[] = [];

function themeColors() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    bg: 'transparent',
    tc: isLight ? '#1a1a2e' : '#EDEDEF',
    gc: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
    accent: '#5E6AD2',
    tooltipBg: isLight ? '#ffffff' : '#0a0a0c',
    tooltipTc: isLight ? '#1a1a2e' : '#EDEDEF',
  };
}

function renderCharts() {
  const { bg, tc, gc, accent, tooltipBg, tooltipTc } = themeColors();

  // 1. Route flow bar
  if (flowChartEl.value) {
    const c = echarts.init(flowChartEl.value, null, { renderer: 'canvas' });
    charts.push(c);
    const sorted = [...busRoutes].sort((a, b) => b.passengerFlow - a.passengerFlow);
    c.setOption({
      backgroundColor: bg,
      tooltip: { trigger: 'axis', backgroundColor: tooltipBg, borderColor: gc, textStyle: { color: tooltipTc, fontSize: 12 } },
      grid: { top: 28, left: 52, right: 16, bottom: 40 },
      xAxis: { type: 'category', data: sorted.map(r => r.name), axisLabel: { color: tc, fontSize: 10, rotate: 20 }, axisLine: { lineStyle: { color: gc } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: tc, fontSize: 10, formatter: (v: number) => v >= 10000 ? (v/10000).toFixed(1)+'w' : v }, splitLine: { lineStyle: { color: gc, type: 'dashed' } } },
      series: [{ type: 'bar', data: sorted.map(r => r.passengerFlow), barWidth: 18,
        itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:accent},{offset:1,color:'#3B3F99'}]) },
        label: { show: true, position: 'top', color: tc, fontSize: 10, fontWeight: 600, formatter: (p: any) => p.value >= 10000 ? (p.value/10000).toFixed(1)+'w' : p.value }
      }]
    });
  }

  // 2. Time flow line
  if (timeChartEl.value) {
    const c = echarts.init(timeChartEl.value, null, { renderer: 'canvas' });
    charts.push(c);
    c.setOption({
      backgroundColor: bg,
      tooltip: { trigger: 'axis', backgroundColor: tooltipBg, borderColor: gc, textStyle: { color: tooltipTc, fontSize: 12 } },
      grid: { top: 28, left: 52, right: 16, bottom: 40 },
      xAxis: { type: 'category', data: timeFlowData.map(d => d.time), axisLabel: { color: tc, fontSize: 10 }, axisLine: { lineStyle: { color: gc } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: tc, fontSize: 10 }, splitLine: { lineStyle: { color: gc, type: 'dashed' } } },
      series: [{ type: 'line', data: timeFlowData.map(d => d.flow), smooth: true, symbol: 'none',
        lineStyle: { width: 3, color: accent },
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:accent+'44'},{offset:1,color:accent+'00'}]) }
      }]
    });
  }

  // 3. Top stations horizontal bar
  if (stationChartEl.value) {
    const c = echarts.init(stationChartEl.value, null, { renderer: 'canvas' });
    charts.push(c);
    const top = [...stations].filter(s => s.passengerFlow).sort((a,b) => (b.passengerFlow||0)-(a.passengerFlow||0)).slice(0,8);
    c.setOption({
      backgroundColor: bg,
      tooltip: { trigger: 'axis', backgroundColor: tooltipBg, borderColor: gc, textStyle: { color: tooltipTc, fontSize: 12 } },
      grid: { top: 8, left: 80, right: 52, bottom: 8 },
      xAxis: { type: 'value', axisLabel: { color: tc, fontSize: 10 }, splitLine: { lineStyle: { color: gc, type: 'dashed' } } },
      yAxis: { type: 'category', data: top.map(s => s.name), axisLabel: { color: tc, fontSize: 11 }, axisLine: { lineStyle: { color: gc } }, axisTick: { show: false } },
      series: [{ type: 'bar', data: top.map(s => s.passengerFlow), barWidth: 14,
        itemStyle: { borderRadius: [0,4,4,0], color: new echarts.graphic.LinearGradient(1,0,0,0,[{offset:0,color:accent},{offset:1,color:'#3B3F99'}]) },
        label: { show: true, position: 'right', color: tc, fontSize: 10, fontWeight: 600, formatter: (p: any) => (p.value/1000).toFixed(1)+'k' }
      }]
    });
  }

  // 4. Route type pie
  if (typeChartEl.value) {
    const c = echarts.init(typeChartEl.value, null, { renderer: 'canvas' });
    charts.push(c);
    const colors = ['#5E6AD2','#6872D9','#8b5cf6','#f97316','#14b8a6','#ef4444'];
    c.setOption({
      backgroundColor: bg,
      tooltip: { trigger: 'item', backgroundColor: tooltipBg, borderColor: gc, textStyle: { color: tooltipTc, fontSize: 12 } },
      legend: { orient: 'vertical', right: 8, top: 'center', textStyle: { color: tc, fontSize: 12, fontWeight: 500 } },
      series: [{ type: 'pie', radius: ['45%','72%'], center: ['38%','50%'],
        itemStyle: { borderColor: 'transparent', borderWidth: 2, borderRadius: 4 },
        label: { show: false },
        emphasis: { scaleSize: 10, label: { show: true, fontSize: 16, fontWeight: 'bold' } },
        data: routeTypes.map((rt, i) => ({ name: rt.type, value: rt.value, itemStyle: { color: colors[i % colors.length] } }))
      }]
    });
  }
}

let themeObserver: MutationObserver | null = null;

onMounted(() => {
  renderCharts();
  window.addEventListener('resize', () => charts.forEach(c => c.resize()));
  // Re-render on theme change
  themeObserver = new MutationObserver(() => {
    charts.forEach(c => c.dispose());
    charts = [];
    renderCharts();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});

onUnmounted(() => {
  charts.forEach(c => c.dispose());
  charts = [];
  if (themeObserver) themeObserver.disconnect();
});
</script>

<template>
  <section class="charts-dashboard">
    <article class="panel chart-card chart-wide">
      <p class="eyebrow">线路日均客流量</p>
      <h3>各线路客流对比</h3>
      <div ref="flowChartEl" class="echart-lg"></div>
    </article>
    <article class="panel chart-card chart-wide">
      <p class="eyebrow">全天客流时段分布</p>
      <h3>24h 客流变化趋势</h3>
      <div ref="timeChartEl" class="echart-lg"></div>
    </article>
    <article class="panel chart-card">
      <p class="eyebrow">热门站点客流排行</p>
      <h3>TOP 8 站点</h3>
      <div ref="stationChartEl" class="echart-md"></div>
    </article>
    <article class="panel chart-card">
      <p class="eyebrow">线路类型占比</p>
      <h3>运营结构分布</h3>
      <div ref="typeChartEl" class="echart-md"></div>
    </article>
  </section>
</template>
