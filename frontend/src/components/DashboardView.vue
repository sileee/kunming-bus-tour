<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import type { BusRoute, Overview, RouteStatistic } from '../types';

const props = defineProps<{
  overview: Overview;
  routes: BusRoute[];
  statistics: RouteStatistic[];
  collectorRunning: boolean;
}>();

const emit = defineEmits<{
  selectRoute: [routeId: number];
}>();

const displayFlow = ref(props.overview.passengerFlow);
const flowChanged = ref(false);
const puzzleActive = ref(false);
const puzzleTiles = ref<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8]);
const puzzleWave = ref(false);
let animFrame = 0;
let waveTimer = 0;
let heroTimer = 0;

/* ── Streaming hero title typewriter ── */
const heroTitle = ref('');
const fullHeroTitle = '用实时数据驱动昆明旅游公交决策';
const heroIdx = ref(0);

onMounted(() => {
  heroTimer = window.setInterval(() => {
    if (heroIdx.value < fullHeroTitle.length) {
      heroIdx.value += 1;
      heroTitle.value = fullHeroTitle.slice(0, heroIdx.value);
    } else {
      window.clearInterval(heroTimer);
    }
  }, 40);
});

onUnmounted(() => {
  window.clearInterval(heroTimer);
});

const puzzleSolved = computed(() => puzzleTiles.value.every((tile, index) => tile === index));

function animateValue(from: number, to: number) {
  cancelAnimationFrame(animFrame);
  if (from === to) {
    displayFlow.value = to;
    return;
  }
  const duration = 500;
  const start = performance.now();
  function step(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    displayFlow.value = Math.round(from + (to - from) * eased);
    if (progress < 1) {
      animFrame = requestAnimationFrame(step);
    }
  }
  animFrame = requestAnimationFrame(step);
}

watch(() => props.overview.passengerFlow, (val, old) => {
  if (old !== undefined && val !== old) {
    flowChanged.value = true;
    animateValue(old, val);
    setTimeout(() => { flowChanged.value = false; }, 600);
  } else {
    displayFlow.value = val;
  }
});

function formatNumber(value: number) {
  return value.toLocaleString('zh-CN');
}

function heatColor(h: number) {
  if (h >= 85) return '#ef4444';
  if (h >= 70) return '#f97316';
  return '#5E6AD2';
}

function triggerPuzzleWave() {
  puzzleWave.value = false;
  window.clearTimeout(waveTimer);
  requestAnimationFrame(() => {
    puzzleWave.value = true;
    waveTimer = window.setTimeout(() => {
      puzzleWave.value = false;
    }, 720);
  });
}

function startPuzzle() {
  if (!puzzleActive.value || puzzleSolved.value) {
    const tiles = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    let blank = 8;
    for (let i = 0; i < 90; i += 1) {
      const row = Math.floor(blank / 3);
      const col = blank % 3;
      const moves = [
        row > 0 ? blank - 3 : -1,
        row < 2 ? blank + 3 : -1,
        col > 0 ? blank - 1 : -1,
        col < 2 ? blank + 1 : -1,
      ].filter((move) => move >= 0);
      const next = moves[Math.floor(Math.random() * moves.length)];
      [tiles[blank], tiles[next]] = [tiles[next], tiles[blank]];
      blank = next;
    }
    puzzleTiles.value = tiles;
  }
  puzzleActive.value = true;
  triggerPuzzleWave();
}

function resetPuzzle() {
  puzzleTiles.value = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  puzzleActive.value = false;
  triggerPuzzleWave();
}

function movePuzzleTile(index: number) {
  if (!puzzleActive.value) return;
  const blank = puzzleTiles.value.indexOf(8);
  const sameRow = Math.floor(blank / 3) === Math.floor(index / 3);
  const adjacent = Math.abs(blank - index) === 3 || (sameRow && Math.abs(blank - index) === 1);
  if (!adjacent) return;
  const nextTiles = [...puzzleTiles.value];
  [nextTiles[blank], nextTiles[index]] = [nextTiles[index], nextTiles[blank]];
  puzzleTiles.value = nextTiles;
  triggerPuzzleWave();
}

function tileStyle(tile: number) {
  const row = Math.floor(tile / 3);
  const col = tile % 3;
  return {
    backgroundImage: "url('/images/home-hero-bus-network.png')",
    backgroundPosition: `${col * 50}% ${row * 50}%`,
  };
}
</script>

