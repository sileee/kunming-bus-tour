<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { BusRoute, Spot } from '../types';
import { touristApi } from './tourist-api';
import TouristMap from './TouristMap.vue';
import TouristSpots from './TouristSpots.vue';
import TouristRoutes from './TouristRoutes.vue';
import TouristDetail from './TouristDetail.vue';

type View = 'map' | 'spots' | 'routes' | 'detail';

const routes = ref<BusRoute[]>([]);
const spots = ref<Spot[]>([]);
const selectedRouteId = ref<number | null>(null);
const selectedSpot = ref<Spot | null>(null);
const activeView = ref<View>('map');
const loading = ref(true);
const error = ref('');

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [routeData, spotData] = await Promise.all([
      touristApi.routes(),
      touristApi.spots()
    ]);
    routes.value = routeData;
    spots.value = spotData;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '数据加载失败';
  } finally {
    loading.value = false;
  }
}

function switchView(view: View) {
  activeView.value = view;
  selectedSpot.value = null;
  selectedRouteId.value = null;
}

function selectSpot(spot: Spot) {
  selectedSpot.value = spot;
  selectedRouteId.value = null;
  activeView.value = 'detail';
}

function selectRoute(routeId: number) {
  selectedRouteId.value = routeId;
  selectedSpot.value = null;
  activeView.value = 'detail';
}

function goBack() {
  if (activeView.value === 'detail') {
    activeView.value = selectedSpot.value ? 'spots' : 'routes';
  }
}

onMounted(async () => {
  await loadData();
  // Handle ?spot= deep link from landing page
  const spotParam = new URLSearchParams(window.location.search).get('spot');
  if (spotParam) {
    const spot = spots.value.find(s => s.name === spotParam);
    if (spot) {
      selectedSpot.value = spot;
      activeView.value = 'map';
    }
  }
});
</script>

<template>
  <!-- Top Bar -->
  <header class="top-bar">
    <a href="/" class="logo" style="text-decoration:none;" title="返回首页">
      <span class="logo-icon">KM</span>
      <span>昆明公交旅游导览</span>
    </a>
    <nav class="nav-buttons" style="flex:1;justify-content:center;">
      <button class="nav-btn" :class="{ active: activeView === 'map' }" @click="switchView('map')">
        <span class="emoji">🗺</span> 地图
      </button>
      <button class="nav-btn" :class="{ active: activeView === 'spots' }" @click="switchView('spots')">
        <span class="emoji">📍</span> 景点
      </button>
      <button class="nav-btn" :class="{ active: activeView === 'routes' }" @click="switchView('routes')">
        <span class="emoji">🚌</span> 线路
      </button>
    </nav>
    <a href="/" class="cloud-top" title="管理员入口">
      <svg width="44" height="24" viewBox="0 0 44 24"><path d="M8,22 C3,22 0,18 0,13.5 C0,9 3,6 8,6 C9,2.5 13,0 17,0 C21,0 25,1.5 26,5 C27,4 29,3 31,3 C35.5,3 39,7 39,11.5 C39,12.5 38.5,13.5 37.5,14 C40,15 42,17.5 42,20 C42,23 39.5,25 36,25 L8,22 Z" fill="rgba(200,200,200,0.3)" stroke="rgba(180,180,180,0.4)" stroke-width="1.5"/></svg>
    </a>
  </header>

  <!-- Content -->
  <main class="main-content">
    <template v-if="loading">
      <div class="loading-state">
        <span style="font-size:40px">🚌</span>
        <span>正在加载昆明公交旅游数据...</span>
      </div>
    </template>

    <template v-else-if="error">
      <div class="empty-state">
        <span style="font-size:40px">😕</span>
        <strong>数据加载失败</strong>
        <span>{{ error }}</span>
        <button class="back-btn" @click="loadData">重新加载</button>
      </div>
    </template>

    <template v-else>
      <TouristMap
        v-if="activeView === 'map'"
        :routes="routes"
        :spots="spots"
        @select-route="selectRoute"
        @select-spot="selectSpot"
      />
      <TouristSpots
        v-else-if="activeView === 'spots'"
        :spots="spots"
        :routes="routes"
        @select-spot="selectSpot"
        @show-on-map="switchView('map')"
      />
      <TouristRoutes
        v-else-if="activeView === 'routes'"
        :routes="routes"
        @select-route="selectRoute"
      />
      <TouristDetail
        v-else-if="activeView === 'detail'"
        :routes="routes"
        :selected-route-id="selectedRouteId"
        :selected-spot="selectedSpot"
        @back="goBack"
        @select-route="selectRoute"
        @select-spot="selectSpot"
      />
    </template>
  </main>

  <!-- Footer -->
  <footer class="scrap-footer">
    <a href="/" class="back-btn" style="margin-right:16px;">🏠 返回首页</a>
    <span class="dash-arrow">→</span> 点击景点卡片展开游玩攻略 | 点击巴士按钮查询公交线路 | 12 个景点 · 10 条公交线路
  </footer>
</template>
