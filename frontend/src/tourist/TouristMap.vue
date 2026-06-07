<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { BusRoute, Spot } from '../types';
import { touristApi } from './tourist-api';

const props = defineProps<{
  routes: BusRoute[];
  spots: Spot[];
}>();

const emit = defineEmits<{
  selectRoute: [routeId: number];
  selectSpot: [spot: Spot];
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const mapReady = ref(false);
const mapError = ref('');
const highlightedRouteId = ref<number | null>(null);
const selectedPoi = ref<{ id: string; name: string; type: string; address: string; lng: number; lat: number; image?: string; intro?: string; rating?: number } | null>(null);

const highlightedRoute = computed(() =>
  props.routes.find(r => r.id === highlightedRouteId.value) || null
);

// Per-route progress for arrow animation
const routeProgress = ref<Record<number, number>>({});

// Real road paths
const realPaths = ref<Record<string, [number, number][]>>({});

let amapInstance: any = null;
let polylineOverlays: any[] = [];
let stopMarkerOverlays: any[] = [];
let spotMarkerOverlays: any[] = [];
let busArrowMarkers: Map<number, any> = new Map();
let animationTimer = 0;

/* ---------- helpers ---------- */
function isValidLngLat(lng: unknown, lat: unknown) {
  const x = Number(lng); const y = Number(lat);
  return Number.isFinite(x) && Number.isFinite(y) && x > 70 && x < 140 && y > 3 && y < 55;
}

function cleanPath(path: [number, number][] = []) {
  const cleaned = path.map(([lng, lat]) => [Number(lng), Number(lat)] as [number, number])
    .filter(([lng, lat]) => isValidLngLat(lng, lat));
  return cleaned.length > 0 ? cleaned : [[102.7229, 25.0156] as [number, number]];
}

function getDisplayPath(route: BusRoute): [number, number][] {
  return cleanPath(realPaths.value[route.number] || route.polyline || []);
}

function interpolatePath(points: [number, number][], value: number) {
  if (points.length === 0) return { lng: 102.72, lat: 25.04 };
  if (points.length === 1) return { lng: points[0][0], lat: points[0][1] };
  const maxSegment = points.length - 1;
  const scaled = value * maxSegment;
  const index = Math.min(Math.floor(scaled), maxSegment - 1);
  const ratio = scaled - index;
  const [lng1, lat1] = points[index];
  const [lng2, lat2] = points[index + 1];
  return { lng: lng1 + (lng2 - lng1) * ratio, lat: lat1 + (lat2 - lat1) * ratio };
}

function pathBearing(points: [number, number][], value: number) {
  if (points.length < 2) return 0;
  const segment = Math.min(Math.floor(value * (points.length - 1)), points.length - 2);
  const [lng1, lat1] = points[segment];
  const [lng2, lat2] = points[segment + 1];
  return Math.atan2(lat2 - lat1, lng2 - lng1) * 180 / Math.PI;
}

/* ---------- AMap setup ---------- */
function loadAmapScript() {
  const key = import.meta.env.VITE_AMAP_KEY;
  if (!key) return Promise.reject(new Error('未配置 VITE_AMAP_KEY'));
  if ((window as any).AMap) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE;
    if (securityJsCode) { (window as any)._AMapSecurityConfig = { securityJsCode }; }
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Driving`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.head.appendChild(script);
  });
}

function fetchDrivingPath(route: BusRoute, mapInstance: any): Promise<[number, number][] | null> {
  return new Promise((resolve) => {
    const stops = route.stops || [];
    if (stops.length < 2) return resolve(null);
    const hiddenPanel = document.createElement('div');
    hiddenPanel.style.display = 'none';
    document.body.appendChild(hiddenPanel);
    try {
      const AM = (window as any).AMap;
      const driving = new AM.Driving({
        policy: AM.DrivingPolicy?.LEAST_TIME ?? 0,
        map: mapInstance, panel: hiddenPanel, autoFitView: false, showDir: false
      });
      const origin = new AM.LngLat(stops[0].lng, stops[0].lat);
      const destination = new AM.LngLat(stops[stops.length - 1].lng, stops[stops.length - 1].lat);
      const waypoints = stops.slice(1, -1).map((s: any) => new AM.LngLat(s.lng, s.lat));
      driving.search(origin, destination, { waypoints }, (_status: string, result: any) => {
        driving.clear();
        document.body.removeChild(hiddenPanel);
        if (result?.routes?.[0]?.steps) {
          const path: [number, number][] = [];
          result.routes[0].steps.forEach((step: any) => {
            step.path.forEach((p: any) => path.push([p.lng, p.lat]));
          });
          resolve(path.length > 0 ? path : null);
        } else { resolve(null); }
      });
    } catch { document.body.removeChild(hiddenPanel); resolve(null); }
  });
}

async function loadRealPaths() {
  if (!amapInstance || !(window as any).AMap?.Driving) return;
  const newPaths: Record<string, [number, number][]> = {};
  for (const route of props.routes) {
    const path = await fetchDrivingPath(route, amapInstance);
    if (path) newPaths[route.number] = path;
  }
  realPaths.value = newPaths;
  renderAmap();
}

/* ---------- rendering ---------- */
function clearAllOverlays() {
  if (!amapInstance) return;
  const all = [...polylineOverlays, ...stopMarkerOverlays, ...spotMarkerOverlays, ...busArrowMarkers.values()];
  if (all.length > 0) amapInstance.remove(all);
  polylineOverlays = [];
  stopMarkerOverlays = [];
  spotMarkerOverlays = [];
  busArrowMarkers.clear();
}

function createArrowHtml(color: string, highlighted: boolean) {
  const size = highlighted ? 32 : 24;
  const stroke = highlighted ? 3 : 2;
  return `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;transform:translate(-50%,-50%);">
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
      <polygon points="12,1 24,18 21,18 21,23 3,23 3,18 0,18" fill="${color}" stroke="#fff" stroke-width="${stroke}" stroke-linejoin="round"/>
    </svg></div>`;
}

function renderAmap() {
  const AM = (window as any).AMap;
  if (!AM || !mapEl.value || props.routes.length === 0) return;

  if (!amapInstance) {
    amapInstance = new AM.Map(mapEl.value, {
      center: [102.70, 24.98], zoom: 11, resizeEnable: true, mapStyle: 'amap://styles/normal'
    });
  }

  // Ensure map fills container after DOM settles
  setTimeout(() => {
    if (amapInstance?.resize) amapInstance.resize();
  }, 100);

  clearAllOverlays();

  props.routes.forEach((route) => {
    const path = getDisplayPath(route);
    const isHighlighted = !highlightedRouteId.value || highlightedRouteId.value === route.id;
    const polyline = new AM.Polyline({
      path, strokeColor: route.color,
      strokeWeight: isHighlighted ? 7 : 3,
      strokeOpacity: isHighlighted ? 0.92 : 0.30,
      lineJoin: 'round', showDir: isHighlighted
    });
    polylineOverlays.push(polyline);
  });

  // Stops for highlighted route
  props.routes.forEach((route) => {
    const isHighlighted = !highlightedRouteId.value || highlightedRouteId.value === route.id;
    if (!isHighlighted) return;
    route.stops.filter((s) => isValidLngLat(s.lng, s.lat)).forEach((stop) => {
      const marker = new AM.Marker({
        position: [stop.lng, stop.lat], title: stop.name,
        content: `<div style="width:22px;height:22px;border-radius:50%;background:#2d2d2d;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.2);cursor:pointer;font-family:Patrick Hand,cursive;">${stop.sequence}</div>`,
        offset: new AM.Pixel(-11, -11)
      });
      marker.on('click', () => {
        if (amapInstance) {
          amapInstance.setZoomAndCenter(16, [stop.lng, stop.lat]);
        }
        const stopInfo = new AM.InfoWindow({
          content: `<div style="padding:10px 14px;font-size:13px;line-height:1.7;font-family:Patrick Hand,cursive;">
            <strong style="font-size:15px;">${stop.name}</strong><br/>
            <span style="color:#888;">${stop.district} · 第 ${stop.sequence} 站</span><br/>
            <span style="color:#2d5da1;">${route.number} ${route.name}</span></div>`,
          offset: new AM.Pixel(0, -28)
        });
        stopInfo.open(amapInstance, [stop.lng, stop.lat]);
        setTimeout(() => stopInfo.close(), 4000);
      });
      stopMarkerOverlays.push(marker);
    });
  });

  // Spot markers
  props.spots.filter((s) => isValidLngLat(s.lng, s.lat)).forEach((spot) => {
    const marker = new AM.Marker({
      position: [spot.lng, spot.lat], title: spot.name,
      content: `<div style="width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:#ff4d4d;color:#fff;font-weight:900;border:2px solid #fff;box-shadow:0 6px 14px rgba(255,77,77,0.3);cursor:pointer;font-family:Kalam,cursive;">景</div>`,
      offset: new AM.Pixel(-14, -14)
    });
    marker.on('click', () => {
      selectedPoi.value = {
        id: `spot-${spot.id}`, name: spot.name, type: spot.category,
        address: spot.district, lng: Number(spot.lng), lat: Number(spot.lat),
        image: spotImage(spot.name), intro: spot.intro, rating: spot.rating
      };
    });
    spotMarkerOverlays.push(marker);
  });

  // Bus arrows
  props.routes.forEach((route) => {
    const points = getDisplayPath(route);
    const progress = routeProgress.value[route.id] ?? Math.random();
    const pos = interpolatePath(points, progress);
    const isHighlighted = !highlightedRouteId.value || highlightedRouteId.value === route.id;
    const marker = new AM.Marker({
      position: [pos.lng, pos.lat], title: `${route.number} ${route.name}`,
      content: createArrowHtml(route.color, isHighlighted),
      offset: new AM.Pixel(0, 0),
      zIndex: isHighlighted ? 120 : 80,
      angle: Number.isFinite(pathBearing(points, progress)) ? pathBearing(points, progress) : 0
    });
    busArrowMarkers.set(route.id, marker);
  });

  amapInstance.add([...polylineOverlays, ...stopMarkerOverlays, ...spotMarkerOverlays, ...busArrowMarkers.values()]);
  mapReady.value = true;
}

function updateAllBusArrows() {
  if (!amapInstance || busArrowMarkers.size === 0) return;
  props.routes.forEach((route) => {
    const marker = busArrowMarkers.get(route.id);
    if (!marker) return;
    const points = getDisplayPath(route);
    const progress = routeProgress.value[route.id] ?? 0;
    const pos = interpolatePath(points, progress);
    if (!isValidLngLat(pos.lng, pos.lat)) return;
    try {
      marker.setPosition([pos.lng, pos.lat]);
      const bearing = pathBearing(points, progress);
      if (marker.setAngle && Number.isFinite(bearing)) marker.setAngle(bearing);
    } catch { /* skip frame */ }
  });
}

/* ---------- animation ---------- */
function startAnimation() {
  window.clearInterval(animationTimer);
  props.routes.forEach((r) => {
    if (routeProgress.value[r.id] === undefined) routeProgress.value[r.id] = Math.random();
  });
  animationTimer = window.setInterval(() => {
    props.routes.forEach((r) => {
      routeProgress.value[r.id] = ((routeProgress.value[r.id] ?? 0) + 0.0018) % 1;
    });
    updateAllBusArrows();
  }, 140);
}

/* ---------- images ---------- */
function spotImage(name: string) {
  const m: Record<string, string> = {
    '翠湖公园':'/spot-real-images/cuihu.jpg','云南大学':'/spot-real-images/yunda.jpg',
    '南屏街':'/spot-real-images/nanping.jpg','金马碧鸡坊':'/spot-real-images/jinma.jpg',
    '大观公园':'/spot-real-images/daguan.jpg','海埂公园':'/spot-real-images/haigeng.jpg',
    '云南民族村':'/spot-real-images/minzu.jpg','滇池大坝':'/spot-real-images/dianchi.jpeg',
    '世博园':'/spot-real-images/shibo.jpg','官渡古镇':'/spot-real-images/guandu.jpg',
    '斗南花市':'/spot-real-images/dounan.png','西山风景区':'/spot-real-images/xishan.jpg'
  };
  return m[name] || '/spot-images/kunming.svg';
}

/* ---------- lifecycle ---------- */
onMounted(async () => {
  startAnimation();
  try {
    await loadAmapScript();
    // Wait for DOM to settle so map container has dimensions
    await new Promise(r => setTimeout(r, 200));
    renderAmap();
    if (amapInstance) {
      const AM = (window as any).AMap;
      const hasDriving = !!(AM && AM.Driving);
      if (hasDriving || (AM && AM.plugin)) {
        if (!hasDriving) await new Promise<void>((r) => AM.plugin('AMap.Driving', () => r()));
        if (AM.Driving) await loadRealPaths();
      }
    }
  } catch (e: any) {
    mapError.value = e?.message || '地图加载失败';
  }
});

onUnmounted(() => {
  window.clearInterval(animationTimer);
});

watch(() => props.routes, () => {
  if (amapInstance) renderAmap();
});

watch(highlightedRouteId, () => {
  renderAmap();
});

function handleRouteClick(routeId: number) {
  highlightedRouteId.value = highlightedRouteId.value === routeId ? null : routeId;
}

function handleSpotClick() {
  if (selectedPoi.value) {
    const spot = props.spots.find(s => `spot-${s.id}` === selectedPoi.value!.id);
    if (spot) emit('selectSpot', spot);
  }
}
</script>

<template>
  <div class="map-wrapper">
    <!-- Map container -->
    <div ref="mapEl" class="map-container"></div>

    <!-- Left sidebar: route list -->
    <div class="map-overlay-left">
      <button
        v-for="route in routes"
        :key="route.id"
        class="map-route-btn"
        :class="{ active: highlightedRouteId === route.id }"
        @click="handleRouteClick(route.id)"
      >
        <span class="route-color-dot" :style="{ background: route.color, display: 'inline-block', width:'10px', height:'10px', borderRadius:'50%', marginRight:'6px' }"></span>
        {{ route.number }}
      </button>
    </div>

    <!-- Spot detail card -->
    <div v-if="selectedPoi" class="map-spot-detail fade-in">
      <button class="close-btn" style="display:flex; position:absolute; top:8px; right:8px;" @click="selectedPoi = null">×</button>
      <img v-if="selectedPoi.image" :src="selectedPoi.image" :alt="selectedPoi.name"
        @error="($event.target as HTMLImageElement).style.background='#e5e0d8'" />
      <h3>{{ selectedPoi.name }}</h3>
      <div class="spot-meta" style="margin-top:4px;">
        <span class="spot-tag tag-type">{{ selectedPoi.type }}</span>
        <span class="spot-tag tag-district">{{ selectedPoi.address }}</span>
        <span v-if="selectedPoi.rating" class="spot-tag tag-rating">★ {{ selectedPoi.rating }}</span>
      </div>
      <p style="margin-top:8px;font-size:15px;">{{ selectedPoi.intro || '该点位位于昆明公交旅游线路附近。' }}</p>
      <button class="location-btn" style="margin-top:8px;" @click="handleSpotClick">查看详情与攻略</button>
    </div>

    <!-- Route detail panel (right side) -->
    <div v-if="highlightedRoute && mapReady" class="map-route-detail fade-in">
      <button class="close-btn" style="display:flex; position:absolute; top:8px; right:8px;" @click="highlightedRouteId = null">×</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span class="route-color-dot" :style="{ background: highlightedRoute.color, display:'inline-block', width:'16px', height:'16px', borderRadius:'50%' }"></span>
        <strong style="font-family:'Kalam',cursive;font-size:22px;">{{ highlightedRoute.number }} {{ highlightedRoute.name }}</strong>
      </div>
      <div style="font-size:15px;color:#555;margin-bottom:4px;">
        {{ highlightedRoute.start }} → {{ highlightedRoute.end }}
      </div>
      <div style="display:flex;gap:12px;font-size:14px;color:#666;margin-bottom:10px;">
        <span>⏰ {{ highlightedRoute.operationTime }}</span>
        <span>💴 {{ highlightedRoute.fare }}</span>
        <span>🏷 {{ highlightedRoute.type }}</span>
      </div>
      <!-- Stop list -->
      <div v-if="highlightedRoute.stops?.length" style="margin-top:8px;">
        <div style="font-family:'Kalam',cursive;font-size:16px;margin-bottom:6px;">途经 {{ highlightedRoute.stops.length }} 站</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow-y:auto;">
          <span v-for="(s, i) in highlightedRoute.stops" :key="s.id" class="route-stop-chip">
            {{ i + 1 }}. {{ s.name }}
          </span>
        </div>
      </div>
      <!-- Nearby spots -->
      <div v-if="highlightedRoute.spots?.length" style="margin-top:10px;">
        <div style="font-family:'Kalam',cursive;font-size:16px;margin-bottom:4px;">沿线景点</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <span v-for="sp in highlightedRoute.spots" :key="sp.id" class="route-spot-chip" @click.stop="selectedPoi = { id: 'spot-'+sp.id, name: sp.name, type: sp.category, address: sp.district, lng: sp.lng, lat: sp.lat, image: spotImage(sp.name), intro: sp.intro, rating: sp.rating }">
            📍 {{ sp.name }}
          </span>
        </div>
      </div>
    </div>

    <!-- Map loading / error state -->
    <div v-if="!mapReady" class="map-status-overlay">
      <template v-if="mapError">
        <span style="font-size:48px;">🗺</span>
        <strong>地图未能加载</strong>
        <span>{{ mapError }}</span>
        <span style="font-size:14px;color:#999;">请确认 <code>frontend/.env</code> 中已配置 VITE_AMAP_KEY</span>
      </template>
      <template v-else>
        <span style="font-size:48px;">⏳</span>
        <strong>地图加载中...</strong>
        <span>正在连接高德地图服务</span>
      </template>
    </div>
  </div>
</template>
