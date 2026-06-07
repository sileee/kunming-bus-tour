<script setup lang="ts">
import { computed } from 'vue';
import type { BusRoute, Spot } from '../types';
import { SPOT_GUIDES } from './spotGuides';

const props = defineProps<{
  routes: BusRoute[];
  selectedRouteId: number | null;
  selectedSpot: Spot | null;
}>();

const emit = defineEmits<{
  back: [];
  selectRoute: [routeId: number];
  selectSpot: [spot: Spot];
}>();

const selectedRoute = computed(() =>
  props.routes.find(r => r.id === props.selectedRouteId) || null
);

const nearbyRoutes = computed(() => {
  if (!props.selectedSpot || !props.routes) return [];
  return props.routes.filter(r =>
    r.spots?.some(s => s.id === props.selectedSpot!.id)
  );
});
</script>

<template>
  <div class="detail-panel fade-in">
    <button class="back-btn" @click="emit('back')">← 返回</button>

    <!-- Spot Detail -->
    <template v-if="selectedSpot">
      <article class="spot-card expanded" style="cursor:default; max-width:100%;">
        <img
          class="spot-img"
          :src="`/spot-real-images/${getSpotImage(selectedSpot.name)}`"
          :alt="selectedSpot.name"
          @error="($event.target as HTMLImageElement).style.background = '#e5e0d8'"
        />
        <div class="spot-body">
          <h3>{{ selectedSpot.name }}</h3>
          <div class="spot-meta">
            <span class="spot-tag tag-district">{{ selectedSpot.district }}</span>
            <span class="spot-tag tag-type">{{ selectedSpot.category }}</span>
            <span class="spot-tag tag-rating">★ {{ selectedSpot.rating }}</span>
          </div>
          <p>{{ selectedSpot.intro }}</p>
          <div class="detail-extra" style="display:block;">
            <div v-if="SPOT_GUIDES[selectedSpot.name]">
              <div class="guide-section guide-play">
                <h4>怎么玩</h4>
                <p>{{ SPOT_GUIDES[selectedSpot.name].play }}</p>
              </div>
              <div class="guide-section guide-exp">
                <h4>可以体验到什么</h4>
                <p>{{ SPOT_GUIDES[selectedSpot.name].exp }}</p>
              </div>
              <div class="guide-section guide-time">
                <h4>最佳时节</h4>
                <p v-html="SPOT_GUIDES[selectedSpot.name].time"></p>
              </div>
            </div>
          </div>
          <div class="route-hint">
            途经公交：<strong>{{ nearbyRoutes.map(r => r.number).join('、') || '暂无' }}</strong>
          </div>
        </div>
      </article>

      <!-- Connected routes -->
      <div v-if="nearbyRoutes.length" style="margin-top:28px;">
        <div class="section-title"><h2>可到达此景点的公交线路</h2></div>
        <section class="cards-grid">
          <article
            v-for="route in nearbyRoutes"
            :key="route.id"
            class="route-card"
            @click="emit('selectRoute', route.id)"
          >
            <div class="route-badge">
              <span class="route-color-dot" :style="{ background: route.color }"></span>
              {{ route.number }}
            </div>
            <h3>{{ route.name }}</h3>
            <div class="route-endpoints">{{ route.start }} → {{ route.end }}</div>
            <div class="route-detail-row">
              <span>⏰ {{ route.operationTime }}</span>
              <span>💴 {{ route.fare }}</span>
            </div>
          </article>
        </section>
      </div>
    </template>

    <!-- Route Detail -->
    <template v-else-if="selectedRoute">
      <article class="route-card" style="cursor:default; transform:none;">
        <div class="route-badge">
          <span class="route-color-dot" :style="{ background: selectedRoute.color }"></span>
          {{ selectedRoute.number }}
        </div>
        <h3>{{ selectedRoute.name }}</h3>
        <div class="route-endpoints">{{ selectedRoute.start }} → {{ selectedRoute.end }}</div>
        <div class="route-detail-row">
          <span>⏰ {{ selectedRoute.operationTime }}</span>
          <span>💴 {{ selectedRoute.fare }}</span>
          <span>🏷 {{ selectedRoute.type }}</span>
        </div>
      </article>

      <!-- Stops timeline -->
      <div v-if="selectedRoute.stops?.length" style="margin-top:20px;">
        <div class="section-title"><h2>途经站点（{{ selectedRoute.stops.length }} 站）</h2></div>
        <section class="cards-grid">
          <div
            v-for="(stop, idx) in selectedRoute.stops"
            :key="stop.id"
            class="route-card"
            style="cursor:default; transform:none; padding:16px 20px;"
          >
            <div style="font-family:'Kalam',cursive; font-size:20px; color:var(--red);">
              {{ idx + 1 }}. {{ stop.name }}
            </div>
            <div style="font-size:14px; color:#888; margin-top:2px;">{{ stop.district }}</div>
          </div>
        </section>
      </div>

      <!-- Nearby spots -->
      <div v-if="selectedRoute.spots?.length" style="margin-top:20px;">
        <div class="section-title"><h2>沿线景点</h2></div>
        <section class="cards-grid">
          <article
            v-for="spot in selectedRoute.spots"
            :key="spot.id"
            class="spot-card"
            style="cursor:pointer;"
            @click="emit('selectSpot', spot)"
          >
            <img
              class="spot-img"
              :src="`/spot-real-images/${getSpotImage(spot.name)}`"
              :alt="spot.name"
              @error="($event.target as HTMLImageElement).style.background = '#e5e0d8'"
            />
            <div class="spot-body">
              <h3>{{ spot.name }}</h3>
              <div class="spot-meta">
                <span class="spot-tag tag-district">{{ spot.district }}</span>
                <span class="spot-tag tag-rating">★ {{ spot.rating }}</span>
              </div>
              <p>{{ spot.intro }}</p>
            </div>
          </article>
        </section>
      </div>
    </template>

    <div v-if="!selectedSpot && !selectedRoute" class="empty-state">
      <span style="font-size:40px;">📋</span>
      <strong>请选择一个景点或线路</strong>
      <span>点击景点卡片或线路卡片查看详情</span>
    </div>
  </div>
</template>

<script lang="ts">
const IMAGE_MAP: Record<string, string> = {
  '翠湖公园': 'cuihu.jpg',
  '云南大学': 'yunda.jpg',
  '南屏街': 'nanping.jpg',
  '金马碧鸡坊': 'jinma.jpg',
  '大观公园': 'daguan.jpg',
  '海埂公园': 'haigeng.jpg',
  '云南民族村': 'minzu.jpg',
  '滇池大坝': 'dianchi.jpeg',
  '世博园': 'shibo.jpg',
  '官渡古镇': 'guandu.jpg',
  '斗南花市': 'dounan.png',
  '西山风景区': 'xishan.jpg'
};

function getSpotImage(name: string): string {
  return IMAGE_MAP[name] || '';
}
</script>
