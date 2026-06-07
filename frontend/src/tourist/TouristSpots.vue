<script setup lang="ts">
import { ref } from 'vue';
import type { BusRoute, Spot } from '../types';
import { SPOT_GUIDES } from './spotGuides';

const props = defineProps<{
  spots: Spot[];
  routes: BusRoute[];
}>();

const emit = defineEmits<{
  selectSpot: [spot: Spot];
  showOnMap: [];
}>();

const expandedId = ref<number | null>(null);

function toggleExpand(spot: Spot) {
  expandedId.value = expandedId.value === spot.id ? null : spot.id;
}

function getRouteNumbers(spot: Spot): string {
  return props.routes
    .filter(r => r.spots?.some(s => s.id === spot.id))
    .map(r => r.number)
    .join('、') || '暂无';
}

function isExpanded(spot: Spot): boolean {
  return expandedId.value === spot.id;
}

const FEATURED_SPOTS = new Set(['翠湖公园', '南屏街', '海埂公园', '滇池大坝', '斗南花市']);
</script>

<template>
  <div>
    <div class="section-title"><h2>热门景点</h2></div>
    <section class="cards-grid">
      <article
        v-for="spot in spots"
        :key="spot.id"
        class="spot-card"
        :class="{
          expanded: isExpanded(spot),
          featured: FEATURED_SPOTS.has(spot.name)
        }"
        @click="toggleExpand(spot)"
      >
        <div v-if="FEATURED_SPOTS.has(spot.name) && !isExpanded(spot)" class="tape"></div>
        <img
          class="spot-img"
          :src="`/spot-real-images/${getImageName(spot.name)}`"
          :alt="spot.name"
          @error="($event.target as HTMLImageElement).style.background = '#e5e0d8'"
        />
        <div class="spot-body">
          <h3>{{ spot.name }}</h3>
          <div class="spot-meta">
            <span class="spot-tag tag-district">{{ spot.district }}</span>
            <span class="spot-tag tag-type">{{ spot.category }}</span>
            <span class="spot-tag tag-rating">★ {{ spot.rating }}</span>
          </div>
          <p>{{ spot.intro }}</p>
          <div v-if="isExpanded(spot)" class="detail-extra">
            <div v-if="SPOT_GUIDES[spot.name]" class="fade-in">
              <div class="guide-section guide-play">
                <h4>怎么玩</h4>
                <p>{{ SPOT_GUIDES[spot.name].play }}</p>
              </div>
              <div class="guide-section guide-exp">
                <h4>可以体验到什么</h4>
                <p>{{ SPOT_GUIDES[spot.name].exp }}</p>
              </div>
              <div class="guide-section guide-time">
                <h4>最佳时节</h4>
                <p v-html="SPOT_GUIDES[spot.name].time"></p>
              </div>
            </div>
          </div>
          <div class="route-hint">途经公交：<strong>{{ getRouteNumbers(spot) }}</strong></div>
          <button class="location-btn" @click.stop="emit('showOnMap'); emit('selectSpot', spot)">
            在地图上查看
          </button>
          <span class="collapse-hint">{{ isExpanded(spot) ? '点击卡片收起 ↑' : '点击卡片查看详细游玩攻略 ↑' }}</span>
        </div>
        <button v-if="isExpanded(spot)" class="close-btn" @click.stop="expandedId = null">×</button>
      </article>
    </section>
  </div>
</template>

<script lang="ts">
const IMAGE_MAP: Record<string, string> = {
  '翠湖公园': 'cuihu',
  '云南大学': 'yunda',
  '南屏街': 'nanping',
  '金马碧鸡坊': 'jinma',
  '大观公园': 'daguan',
  '海埂公园': 'haigeng',
  '云南民族村': 'minzu',
  '滇池大坝': 'dianchi',
  '世博园': 'shibo',
  '官渡古镇': 'guandu',
  '斗南花市': 'dounan',
  '西山风景区': 'xishan'
};

function getImageName(name: string): string {
  const base = IMAGE_MAP[name];
  if (!base) return '';
  // Try jpg first, some are png/jpeg
  if (name === '滇池大坝') return base + '.jpeg';
  if (name === '斗南花市') return base + '.png';
  return base + '.jpg';
}
</script>