<template>
  <section class="dashboard-grid">
    <article class="metric-panel" :class="{ 'metric-pulse': collectorRunning }">
      <div class="metric-icon metric-icon-routes">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      </div>
      <span>公交线路</span>
      <strong>{{ overview.routeCount }}</strong>
      <small>旅游相关线路库</small>
    </article>
    <article class="metric-panel" :class="{ 'metric-pulse': collectorRunning }">
      <div class="metric-icon metric-icon-stops">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </div>
      <span>公交站点</span>
      <strong>{{ overview.stopCount }}</strong>
      <small>覆盖主城与呈贡</small>
    </article>
    <article class="metric-panel" :class="{ 'metric-pulse': collectorRunning }">
      <div class="metric-icon metric-icon-spots">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L8 8h8l-4-6z"/><circle cx="12" cy="13" r="4"/><path d="M8 17l-4 3h16l-4-3"/></svg>
      </div>
      <span>旅游景点</span>
      <strong>{{ overview.spotCount }}</strong>
      <small>昆明代表性目的地</small>
    </article>
    <article class="metric-panel" :class="{ 'metric-pulse': collectorRunning, 'value-changed': flowChanged }">
      <div class="metric-header-row">
        <span>模型客流</span>
        <span v-if="collectorRunning" class="live-badge">实时仿真</span>
      </div>
      <strong>{{ formatNumber(displayFlow) }}</strong>
      <small>按时间与景点热度仿真</small>
    </article>
  </section>

  <section class="content-grid two-columns">
    <article class="panel hero-panel dashboard-hero-panel">
      <div class="dashboard-hero-copy">
        <p class="eyebrow">公共交通数据可视化</p>
        <h2>{{ heroTitle }}<span v-if="heroIdx < fullHeroTitle.length" class="streaming-text"></span></h2>
        <p>
          覆盖翠湖、滇池、民族村、世博园、官渡古镇、斗南花市等核心目的地。
          所有指标由后端客流仿真模型实时计算，采集数据驱动全站可视化联动。
        </p>
        <div class="model-note" :class="{ 'model-active': collectorRunning }">
          <strong>客流仿真模型{{ collectorRunning ? '（运行中）' : '' }}</strong>
          <div class="model-formula">
            <code>基础需求</code> × <code>站点系数</code> × <code>景点热度</code> × <code>线路类型</code> × <code>早晚高峰</code> × <code>周末系数</code> × <code>扰动因子</code><code v-if="collectorRunning"> × 采集因子</code>
          </div>
        </div>
      </div>
      <div
        class="kunming-overview-map hero-image-frame puzzle-hero"
        :class="{ 'hero-image-live': collectorRunning, 'puzzle-mode': puzzleActive, 'puzzle-wave': puzzleWave }"
        @click.self="startPuzzle"
      >
        <img
          v-if="!puzzleActive"
          src="/images/home-hero-bus-network.png"
          alt="昆明旅游公交路线数据可视化"
          @click="startPuzzle"
        />
        <div v-else class="puzzle-board" :class="{ solved: puzzleSolved }" @click.stop>
          <button
            v-for="(tile, index) in puzzleTiles"
            :key="`${tile}-${index}`"
            class="puzzle-tile"
            :class="{ empty: tile === 8 }"
            :style="tile === 8 ? undefined : tileStyle(tile)"
            type="button"
            :aria-label="tile === 8 ? '空位' : `移动拼图 ${tile + 1}`"
            @click="movePuzzleTile(index)"
          ></button>
        </div>
        <div class="puzzle-actions" @click.stop>
          <button class="puzzle-icon-btn" type="button" aria-label="复原图片" title="复原图片" @click="resetPuzzle">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
          <button class="puzzle-icon-btn" type="button" aria-label="继续游戏" title="继续游戏" @click="startPuzzle">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>
    </article>

    <article class="panel">
      <div class="section-title">
        <div>
          <p class="eyebrow">TOP 5</p>
          <h2>热门线路排行</h2>
        </div>
        <span v-if="collectorRunning" class="live-badge">实时更新</span>
      </div>
      <div class="rank-list">
        <button
          v-for="(item, idx) in overview.hotRoutes"
          :key="item.routeId"
          class="rank-row"
          @click="emit('selectRoute', item.routeId)"
        >
          <span class="rank-badge" :style="{ background: idx === 0 ? '#ef4444' : idx === 1 ? '#f97316' : '#5a5d6e' }">{{ idx + 1 }}</span>
          <div class="rank-info">
            <strong>{{ item.routeNumber }}</strong>
            <small>{{ item.routeName }}</small>
            <div class="heat-bar">
              <div class="heat-fill" :style="{ width: item.heat + '%', background: heatColor(item.heat) }"></div>
            </div>
          </div>
          <em :style="{ color: heatColor(item.heat) }">{{ item.heat }}</em>
        </button>
      </div>
    </article>
  </section>

  <section class="content-grid route-cards">
    <button v-for="route in routes" :key="route.id" class="route-card" @click="emit('selectRoute', route.id)">
      <div class="route-card-top">
        <span class="route-badge" :style="{ background: route.color }">{{ route.number }}</span>
        <small class="route-type-tag">{{ route.type }}</small>
      </div>
      <strong>{{ route.name }}</strong>
      <div class="route-card-meta">
        <span>{{ route.start }}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <span>{{ route.end }}</span>
      </div>
    </button>
  </section>
</template>
