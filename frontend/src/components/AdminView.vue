<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import type { BusRoute, Spot, Stop } from '../types';

const props = defineProps<{
  routes: BusRoute[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const saving = ref(false);
const message = ref('');
const heatMessage = ref('');
const heatUpdating = ref(false);
const heatResults = ref<Array<{ id: number; name: string; heat: number }> | null>(null);
const stops = ref<Stop[]>([]);
const spots = ref<Spot[]>([]);

const form = reactive({
  number: '',
  name: '',
  start: '',
  end: '',
  operationTime: '06:30-21:30',
  fare: '2元',
  type: '常规公交',
  color: '#5E6AD2',
  stopIds: [] as number[],
  spotIds: [] as number[]
});

async function createRoute() {
  if (form.stopIds.length < 2) {
    message.value = '请至少选择 2 个经过站点，否则线路无法在地图和大屏上定位。';
    return;
  }
  saving.value = true;
  message.value = '';
  try {
    await api.createRoute(form);
    message.value = '新增线路成功。';
    Object.assign(form, {
      number: '', name: '', start: '', end: '',
      operationTime: '06:30-21:30', fare: '2元', type: '常规公交',
      color: '#5E6AD2', stopIds: [], spotIds: []
    });
    emit('refresh');
  } catch (error) {
    message.value = error instanceof Error ? error.message : '新增失败';
  } finally {
    saving.value = false;
  }
}

async function removeRoute(route: BusRoute) {
  if (!confirm(`确定删除 ${route.number} ${route.name} 吗？`)) return;
  await api.deleteRoute(route.id);
  emit('refresh');
}

async function recalculateHeat() {
  heatUpdating.value = true;
  heatMessage.value = '';
  try {
    heatResults.value = await api.recalculateSpotHeat();
    heatMessage.value = '景点热度已重新计算，全站可视化已更新。';
  } catch (err) {
    heatMessage.value = err instanceof Error ? err.message : '热度刷新失败';
  } finally {
    heatUpdating.value = false;
  }
}

onMounted(async () => {
  try {
    const [stopData, spotData] = await Promise.all([api.stops(), api.spots()]);
    stops.value = stopData;
    spots.value = spotData;
  } catch {
    message.value = '站点和景点列表加载失败，请刷新后重试。';
  }
});
</script>

<template>
  <section class="admin-layout">
    <!-- LEFT: Forms -->
    <div class="admin-left">
      <article class="panel">
        <div class="section-title">
          <div>
            <p class="eyebrow">线路管理</p>
            <h2>新增公交线路</h2>
          </div>
        </div>
        <form class="admin-form" @submit.prevent="createRoute">
          <label>线路编号 <input v-model="form.number" required placeholder="例如 120路" /></label>
          <label>线路名称 <input v-model="form.name" required placeholder="例如 文旅接驳线" /></label>
          <label>起点 <input v-model="form.start" required /></label>
          <label>终点 <input v-model="form.end" required /></label>
          <label>运营时间 <input v-model="form.operationTime" /></label>
          <label>票价 <input v-model="form.fare" /></label>
          <label>线路类型
            <select v-model="form.type">
              <option>常规公交</option>
              <option>旅游专线</option>
              <option>旅游接驳</option>
              <option>快线接驳</option>
              <option>片区接驳</option>
              <option>景区接驳</option>
            </select>
          </label>
          <label>线路颜色 <input v-model="form.color" type="color" class="color-input" /></label>
          <label>经过站点
            <select v-model="form.stopIds" multiple size="8" required>
              <option v-for="stop in stops" :key="stop.id" :value="stop.id">
                {{ stop.name }} · {{ stop.district }}
              </option>
            </select>
          </label>
          <label>关联景点
            <select v-model="form.spotIds" multiple size="6">
              <option v-for="spot in spots" :key="spot.id" :value="spot.id">
                {{ spot.name }} · 热度 {{ spot.heat }}
              </option>
            </select>
          </label>
          <p class="admin-hint">经过站点会按列表顺序生成线路折线，并驱动地图与大屏热力图显示。</p>
          <button class="primary-btn" :disabled="saving">{{ saving ? '保存中...' : '新增线路' }}</button>
        </form>
        <p v-if="message" class="form-message">{{ message }}</p>
      </article>

      <article class="panel">
        <div class="section-title">
          <div>
            <p class="eyebrow">数据运营</p>
            <h2>景点热度管理</h2>
          </div>
        </div>
        <p class="admin-hint">景点热度用于驱动客流仿真模型和数据分析图表。点击按钮生成新的热度指数，全站可视化立即响应。</p>
        <button class="primary-btn btn-full" :disabled="heatUpdating" @click="recalculateHeat">
          {{ heatUpdating ? '刷新中...' : '手动刷新景点热度指数' }}
        </button>
        <p v-if="heatMessage" class="form-message">{{ heatMessage }}</p>
        <div v-if="heatResults" class="heat-table">
          <div v-for="item in heatResults" :key="item.id" class="heat-row">
            <span>{{ item.name }}</span>
            <div class="heat-bar">
              <div class="heat-fill" :style="{ width: item.heat + '%', background: item.heat > 85 ? '#ef4444' : item.heat > 70 ? '#f97316' : '#5E6AD2' }"></div>
            </div>
            <strong :style="{ color: item.heat > 85 ? '#ef4444' : item.heat > 70 ? '#f97316' : '#5E6AD2' }">{{ item.heat }}</strong>
          </div>
        </div>
      </article>
    </div>

    <!-- RIGHT: Route table -->
    <article class="panel admin-right">
      <div class="section-title">
        <div>
          <p class="eyebrow">数据维护</p>
          <h2>线路数据管理</h2>
        </div>
        <span class="admin-count">{{ props.routes.length }} 条线路</span>
      </div>
      <div class="admin-table">
        <div class="admin-row admin-head">
          <span>编号</span><span>名称</span><span>起终点</span><span>类型</span><span>操作</span>
        </div>
        <div v-for="route in routes" :key="route.id" class="admin-row">
          <span class="route-num-tag" :style="{ background: route.color }">{{ route.number }}</span>
          <strong>{{ route.name }}</strong>
          <span class="route-endpoints">{{ route.start }} → {{ route.end }}</span>
          <span>{{ route.type }}</span>
          <button @click="removeRoute(route)">删除</button>
        </div>
        <div v-if="routes.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <span>暂无线路数据，请先新增</span>
        </div>
      </div>
    </article>
  </section>
</template>
