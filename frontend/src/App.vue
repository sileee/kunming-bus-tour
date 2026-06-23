<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import DashboardView from './components/DashboardView.vue';
import MapView from './components/MapView.vue';
import RouteDetailView from './components/RouteDetailView.vue';
import AnalyticsView from './components/AnalyticsView.vue';
import AdminView from './components/AdminView.vue';
import CollectionView from './components/CollectionView.vue';
import ChartPanel from './components/ChartPanel.vue';
import BigScreenView from './components/BigScreenView.vue';
import ToastStack from './components/ToastStack.vue';
import LoginView from './components/LoginView.vue';
import { api, setAuthToken, clearAuthToken } from './api';
import type { BusRoute, Overview, RouteStatistic, Spot } from './types';

type Tab = 'dashboard' | 'bigscreen' | 'map' | 'collection' | 'detail' | 'analytics' | 'admin' | 'charts';

const activeTab = ref<Tab>('dashboard');
const sidebarCollapsed = ref(false);
const landingSpot = ref('');
const loading = ref(true);
const error = ref('');
const authenticated = ref(false);
const authChecking = ref(true);
const adminUsername = ref('');
const routes = ref<BusRoute[]>([]);
const spots = ref<Spot[]>([]);
const overview = ref<Overview | null>(null);
const routeStatistics = ref<RouteStatistic[]>([]);
const selectedRouteId = ref<number | null>(null);
const collectorRunning = ref(false);
const collectorMessage = ref('');
const lastUpdate = ref<Date | null>(null);
const totalSamples = ref(0);
const currentTime = ref('');
const dataMode = ref('...');
let refreshTimer = 0;
let collectorTimer = 0;
let clockTimer = 0;
let subtitleTimer = 0;

/* ── Streaming topbar subtitle typewriter ── */
const topbarSubtitle = ref('');
const subtitleFull = '智慧城市 · 公共交通数据可视化场景';
const subtitleIndex = ref(0);

function typeSubtitle() {
  if (subtitleIndex.value < subtitleFull.length) {
    subtitleIndex.value += 1;
    topbarSubtitle.value = subtitleFull.slice(0, subtitleIndex.value);
  } else {
    window.clearInterval(subtitleTimer);
  }
}

function updateClock() {
  currentTime.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const selectedRoute = computed(() => routes.value.find((route) => route.id === selectedRouteId.value) || routes.value[0]);

const toast = computed(() => (window as any).__toast);

function showToast(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  if (toast.value) toast.value.add(msg, type);
}

async function loadAll() {
  loading.value = true;
  error.value = '';
  try {
    const [health, routeData, spotData, overviewData, statisticsData] = await Promise.all([
      api.health(),
      api.routes(),
      api.spots(),
      api.overview(),
      api.routeStatistics()
    ]);
    dataMode.value = health.dataMode || 'file';
    routes.value = routeData;
    spots.value = spotData;
    overview.value = overviewData;
    routeStatistics.value = statisticsData;
    selectedRouteId.value = routeData[0]?.id || null;
    lastUpdate.value = new Date();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '数据加载失败，请确认后端服务已启动。';
  } finally {
    loading.value = false;
  }
}

async function refreshDynamicData() {
  try {
    const [health, routeData, overviewData, statisticsData, spotData] = await Promise.all([
      api.health(),
      api.routes(),
      api.overview(),
      api.routeStatistics(),
      api.spots()
    ]);
    dataMode.value = health.dataMode || 'file';
    routes.value = routeData;
    overview.value = overviewData;
    routeStatistics.value = statisticsData;
    spots.value = spotData;
    lastUpdate.value = new Date();
    // Refresh sample count for status bar
    api.collectionSummary().then((s) => { totalSamples.value = s?.sampleCount || 0; }).catch(() => {});
  } catch {
    // Keep the last good visual state during transient refresh failures.
  }
}

function selectRoute(routeId: number) {
  selectedRouteId.value = routeId;
  activeTab.value = 'detail';
}

function randomAround(base: number, range: number) {
  return Math.max(0, Math.round(base + (Math.random() - 0.5) * range));
}

async function runCollectorBatch() {
  if (!collectorRunning.value || routes.value.length === 0) return;

  const selectedRoutes = routes.value
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(3, routes.value.length));

  try {
    await Promise.all(selectedRoutes.map((route) => {
      const passengerCount = randomAround(46, 42);
      const speed = randomAround(27, 16);
      const loadRate = Math.min(100, Math.max(8, Math.round(passengerCount * 1.48 + Math.random() * 10)));
      return api.createCollectionSample({
        routeId: route.id,
        speed,
        passengerCount,
        loadRate,
        source: '自动采集仿真器'
      });
    }));
    collectorMessage.value = `自动采集中：本轮新增 ${selectedRoutes.length} 条车辆运行样本`;
    await refreshDynamicData();
  } catch (err) {
    collectorRunning.value = false;
    window.clearInterval(collectorTimer);
    collectorMessage.value = err instanceof Error ? err.message : '自动采集失败，请检查后端服务';
    showToast('自动采集失败，请检查后端服务', 'error');
  }
}

