<script setup lang="ts">
import type { BusRoute } from '../types';

defineProps<{
  route: BusRoute;
  routes: BusRoute[];
}>();

defineEmits<{
  changeRoute: [routeId: number];
}>();
</script>

<template>
  <section class="detail-layout">
    <aside class="panel">
      <p class="eyebrow">线路选择</p>
      <button
        v-for="item in routes"
        :key="item.id"
        class="detail-route-link"
        :class="{ active: item.id === route.id }"
        @click="$emit('changeRoute', item.id)"
      >
        <span :style="{ background: item.color }">{{ item.number }}</span>
        <strong>{{ item.name }}</strong>
      </button>
    </aside>

    <article class="panel route-detail-main">
      <div class="route-title">
        <span :style="{ background: route.color }">{{ route.number }}</span>
        <div>
          <p class="eyebrow">{{ route.type }}</p>
          <h2>{{ route.name }}</h2>
          <small>{{ route.start }} → {{ route.end }}</small>
        </div>
      </div>

      <div class="detail-metrics">
        <div><span>运营时间</span><strong>{{ route.operationTime }}</strong></div>
        <div><span>票价</span><strong>{{ route.fare }}</strong></div>
        <div><span>站点数</span><strong>{{ route.stops.length }}</strong></div>
        <div><span>推荐景点</span><strong>{{ route.spots.length }}</strong></div>
      </div>

      <section class="timeline">
        <h3>途经站点</h3>
        <ol>
          <li v-for="stop in route.stops" :key="stop.id">
            <span>{{ stop.sequence }}</span>
            <strong>{{ stop.name }}</strong>
            <small>{{ stop.district }}</small>
          </li>
        </ol>
      </section>
    </article>

    <aside class="panel">
      <p class="eyebrow">线路运营指标</p>
      <div v-if="route.statistics" class="stat-stack">
        <div><span>客流量</span><strong>{{ route.statistics.passengerFlow.toLocaleString('zh-CN') }}</strong></div>
        <div><span>准点率</span><strong>{{ route.statistics.punctuality }}%</strong></div>
        <div><span>拥挤度</span><strong>{{ route.statistics.congestion }}</strong></div>
        <div><span>热度值</span><strong>{{ route.statistics.heat }}</strong></div>
      </div>

      <p class="eyebrow nearby-title">附近景点</p>
      <div class="spot-list">
        <article v-for="spot in route.spots" :key="spot.id">
          <strong>{{ spot.name }}</strong>
          <span>{{ spot.category }} · {{ spot.district }}</span>
          <small>{{ spot.intro }}</small>
        </article>
      </div>
    </aside>
  </section>
</template>
