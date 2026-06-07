<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { api } from '../api';
import type { BusRoute, CollectionSample, Spot } from '../types';

const props = defineProps<{
  routes: BusRoute[];
  spots: Spot[];
  selectedRouteId: number | null;
}>();

const emit = defineEmits<{
  selectRoute: [routeId: number];
}>();

interface NearbyPoi {
  id: string; name: string; type: string; address: string;
  lng: number; lat: number; image?: string; intro?: string; rating?: number;
}

const mapEl = ref<HTMLDivElement | null>(null);
const fallback = ref(true);
const fallbackReason = ref('');
const mapMode = ref('高德 3D');
const nearbyPois = ref<NearbyPoi[]>([]);
const selectedPoi = ref<NearbyPoi | null>(null);
const pathsLoading = ref(false);
const pathsLoaded = ref(0);

// Speed control & view mode
const speedMultiplier = ref(1.0);
type ViewMode = 'free' | 'follow' | 'close';
const viewMode = ref<ViewMode>('free');

// Panel collapse state
const telemetryCollapsed = ref(false);
const poiCollapsed = ref(false);

// Current/next stop for right panel sync
const currentStopName = ref('');
const nextStopName = ref('');

// All routes visible, one highlighted
const highlightedRouteId = ref<number | null>(null);
const highlightedRoute = computed(() =>
  props.routes.find((r) => r.id === highlightedRouteId.value) || null
);
const highlightedTelemetry = computed(() =>
  highlightedRoute.value ? (routeTelemetry.value[highlightedRoute.value.id] ?? null) : null
);

// Per-route state: progress (0-1) and latest telemetry
const routeProgress = ref<Record<number, number>>({});
const routeTelemetry = ref<Record<number, CollectionSample | null>>({});

// Real road paths from Gaode Driving API
const realPaths = ref<Record<string, [number, number][]>>({});

// Fallback manual waypoints
const routePathOverrides: Record<string, [number, number][]> = {
  // 94路：海埂公园 → 高峣，沿湖滨路绕行滇池北岸（避免穿湖）
  '94路': [[102.6689,24.9654],[102.6675,24.9675],[102.6640,24.9672],[102.6605,24.9665],[102.6565,24.9660],[102.6535,24.9668],[102.6490,24.9685],[102.6445,24.9700],[102.6410,24.9708],[102.6380,24.9710]],
  '44路': [[102.7229,25.0156],[102.716,25.0085],[102.707,24.998],[102.701,25.004],[102.691,25.013],[102.681,24.985],[102.6705,24.9705],[102.6689,24.9654],[102.6565,24.966]],
  '24路': [[102.7229,25.0156],[102.71,25.007],[102.701,25.004],[102.686,25.019],[102.6718,25.0338],[102.691,25.013],[102.675,24.985],[102.6705,24.9705],[102.6689,24.9654]]
};

const bounds = { minLng: 102.61, maxLng: 102.88, minLat: 24.86, maxLat: 25.08 };

let amapInstance: any = null;
let polylineOverlays: any[] = [];
let stopMarkerOverlays: any[] = [];
let spotMarkerOverlays: any[] = [];
let busArrowMarkers: Map<number, any> = new Map();
let followInfoWindow: any = null;
let animationTimer = 0;
let telemetryTimer = 0;
let poiTimer = 0;

/* ---------- path helpers ---------- */
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
  return cleanPath(realPaths.value[route.number] || routePathOverrides[route.number] || route.polyline);
}

function getPathForRoute(route: BusRoute): [number, number][] {
  return getDisplayPath(route);
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

/* ---------- fallback SVG helpers ---------- */
function project(lng: number, lat: number) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
  return { left: `${x}%`, top: `${y}%` };
}

function svgPoints(route: BusRoute) {
  return getDisplayPath(route).map(([lng, lat]) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 1000;
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 620;
    return `${x},${y}`;
  }).join(' ');
}

function svgArrowTransform(route: BusRoute) {
  const points = getPathForRoute(route);
  const pos = interpolatePath(points, routeProgress.value[route.id] ?? 0);
  const bearing = pathBearing(points, routeProgress.value[route.id] ?? 0);
  const p = project(pos.lng, pos.lat);
  return { ...p, transform: `translate(-50%, -50%) rotate(${bearing}deg)` };
}