function handleLogin(token: string, username: string) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_username', username);
  setAuthToken(token);
  authenticated.value = true;
  adminUsername.value = username;
  loadAll();
}

function handleLogout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
  clearAuthToken();
  authenticated.value = false;
  adminUsername.value = '';
  window.clearInterval(refreshTimer);
  window.clearInterval(collectorTimer);
  collectorRunning.value = false;
}

function toggleCollector() {
  if (collectorRunning.value) {
    collectorRunning.value = false;
    window.clearInterval(collectorTimer);
    collectorMessage.value = '自动采集已暂停';
    showToast('数据采集已停止', 'warning');
    return;
  }

  collectorRunning.value = true;
  collectorMessage.value = '自动采集中：每 1.5 秒批量生成多线路运行样本';
  showToast('数据采集引擎已启动，全站可视化实时联动中', 'info');
  runCollectorBatch();
  window.clearInterval(collectorTimer);
  collectorTimer = window.setInterval(runCollectorBatch, 1500);
}

const isDark = ref(localStorage.getItem('theme') === 'dark');

function toggleTheme() {
  isDark.value = !isDark.value;
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
}

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
  // Check stored auth token
  const storedToken = localStorage.getItem('admin_token');
  const storedUser = localStorage.getItem('admin_username');
  if (storedToken) {
    setAuthToken(storedToken);
    try {
      await api.verifyAuth();
      authenticated.value = true;
      adminUsername.value = storedUser || '';
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
      clearAuthToken();
    }
  }
  authChecking.value = false;
  if (authenticated.value) {
    const spotParam = new URLSearchParams(window.location.search).get('spot');
    if (spotParam) {
      landingSpot.value = spotParam;
      activeTab.value = 'map';
    }
    loadAll();
    refreshTimer = window.setInterval(refreshDynamicData, 5000);
    api.collectionSummary().then((s) => { totalSamples.value = s?.sampleCount || 0; }).catch(() => {});
  }
  updateClock();
  clockTimer = window.setInterval(updateClock, 1000);
  subtitleTimer = window.setInterval(typeSubtitle, 60);
});

onUnmounted(() => {
  window.clearInterval(refreshTimer);
  window.clearInterval(collectorTimer);
  window.clearInterval(clockTimer);
  window.clearInterval(subtitleTimer);
});
</script>

