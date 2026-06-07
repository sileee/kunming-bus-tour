<script setup lang="ts">
import type { BusRoute } from '../types';

defineProps<{
  routes: BusRoute[];
}>();

const emit = defineEmits<{
  selectRoute: [routeId: number];
}>();
</script>

<template>
  <div>
    <div class="section-title"><h2>公交旅游线路</h2></div>
    <section class="cards-grid">
      <article
        v-for="route in routes"
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
          <span>🏷 {{ route.type }}</span>
        </div>
        <div class="route-stops-list">
          <span v-for="stop in route.stops?.slice(0, 6)" :key="stop.id" class="stop-tag">
            {{ stop.name }}
          </span>
          <span v-if="route.stops && route.stops.length > 6" class="stop-tag">+{{ route.stops.length - 6 }} 站</span>
        </div>
      </article>
    </section>
  </div>
</template>