/* ---------- AMap arrow marker (simple chevron, points up → rotated by setAngle) ---------- */
function createArrowHtml(color: string, highlighted: boolean) {
  const size = highlighted ? 32 : 22;
  const stroke = highlighted ? 3 : 2;
  return `
    <div style="width:${size}px;height:${size}px;display:grid;place-items:center;transform:translate(-50%,-50%);">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
        <polygon points="12,1 24,18 21,18 21,23 3,23 3,18 0,18"
          fill="${color}" stroke="#fff" stroke-width="${stroke}" stroke-linejoin="round"/>
      </svg>
    </div>`;
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

async function loadRealPathsForAllRoutes() {
  if (!amapInstance) return;
  pathsLoading.value = true;
  pathsLoaded.value = 0;
  const newPaths: Record<string, [number, number][]> = {};
  for (const route of props.routes) {
    const path = await fetchDrivingPath(route, amapInstance);
    if (path) newPaths[route.number] = path;
    pathsLoaded.value += 1;
  }
  realPaths.value = newPaths;
  pathsLoading.value = false;
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

function renderAmap() {
  const AM = (window as any).AMap;
  if (!AM || !mapEl.value || props.routes.length === 0) return;

  if (!amapInstance) {
    amapInstance = new AM.Map(mapEl.value, {
      center: [102.70, 24.98], zoom: 11, resizeEnable: true, mapStyle: 'amap://styles/normal'
    });
  }

  clearAllOverlays();

  // Draw all route polylines (highlighted = full opacity, others = faded)
  props.routes.forEach((route) => {
    const path = getPathForRoute(route);
    const isHighlighted = !highlightedRouteId.value || highlightedRouteId.value === route.id;
    const polyline = new AM.Polyline({
      path,
      strokeColor: route.color,
      strokeWeight: isHighlighted ? 8 : 4,
      strokeOpacity: isHighlighted ? 0.92 : 0.35,
      lineJoin: 'round',
      showDir: isHighlighted
    });
    polylineOverlays.push(polyline);
  });

  // Stops — only show for highlighted route
  props.routes.forEach((route) => {
    const isHighlighted = !highlightedRouteId.value || highlightedRouteId.value === route.id;
    if (!isHighlighted) return;
    route.stops.filter((s) => isValidLngLat(s.lng, s.lat)).forEach((stop) => {
      const marker = new AM.Marker({
        position: [stop.lng, stop.lat],
        title: stop.name,
        content: `<div style="width:24px;height:24px;border-radius:50%;background:#122033;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.2);cursor:pointer;">${stop.sequence}</div>`,
        offset: new AM.Pixel(-12, -12)
      });
      // Click stop → jump view + info popup
      marker.on('click', () => {
        if (amapInstance) {
          amapInstance.setZoomAndCenter(16, [stop.lng, stop.lat]);
          if (amapInstance.setPitch) amapInstance.setPitch(55);
        }
        // Show stop info popup
        const AM = (window as any).AMap;
        const stopInfo = new AM.InfoWindow({
          content: `<div style="padding:10px 14px;font-size:13px;line-height:1.7;">
            <strong style="font-size:15px;">${stop.name}</strong><br/>
            <span style="color:#64748b;">${stop.district} · 第 ${stop.sequence} 站</span><br/>
            <span style="color:#5E6AD2;">${route.number} ${route.name}</span>
          </div>`,
          offset: new AM.Pixel(0, -30)
        });
        stopInfo.open(amapInstance, [stop.lng, stop.lat]);
        setTimeout(() => stopInfo.close(), 3000);
      });
      stopMarkerOverlays.push(marker);
    });
  });

  // Spot markers (always show)
  props.spots.filter((s) => isValidLngLat(s.lng, s.lat)).forEach((spot) => {
    const marker = new AM.Marker({
      position: [spot.lng, spot.lat],
      title: spot.name,
      content: `<div class="amap-spot-marker" style="width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:#f97316;color:#fff;font-weight:900;border:2px solid #fff;box-shadow:0 8px 16px rgba(249,115,22,0.3);cursor:pointer;">景</div>`,
      offset: new AM.Pixel(-13, -13)
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

  // Bus arrows for ALL routes
  props.routes.forEach((route) => {
    const points = getPathForRoute(route);
    const progress = routeProgress.value[route.id] ?? Math.random();
    const pos = interpolatePath(points, progress);
    const isHighlighted = !highlightedRouteId.value || highlightedRouteId.value === route.id;
    const marker = new AM.Marker({
      position: [pos.lng, pos.lat],
      title: `${route.number} ${route.name}`,
      content: createArrowHtml(route.color, isHighlighted),
      offset: new AM.Pixel(0, 0),
      zIndex: isHighlighted ? 120 : 80,
      angle: Number.isFinite(pathBearing(points, progress)) ? pathBearing(points, progress) : 0
    });
    busArrowMarkers.set(route.id, marker);
  });

  amapInstance.add([...polylineOverlays, ...stopMarkerOverlays, ...spotMarkerOverlays, ...busArrowMarkers.values()]);
}

function updateAllBusArrows() {
  if (!amapInstance || busArrowMarkers.size === 0) return;
  props.routes.forEach((route) => {
    const marker = busArrowMarkers.get(route.id);
    if (!marker) return;
    const points = getPathForRoute(route);
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

/* ---------- telemetry ---------- */
async function loadTelemetry() {
  try {
    const samples = await api.collectionSamples('?limit=50');
    // Group latest sample per route
    const latest: Record<number, CollectionSample> = {};
    samples.forEach((s: CollectionSample) => {
      if (!latest[s.routeId] || new Date(s.collectedAt) > new Date(latest[s.routeId].collectedAt)) {
        latest[s.routeId] = s;
      }
    });
    routeTelemetry.value = latest;
  } catch { /* keep last values */ }
}

function distanceMeters(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  return Math.sqrt(((a.lng - b.lng) * 102000) ** 2 + ((a.lat - b.lat) * 111000) ** 2);
}

function updateNearbyPois() {
  const route = highlightedRoute.value;
  if (!route) { nearbyPois.value = []; return; }
  const points = getPathForRoute(route);
  const center = interpolatePath(points, routeProgress.value[route.id] ?? 0);
  const spotPois = props.spots.filter((s) => isValidLngLat(s.lng, s.lat)).map((s) => ({
    id: `spot-${s.id}`, name: s.name, type: s.category, address: s.district,
    lng: Number(s.lng), lat: Number(s.lat), image: spotImage(s.name),
    intro: s.intro, rating: s.rating, distance: distanceMeters(center, s)
  }));
  const stopPois = route.stops.filter((s) => isValidLngLat(s.lng, s.lat)).map((s) => ({
    id: `stop-${s.id}`, name: s.name, type: '公交站', address: s.district,
    lng: Number(s.lng), lat: Number(s.lat), distance: distanceMeters(center, s)
  }));
  nearbyPois.value = [...spotPois, ...stopPois].sort((a, b) => a.distance - b.distance).slice(0, 10)
    .map(({ distance, ...poi }) => poi);
}

/* ---------- animation loop ---------- */
function updateFollowView() {
  if (!amapInstance || viewMode.value === 'free') return;
  const route = highlightedRoute.value;
  if (!route) return;
  const points = getPathForRoute(route);
  const pos = interpolatePath(points, routeProgress.value[route.id] ?? 0);
  if (!isValidLngLat(pos.lng, pos.lat)) return;
  const bearing = pathBearing(points, routeProgress.value[route.id] ?? 0);

  if (viewMode.value === 'close') {
    // Tight follow: close zoom, high pitch, match bearing
    amapInstance.setZoom(17);
    amapInstance.setCenter([pos.lng, pos.lat]);
    if (amapInstance.setPitch) amapInstance.setPitch(65);
    if (amapInstance.setRotation) amapInstance.setRotation(bearing);
  } else if (viewMode.value === 'follow') {
    // Bird's eye follow: moderate zoom, keep vehicle centered
    amapInstance.setZoom(14);
    amapInstance.setCenter([pos.lng, pos.lat]);
    if (amapInstance.setPitch) amapInstance.setPitch(45);
    if (amapInstance.setRotation) amapInstance.setRotation(bearing);
  }
}

function findNextStop(route: BusRoute, progress: number) {
  const stops = route.stops || [];
  if (stops.length < 2) return stops[0] || null;
  // Approximate each stop's progress position along the route
  const totalStops = stops.length;
  const currentStopIndex = Math.floor(progress * (totalStops - 1));
  const nextIndex = Math.min(currentStopIndex + 1, totalStops - 1);
  // If we just passed the last stop, wrap to first
  if (progress >= 0.99) return stops[0];
  return stops[nextIndex] || null;
}

// Track last displayed values for smooth transitions
let lastDisplaySpeed: Record<number, number> = {};
let lastDisplayPassengers: Record<number, number> = {};
let lastDisplayLoadRate: Record<number, number> = {};

function smoothValue(routeId: number, key: Record<number, number>, target: number, alpha: number) {
  if (!(routeId in key)) key[routeId] = target;
  const next = key[routeId] * (1 - alpha) + target * alpha;
  key[routeId] = Math.round(next);
  return key[routeId];
}

function updateFollowBubble() {
  const route = highlightedRoute.value;
  if (!route || !amapInstance) {
    if (followInfoWindow) { followInfoWindow.close(); followInfoWindow = null; }
    return;
  }
  const points = getPathForRoute(route);
  const progress = routeProgress.value[route.id] ?? 0;
  const pos = interpolatePath(points, progress);
  if (!isValidLngLat(pos.lng, pos.lat)) return;

  const tm = routeTelemetry.value[route.id];
  const targetPassengers = tm?.passengerCount ?? 42;
  const targetLoadRate = tm?.loadRate ?? 68;
  const targetSpeed = tm?.speed ?? 27;

  // Speed: fast alpha (0.35) + per-frame jitter → feels like a live speedometer
  if (!(route.id in lastDisplaySpeed)) lastDisplaySpeed[route.id] = targetSpeed;
  lastDisplaySpeed[route.id] = lastDisplaySpeed[route.id] * 0.65 + (targetSpeed + (Math.random() - 0.5) * 5) * 0.35;
  const displaySpeed = lastDisplaySpeed[route.id].toFixed(1);

  // Passenger & load rate: slow alpha → stable, updates only when telemetry changes
  const displayPassengers = smoothValue(route.id, lastDisplayPassengers, targetPassengers, 0.04);
  const displayLoadRate = smoothValue(route.id, lastDisplayLoadRate, targetLoadRate, 0.04);

  const nextStop = findNextStop(route, progress);
  const stopsList = route.stops || [];
  const currentStopIdx = Math.floor(progress * (stopsList.length - 1));
  const currentStop = stopsList[currentStopIdx] || stopsList[0];
  const prevStopName = currentStop?.name || '起点';
  const nextStopNameStr = nextStop?.name || '终点';

  // Sync right panel
  currentStopName.value = prevStopName;
  nextStopName.value = nextStopNameStr;

  const content = `
    <div style="padding:10px 14px;min-width:200px;font-size:12px;line-height:1.7;">
      <strong style="font-size:14px;color:${route.color};">${route.number} ${route.name}</strong><br/>
      <span style="color:#64748b;">${prevStopName}</span>
      <span style="color:#5E6AD2;font-weight:700;"> → ${nextStopNameStr}</span><br/>
      <div style="margin-top:6px;display:flex;gap:12px;align-items:center;">
        <span>速度 <b style="color:#ef4444;">${displaySpeed}</b> km/h</span>
        <span>人数 <b style="color:#5E6AD2;">${displayPassengers}</b></span>
        <span>满载率 <b style="color:#14b8a6;">${displayLoadRate}%</b></span>
      </div>
    </div>`;

  if (!followInfoWindow) {
    const AM = (window as any).AMap;
    followInfoWindow = new AM.InfoWindow({
      content,
      offset: new AM.Pixel(0, -40),
      closeWhenClickMap: false
    });
    followInfoWindow.open(amapInstance, [pos.lng, pos.lat]);
  } else {
    followInfoWindow.setContent(content);
    followInfoWindow.setPosition([pos.lng, pos.lat]);
  }
}

function startAnimation() {
  window.clearInterval(animationTimer);
  props.routes.forEach((r) => {
    if (routeProgress.value[r.id] === undefined) routeProgress.value[r.id] = Math.random();
  });
  animationTimer = window.setInterval(() => {
    props.routes.forEach((r) => {
      const speed = routeTelemetry.value[r.id]?.speed ?? 27;
      const factor = Math.max(0.3, Math.min(2.5, speed / 27));
      routeProgress.value[r.id] = ((routeProgress.value[r.id] ?? 0) + 0.0018 * factor * speedMultiplier.value) % 1;
    });
    updateAllBusArrows();
    updateFollowView();
    updateFollowBubble();
    updateNearbyPois();
  }, 140);
}

function startPolling() {
  window.clearInterval(telemetryTimer);
  window.clearInterval(poiTimer);
  loadTelemetry();
  telemetryTimer = window.setInterval(loadTelemetry, 2500);
  updateNearbyPois();
  poiTimer = window.setInterval(updateNearbyPois, 8000);
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
function fallbackSpotImage(name: string) {
  const m: Record<string, string> = {
    '翠湖公园':'/spot-images/cuihu.svg','云南大学':'/spot-images/yunda.svg',
    '南屏街':'/spot-images/nanping.svg','金马碧鸡坊':'/spot-images/jinma.svg',
    '大观公园':'/spot-images/daguan.svg','海埂公园':'/spot-images/haigeng.svg',
    '云南民族村':'/spot-images/minzu.svg','滇池大坝':'/spot-images/dianchi.svg',
    '世博园':'/spot-images/shibo.svg','官渡古镇':'/spot-images/guandu.svg',
    '斗南花市':'/spot-images/dounan.svg','西山风景区':'/spot-images/xishan.svg'
  };
  return m[name] || '/spot-images/kunming.svg';
}

/* ---------- lifecycle ---------- */
onMounted(async () => {
  startAnimation();
  startPolling();
  try {
    await loadAmapScript();
    fallback.value = false;
    mapMode.value = '高德 3D 真实地图（加载真实路线中...）';
    renderAmap();
    const AM = (window as any).AMap;
    const hasDriving = !!(AM && AM.Driving);
    if (hasDriving || (AM && AM.plugin)) {
      if (!hasDriving) await new Promise<void>((r) => AM.plugin('AMap.Driving', () => r()));
      if (AM.Driving) {
        await loadRealPathsForAllRoutes();
        mapMode.value = '高德 3D 地图 · 全部线路实时运行';
      } else {
        mapMode.value = '高德 3D 地图（备用路线）';
      }
    } else {
      mapMode.value = '高德 3D 地图（备用路线）';
    }
  } catch (error) {
    fallback.value = true;
    fallbackReason.value = error instanceof Error ? error.message : '高德地图加载失败';
    mapMode.value = '内置演示地图';
  }
});

onUnmounted(() => {
  window.clearInterval(animationTimer);
  window.clearInterval(telemetryTimer);
  window.clearInterval(poiTimer);
  if (followInfoWindow) { followInfoWindow.close(); followInfoWindow = null; }
});

watch(() => props.selectedRouteId, (id) => {
  if (id) highlightedRouteId.value = id;
});

watch(highlightedRouteId, () => {
  if (followInfoWindow) { followInfoWindow.close(); followInfoWindow = null; }
  renderAmap();
  updateNearbyPois();
});
</script>

<template>
  <section class="map-layout">
    <aside class="panel map-list">
      <div class="section-title">
        <div>
          <p class="eyebrow">全部线路实时运行</p>
          <h2>{{ routes.length }} 条线路同时监控</h2>
        </div>
      </div>
      <div v-if="!fallback && pathsLoading" class="path-loading-bar">
        <span></span>
        <small>加载高德真实路线 ({{ pathsLoaded }}/{{ routes.length }})...</small>
      </div>
      <button
        v-for="route in routes"
        :key="route.id"
        class="map-route-row"
        :class="{ active: highlightedRouteId === route.id }"
        @click="highlightedRouteId = highlightedRouteId === route.id ? null : route.id"
      >
        <span :style="{ background: route.color }"></span>
        <strong>{{ route.number }}</strong>
        <small>{{ route.start }} → {{ route.end }}</small>
      </button>
      <div class="source-note map-tip">
        <strong>{{ fallback ? '内置演示地图' : '高德地图 + 全线路实时运行' }}</strong>
        <span>{{ fallback ? '需配置 VITE_AMAP_KEY' : '所有线路箭头沿真实道路同步移动，点击线路可高亮查看详情' }}</span>
      </div>
    </aside>

    <article class="panel map-panel">
      <!-- Fallback SVG map -->
      <div v-if="fallback" class="fallback-map">
        <svg viewBox="0 0 1000 620" preserveAspectRatio="none">
          <polyline v-for="route in routes" :key="route.id"
            :points="svgPoints(route)"
            :stroke="route.color"
            :stroke-width="highlightedRouteId && highlightedRouteId !== route.id ? 6 : 10"
            :stroke-opacity="highlightedRouteId && highlightedRouteId !== route.id ? 0.3 : 0.9"
            stroke-linecap="round" stroke-linejoin="round" fill="none"
          />
        </svg>
        <template v-for="route in routes" :key="'stops-'+route.id">
          <button v-for="stop in route.stops" :key="stop.id"
            v-show="!highlightedRouteId || highlightedRouteId === route.id"
            class="map-dot stop-dot"
            :style="project(stop.lng, stop.lat)"
            :title="stop.name"
          >{{ stop.sequence }}</button>
        </template>
        <button v-for="spot in spots" :key="spot.id"
          class="map-dot spot-dot"
          :style="project(spot.lng, spot.lat)"
          :title="spot.name"
        >景</button>
        <!-- Fallback arrows -->
        <div v-for="route in routes" :key="'arrow-'+route.id"
          class="map-dot map-arrow-fb"
          :class="{ 'arrow-dim': highlightedRouteId && highlightedRouteId !== route.id }"
          :style="svgArrowTransform(route)"
        >
          <svg width="20" height="24" viewBox="0 0 20 24"><polygon points="10,0 20,19 17,19 17,24 3,24 3,19 0,19" :fill="route.color" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>
        </div>
        <div class="map-config-card">
          <strong>当前不是高德真实地图</strong>
          <span>{{ fallbackReason || '未检测到高德 Key' }}</span>
          <small>配置 frontend/.env 后可显示真实道路、建筑、商铺和公交路线。</small>
        </div>
      </div>

      <!-- AMap container -->
      <div v-show="!fallback" ref="mapEl" class="amap-host"></div>
    </article>

    <aside class="map-right-sidebar">
      <div class="map-sidebar-card" :class="{ 'map-panel-collapsed': telemetryCollapsed }">
        <div class="map-sidebar-card-header" @click="telemetryCollapsed = !telemetryCollapsed">
          <p class="eyebrow">{{ mapMode }}</p>
          <button class="map-panel-toggle" :title="telemetryCollapsed ? '展开面板' : '收起面板'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline v-if="telemetryCollapsed" points="6 9 12 15 18 9"/><polyline v-else points="18 15 12 9 6 15"/></svg>
          </button>
        </div>
        <div class="map-panel-body">
        <h3 v-if="highlightedRoute">{{ highlightedRoute.number }} {{ highlightedRoute.name }}</h3>
        <h3 v-else>全部线路总览 · {{ routes.length }} 条线路同步运行</h3>
        <div v-if="highlightedRoute && highlightedTelemetry" class="telemetry-grid">
          <span>速度 <strong>{{ highlightedTelemetry.speed }} km/h</strong></span>
          <span>车内人数 <strong>{{ highlightedTelemetry.passengerCount }}</strong></span>
          <span>满载率 <strong>{{ highlightedTelemetry.loadRate }}%</strong></span>
        </div>
        <div v-else-if="highlightedRoute" class="telemetry-grid">
          <span>线路 <strong>{{ highlightedRoute.number }}</strong></span>
          <span>站点 <strong>{{ highlightedRoute.stops.length }} 站</strong></span>
          <span>类型 <strong>{{ highlightedRoute.type }}</strong></span>
        </div>
        <div v-else class="telemetry-grid">
          <span>线路 <strong>{{ routes.length }}</strong></span>
          <span>站点 <strong>{{ routes.reduce((s,r) => s + r.stops.length, 0) }}</strong></span>
          <span>景点 <strong>{{ spots.length }}</strong></span>
        </div>
        <!-- Next stop sync from bubble -->
        <div v-if="highlightedRoute && currentStopName" class="next-stop-row">
          <span class="next-stop-cur">{{ currentStopName }}</span>
          <span class="next-stop-arrow">→</span>
          <span class="next-stop-next">{{ nextStopName }}</span>
        </div>

        <!-- Speed slider -->
        <div class="speed-control">
          <span>动画速率</span>
          <input type="range" min="0.25" max="3" step="0.25" v-model.number="speedMultiplier" />
          <strong>{{ speedMultiplier.toFixed(2) }}x</strong>
        </div>

        <!-- View mode buttons -->
        <div class="view-mode-row">
          <button :class="{ active: viewMode === 'free' }" @click="viewMode = 'free'; if (amapInstance) { amapInstance.setPitch(0); amapInstance.setRotation(0); amapInstance.setZoomAndCenter(11, [102.70, 24.98]); }">自由视角</button>
          <button :class="{ active: viewMode === 'follow' }" @click="viewMode = 'follow'">跟随车辆</button>
          <button :class="{ active: viewMode === 'close' }" @click="viewMode = 'close'">车内视角</button>
        </div>

        <small v-if="highlightedRoute">采集数据实时驱动箭头速度，点击站点可跳转视角。</small>
        <small v-else>点击左侧线路可高亮，查看实时遥测与周边 POI。</small>
        </div>
      </div>

      <!-- POI panel -->
      <div v-if="!fallback && highlightedRoute" class="map-sidebar-card" :class="{ 'map-panel-collapsed': poiCollapsed }">
        <div class="map-sidebar-card-header" @click="poiCollapsed = !poiCollapsed">
          <p class="eyebrow">{{ highlightedRoute.number }} 周边</p>
          <button class="map-panel-toggle" :title="poiCollapsed ? '展开面板' : '收起面板'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline v-if="poiCollapsed" points="6 9 12 15 18 9"/><polyline v-else points="18 15 12 9 6 15"/></svg>
          </button>
        </div>
        <div class="map-panel-body">
        <h3>附近站点与景点</h3>
        <div class="poi-list">
          <article v-for="poi in nearbyPois" :key="poi.id" @click="selectedPoi = poi">
            <strong>{{ poi.name }}</strong>
            <span>{{ poi.type.split(';')[0] }}</span>
            <small>{{ poi.address }}</small>
          </article>
          <p v-if="nearbyPois.length === 0">点击线路箭头查看周边信息...</p>
        </div>
        </div>
      </div>

      <!-- Spot detail -->
      <div v-if="selectedPoi" class="spot-detail-panel">
        <button class="spot-close" @click="selectedPoi = null">&times;</button>
        <img v-if="selectedPoi.image" :src="selectedPoi.image" :alt="selectedPoi.name"
          @error="selectedPoi.image = fallbackSpotImage(selectedPoi.name)" />
        <div class="spot-detail-body">
          <p class="eyebrow">{{ selectedPoi.type }}</p>
          <h3>{{ selectedPoi.name }}</h3>
          <span>{{ selectedPoi.address }}<template v-if="selectedPoi.rating"> · 推荐 {{ selectedPoi.rating }}</template></span>
          <p>{{ selectedPoi.intro || '该点位位于当前公交旅游线路附近。' }}</p>
        </div>
      </div>
    </aside>
  </section>
</template>