<template>
  <!-- Auth checking state -->
  <div v-if="authChecking" class="login-overlay" style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
    <div style="text-align:center;color:var(--foreground-muted);">
      <span style="font-size:32px;display:block;margin-bottom:8px;">⏳</span>
      <span>验证登录状态...</span>
    </div>
  </div>

  <!-- Login view -->
  <LoginView v-else-if="!authenticated" @login-success="handleLogin" />

  <!-- Admin shell (authenticated) -->
  <div v-else class="app-shell">
    <!-- Ambient background blobs -->
    <div class="ambient-blobs">
      <div class="ambient-blob ambient-blob--primary"></div>
      <div class="ambient-blob ambient-blob--secondary"></div>
      <div class="ambient-blob ambient-blob--tertiary"></div>
      <div class="ambient-blob ambient-blob--bottom"></div>
    </div>

    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="brand">
        <span class="brand-mark" :class="{ 'brand-active': collectorRunning }">KM</span>
        <div class="brand-text">
          <strong>昆明公交旅游</strong>
          <small>Smart Transit Visualization</small>
        </div>
      </div>
      <button class="sidebar-collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline v-if="sidebarCollapsed" points="9 18 15 12 9 6"/>
          <polyline v-else points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <nav class="nav">
        <button :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'" title="运营总览">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </span>
          <span class="nav-label">运营总览</span>
        </button>
        <button :class="{ active: activeTab === 'bigscreen' }" @click="activeTab = 'bigscreen'" title="可视化大屏">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/><path d="M7 11l3-3 3 3 4-5"/></svg>
          </span>
          <span class="nav-label">可视化大屏</span>
        </button>
        <button :class="{ active: activeTab === 'map' }" @click="activeTab = 'map'" title="动态地图">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </span>
          <span class="nav-label">动态地图</span>
        </button>
        <button :class="{ active: activeTab === 'collection' }" @click="activeTab = 'collection'" title="数据采集">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          </span>
          <span class="nav-label">数据采集</span>
        </button>
        <button :class="{ active: activeTab === 'detail' }" @click="activeTab = 'detail'" title="线路详情">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          </span>
          <span class="nav-label">线路详情</span>
        </button>
        <button :class="{ active: activeTab === 'analytics' }" @click="activeTab = 'analytics'" title="数据分析">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </span>
          <span class="nav-label">数据分析</span>
        </button>
        <button :class="{ active: activeTab === 'charts' }" @click="activeTab = 'charts'" title="数据图表">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          </span>
          <span class="nav-label">数据图表</span>
        </button>
        <button :class="{ active: activeTab === 'admin' }" @click="activeTab = 'admin'" title="后台管理">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </span>
          <span class="nav-label">后台管理</span>
        </button>
      </nav>
      <div class="sidebar-bottom">
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换白天模式' : '切换夜间模式'">
          <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span class="nav-label">{{ isDark ? '白天模式' : '夜间模式' }}</span>
        </button>
        <a href="/tourist.html" class="landing-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span class="nav-label">游客导览页</span>
        </a>
        <button class="theme-toggle" style="margin-top:8px;color:#ef4444;" @click="handleLogout" title="退出登录">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span class="nav-label">退出登录</span>
        </button>
      </div>
      <div class="source-note">
        <strong>管理员 {{ adminUsername }}</strong>
        <span>高德 Driving 真实道路路径 + 全线路箭头同步运行 + 秒级动态客流仿真 + 数据采集驱动全站可视化联动。</span>
      </div>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <p><span class="streaming-text">{{ topbarSubtitle }}</span></p>
          <h1>昆明公交旅游路线数据管理平台</h1>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <span class="topbar-clock">{{ currentTime }}</span>
          <button class="ghost-btn" @click="loadAll">刷新数据</button>
        </div>
      </header>

      <!-- Global status bar -->
      <div class="status-bar">
        <span class="status-dot" :class="{ active: collectorRunning, error: !!error }"></span>
        <span class="status-item"><span class="label">采集引擎</span><span class="value">{{ collectorRunning ? '运行中' : error ? '异常' : '已暂停' }}</span></span>
        <span class="status-sep"></span>
        <span class="status-item"><span class="label">采集样本</span><span class="value">{{ totalSamples }}</span></span>
        <span class="status-sep"></span>
        <span class="status-item"><span class="label">在线线路</span><span class="value">{{ routes.length }}</span></span>
        <span class="status-sep"></span>
        <span class="status-item"><span class="label">数据模式</span><span class="value">{{ dataMode }}</span></span>
        <span class="spacer"></span>
        <span class="status-item" v-if="lastUpdate">
          <span class="label">最近刷新</span>
          <span class="value">{{ lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</span>
        </span>
      </div>

      <!-- Loading skeleton -->
      <template v-if="loading">
        <section class="dashboard-grid">
          <article class="metric-panel skeleton skeleton-card" v-for="i in 4" :key="'sk-m-'+i"></article>
        </section>
        <section class="content-grid two-columns">
          <article class="panel"><div class="skeleton skeleton-chart"></div></article>
          <article class="panel"><div class="skeleton skeleton-row skeleton-text-lg"></div><div class="skeleton skeleton-row skeleton-text-md"></div><div class="skeleton skeleton-row skeleton-text-sm"></div></article>
        </section>
      </template>

      <section v-else-if="error" class="state-panel error">
        <div class="empty-state">
          <span class="empty-icon">⚠</span>
          <strong>数据加载失败</strong>
          <span>{{ error }}</span>
          <button class="ghost-btn" @click="loadAll">重新加载</button>
        </div>
      </section>

      <template v-else>
        <DashboardView
          v-if="activeTab === 'dashboard' && overview"
          :overview="overview"
          :routes="routes"
          :statistics="routeStatistics"
          :collector-running="collectorRunning"
          @select-route="selectRoute"
        />
        <BigScreenView
          v-else-if="activeTab === 'bigscreen' && overview"
          :overview="overview"
          :routes="routes"
          :statistics="routeStatistics"
          :spots="spots"
          :collector-running="collectorRunning"
          :current-time="currentTime"
          :last-update="lastUpdate"
          :total-samples="totalSamples"
          @select-route="selectRoute"
        />
        <MapView
          v-else-if="activeTab === 'map'"
          :routes="routes"
          :spots="spots"
          :selected-route-id="selectedRouteId"
          @select-route="selectedRouteId = $event"
        />
        <CollectionView
          v-else-if="activeTab === 'collection'"
          :routes="routes"
          :collector-running="collectorRunning"
          :collector-message="collectorMessage"
          @toggle-collector="toggleCollector"
          @data-changed="loadAll"
        />
        <RouteDetailView
          v-else-if="activeTab === 'detail' && selectedRoute"
          :route="selectedRoute"
          :routes="routes"
          @change-route="selectedRouteId = $event"
        />
        <AnalyticsView
          v-else-if="activeTab === 'analytics' && overview"
          :overview="overview"
          :statistics="routeStatistics"
          :spots="spots"
          :collector-running="collectorRunning"
        />
        <AdminView
          v-else-if="activeTab === 'admin'"
          :routes="routes"
          @refresh="loadAll"
        />
        <ChartPanel v-else-if="activeTab === 'charts'" />
      </template>
    </main>

    <ToastStack ref="toastRef" />
  </div>
</template>
