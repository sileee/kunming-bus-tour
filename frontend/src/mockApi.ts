// @ts-nocheck
/**
 * 浏览器端 Mock API —— 替代 Express 后端
 * 数据、客流模拟、登录验证全部在浏览器内运行
 * EdgeOne Pages 纯静态托管也能完整展示
 */

// ====== 类型 ======
interface Stop { id: number; name: string; lng: number; lat: number; district: string }
interface Spot { id: number; name: string; lng: number; lat: number; category: string; district: string; rating: number; heat: number; intro: string }
interface RouteDef { id: number; number: string; name: string; start: string; end: string; operationTime: string; fare: string; type: string; color: string; stopIds: number[]; spotIds: number[] }
interface StatDef { id: number; routeId: number; date: string; passengerFlow: number; punctuality: number; congestion: number; heat: number }
interface CollectionSample { id: number; routeId: number; collectedAt: string; speed: number; passengerCount: number; loadRate: number; source: string; routeNumber?: string; routeName?: string }
interface Overview { routeCount: number; stopCount: number; spotCount: number; passengerFlow: number; avgPunctuality: number; hotRoutes: any[]; districtStopCount: Record<string, number>; simulationModel: string }
interface RouteStatistic { id: number; routeId: number; date: string; passengerFlow: number; punctuality: number; congestion: number; heat: number; routeNumber: string; routeName: string; type: string; }

// ====== 原始数据 ======
const stops: Stop[] = [
  { id: 1, name: '昆明站', lng: 102.7229, lat: 25.0156, district: '官渡区' },
  { id: 2, name: '东风广场', lng: 102.7217, lat: 25.0401, district: '盘龙区' },
  { id: 3, name: '南屏街东口', lng: 102.7148, lat: 25.0393, district: '五华区' },
  { id: 4, name: '金马坊', lng: 102.7103, lat: 25.0345, district: '五华区' },
  { id: 5, name: '小西门', lng: 102.7006, lat: 25.0428, district: '五华区' },
  { id: 6, name: '翠湖东门', lng: 102.7071, lat: 25.0488, district: '五华区' },
  { id: 7, name: '云南大学', lng: 102.704, lat: 25.0527, district: '五华区' },
  { id: 8, name: '建设路', lng: 102.693, lat: 25.052, district: '五华区' },
  { id: 9, name: '黄土坡', lng: 102.662, lat: 25.058, district: '五华区' },
  { id: 10, name: '大观楼', lng: 102.6718, lat: 25.0338, district: '西山区' },
  { id: 11, name: '海埂公园', lng: 102.6689, lat: 24.9654, district: '西山区' },
  { id: 12, name: '云南民族村', lng: 102.6705, lat: 24.9705, district: '西山区' },
  { id: 13, name: '滇池大坝', lng: 102.6565, lat: 24.966, district: '西山区' },
  { id: 14, name: '高峣', lng: 102.638, lat: 24.971, district: '西山区' },
  { id: 15, name: '世博园', lng: 102.7572, lat: 25.0712, district: '盘龙区' },
  { id: 16, name: '白龙寺', lng: 102.755, lat: 25.058, district: '盘龙区' },
  { id: 17, name: '菊花村', lng: 102.737, lat: 25.022, district: '官渡区' },
  { id: 18, name: '官渡古镇', lng: 102.7564, lat: 24.9567, district: '官渡区' },
  { id: 19, name: '斗南花市', lng: 102.7968, lat: 24.9009, district: '呈贡区' },
  { id: 20, name: '昆明南站', lng: 102.861, lat: 24.873, district: '呈贡区' },
  { id: 21, name: '圆通山', lng: 102.709, lat: 25.0525, district: '五华区' },
  { id: 22, name: '护国桥', lng: 102.719, lat: 25.041, district: '五华区' },
  { id: 23, name: '滇池路口', lng: 102.691, lat: 25.013, district: '西山区' },
  { id: 24, name: '大商汇', lng: 102.701, lat: 25.004, district: '西山区' },
  { id: 25, name: '前兴路公交枢纽', lng: 102.707, lat: 24.989, district: '西山区' },
  { id: 26, name: '云南省博物馆', lng: 102.759, lat: 24.956, district: '官渡区' },
  { id: 27, name: '斗南地铁站', lng: 102.796, lat: 24.907, district: '呈贡区' },
  { id: 28, name: '呈贡广场', lng: 102.8, lat: 24.889, district: '呈贡区' }
];

const spots: Spot[] = [
  { id: 1, name: '翠湖公园', lng: 102.7048, lat: 25.0477, category: '城市公园', district: '五华区', rating: 4.8, heat: 92, intro: '昆明主城区代表性公园，适合城市漫游与历史街区联游。' },
  { id: 2, name: '云南大学', lng: 102.704, lat: 25.0527, category: '高校人文', district: '五华区', rating: 4.7, heat: 86, intro: '近代校园建筑与银杏大道形成昆明文旅名片。' },
  { id: 3, name: '南屏街', lng: 102.7134, lat: 25.0389, category: '商业街区', district: '五华区', rating: 4.6, heat: 89, intro: '昆明核心商业步行街，餐饮、购物和夜游集中。' },
  { id: 4, name: '金马碧鸡坊', lng: 102.7101, lat: 25.0346, category: '历史地标', district: '五华区', rating: 4.6, heat: 87, intro: '昆明城市地标之一，适合作为老街游览节点。' },
  { id: 5, name: '大观公园', lng: 102.6718, lat: 25.0338, category: '城市公园', district: '西山区', rating: 4.7, heat: 81, intro: '以大观楼长联和滇池景观闻名。' },
  { id: 6, name: '海埂公园', lng: 102.6689, lat: 24.9654, category: '滇池景区', district: '西山区', rating: 4.8, heat: 94, intro: '滇池沿岸热门目的地，冬季观鸥热度高。' },
  { id: 7, name: '云南民族村', lng: 102.6697, lat: 24.9713, category: '民族文化', district: '西山区', rating: 4.7, heat: 90, intro: '集中展示云南多民族建筑、节庆与民俗文化。' },
  { id: 8, name: '滇池大坝', lng: 102.6565, lat: 24.966, category: '生态景观', district: '西山区', rating: 4.8, heat: 95, intro: '滇池观景与红嘴鸥季核心空间。' },
  { id: 9, name: '世博园', lng: 102.7572, lat: 25.0712, category: '园林展区', district: '盘龙区', rating: 4.5, heat: 76, intro: '昆明世界园艺博览园，适合家庭与研学游。' },
  { id: 10, name: '官渡古镇', lng: 102.7564, lat: 24.9567, category: '历史街区', district: '官渡区', rating: 4.6, heat: 83, intro: '保留老昆明街巷风貌和非遗小吃。' },
  { id: 11, name: '斗南花市', lng: 102.7968, lat: 24.9009, category: '特色市场', district: '呈贡区', rating: 4.7, heat: 88, intro: '亚洲知名鲜切花交易市场，夜间交易场景独特。' },
  { id: 12, name: '西山风景区', lng: 102.625, lat: 24.9605, category: '山地景区', district: '西山区', rating: 4.8, heat: 85, intro: '俯瞰滇池与昆明城的经典登山观景线路。' }
];

const routes: RouteDef[] = [
  { id: 1, number: '2路', name: '昆明站-黄土坡城市文脉线', start: '昆明站', end: '黄土坡', operationTime: '06:00-22:30', fare: '2元', type: '常规公交', color: '#5E6AD2', stopIds: [1, 2, 3, 4, 5, 6, 7, 8, 9], spotIds: [1, 2, 3, 4] },
  { id: 2, number: '44路', name: '昆明站-海埂滇池线', start: '昆明站', end: '海埂公园', operationTime: '06:30-21:30', fare: '2元', type: '旅游接驳', color: '#14b8a6', stopIds: [1, 24, 25, 23, 12, 11, 13], spotIds: [6, 7, 8] },
  { id: 3, number: '73路', name: '护国桥-海埂公园观鸥线', start: '护国桥', end: '海埂公园', operationTime: '06:20-22:00', fare: '2元', type: '旅游接驳', color: '#ef4444', stopIds: [22, 3, 4, 23, 12, 11], spotIds: [3, 4, 6, 7] },
  { id: 4, number: 'A1路', name: '世博园-云南民族村旅游线', start: '世博园', end: '云南民族村', operationTime: '07:00-20:00', fare: '2元', type: '旅游专线', color: '#8b5cf6', stopIds: [15, 16, 2, 3, 4, 23, 12], spotIds: [3, 4, 7, 9] },
  { id: 5, number: '100路', name: '翠湖高校慢游线', start: '小西门', end: '圆通山', operationTime: '06:30-21:00', fare: '2元', type: '常规公交', color: '#f97316', stopIds: [5, 6, 7, 21, 2], spotIds: [1, 2, 3] },
  { id: 6, number: '24路', name: '昆明站-滇池大观线', start: '昆明站', end: '海埂公园', operationTime: '06:00-21:30', fare: '2元', type: '常规公交', color: '#06b6d4', stopIds: [1, 24, 10, 23, 12, 11], spotIds: [5, 6, 7] },
  { id: 7, number: 'K31路', name: '昆明南站-斗南花市快线', start: '昆明南站', end: '斗南花市', operationTime: '07:00-20:30', fare: '2元', type: '快线接驳', color: '#22c55e', stopIds: [20, 28, 27, 19], spotIds: [11] },
  { id: 8, number: '253路', name: '官渡古镇-斗南花市线', start: '官渡古镇', end: '斗南花市', operationTime: '06:40-20:30', fare: '2元', type: '片区接驳', color: '#e11d48', stopIds: [18, 26, 27, 19], spotIds: [10, 11] },
  { id: 9, number: '94路', name: '海埂-西山生态观景线', start: '海埂公园', end: '高峣', operationTime: '07:00-19:30', fare: '2元', type: '景区接驳', color: '#84cc16', stopIds: [11, 13, 14], spotIds: [6, 8, 12] },
  { id: 10, number: '47路', name: '菊花村-世博园园林线', start: '菊花村', end: '世博园', operationTime: '06:30-21:00', fare: '2元', type: '常规公交', color: '#a78bfa', stopIds: [17, 2, 16, 15], spotIds: [3, 9] }
];

// ====== 客流模拟引擎（完整移植自后端 fileRepository.js） ======
const districtMass: Record<string, { population: number; employment: number; composite: number }> = {
  '五华区': { population: 1.14, employment: 0.92, composite: 2.06 },
  '盘龙区': { population: 1.00, employment: 0.88, composite: 1.88 },
  '官渡区': { population: 1.08, employment: 0.96, composite: 2.04 },
  '西山区': { population: 0.89, employment: 0.72, composite: 1.61 },
  '呈贡区': { population: 0.65, employment: 0.58, composite: 1.23 }
};

function monthSeasonality(month: number): number {
  const idx: Record<number, number> = { 1: 0.62, 2: 0.78, 3: 0.88, 4: 0.95, 5: 1.02, 6: 1.05, 7: 1.30, 8: 1.35, 9: 1.05, 10: 1.40, 11: 0.90, 12: 0.72 };
  return idx[month] || 1.0;
}

function holidayBoost(date: Date): number {
  const m = date.getMonth() + 1, d = date.getDate(), dow = date.getDay();
  if (m === 2 && d >= 14 && d <= 20) return 1.48;
  if (m === 4 && d >= 3 && d <= 7) return 1.25;
  if (m === 5 && d >= 1 && d <= 5) return 1.42;
  if ((m === 5 && d >= 28) || (m === 6 && d <= 2)) return 1.22;
  if (m === 7 || m === 8) return 1.18;
  if ((m === 9 && d >= 28) || (m === 10 && d <= 8)) return 1.50;
  if (dow === 0 || dow === 6) return 1.24;
  return 1.0;
}

function hourFactor(hour: number): { peak: number; desc: string } {
  if (hour >= 6 && hour < 9) return { peak: 1.38, desc: '早高峰' };
  if (hour >= 9 && hour < 12) return { peak: 0.82, desc: '午前平峰' };
  if (hour >= 12 && hour < 14) return { peak: 0.70, desc: '午间低谷' };
  if (hour >= 14 && hour < 17) return { peak: 0.88, desc: '午后平峰' };
  if (hour >= 17 && hour < 20) return { peak: 1.26, desc: '晚高峰' };
  if (hour >= 20 && hour < 22) return { peak: 0.45, desc: '夜间' };
  if (hour >= 5 && hour < 6) return { peak: 0.38, desc: '清晨' };
  return { peak: 0.10, desc: '深夜' };
}

function seededRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function truncatedNormal(seed: number, mean = 0, std = 1): number {
  const u1 = seededRandom(seed);
  const u2 = seededRandom(seed + 0.618);
  let z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
  z = Math.max(-2, Math.min(2, z));
  return mean + z * std;
}

function distanceDecay(distanceKm: number, isTourist: boolean): number {
  const gamma = isTourist ? 1.25 : 0.85;
  return Math.pow(Math.max(distanceKm, 0.3), -gamma);
}

function spotAttractiveness(spot: Spot, routeCount: number): number {
  const heatNorm = (spot.heat || 50) / 100;
  const ratingNorm = (spot.rating || 4.0) / 5.0;
  const connectivityNorm = Math.log(1 + routeCount) / Math.log(11);
  return Math.pow(heatNorm, 0.40) * Math.pow(ratingNorm, 0.35) * Math.pow(connectivityNorm, 0.25);
}

function competitionFactor(spot: Spot, allSpots: Spot[]): number {
  const nearby = allSpots.filter(s => {
    if (s.id === spot.id) return false;
    const dLng = (s.lng - spot.lng) * 102000;
    const dLat = (s.lat - spot.lat) * 111000;
    return Math.sqrt(dLng * dLng + dLat * dLat) < 4000;
  }).length;
  return 1 / (1 + nearby * 0.12);
}

function computeGravityFlow(route: RouteDef, routeStops: Stop[], routeSpots: Spot[], date: Date): number {
  if (routeStops.length < 2) return 0;
  const isTourist = String(route.type).includes('旅游') || String(route.type).includes('景区');
  const month = date.getMonth() + 1;
  const hour = date.getHours();

  const spotRouteCount: Record<number, number> = {};
  routes.forEach(r => {
    (r.spotIds || []).forEach(sid => {
      spotRouteCount[sid] = (spotRouteCount[sid] || 0) + 1;
    });
  });

  const stopMass: Record<number, number> = {};
  routeStops.forEach(s => {
    const dm = districtMass[s.district] || { composite: 1.0 };
    stopMass[s.id] = dm.composite;
  });

  let totalFlow = 0;
  for (let i = 0; i < routeStops.length; i++) {
    for (let j = i + 1; j < routeStops.length; j++) {
      const si = routeStops[i], sj = routeStops[j];
      const dLng = (sj.lng - si.lng) * 102000;
      const dLat = (sj.lat - si.lat) * 111000;
      const distKm = Math.sqrt(dLng * dLng + dLat * dLat) / 1000;
      const M_i = stopMass[si.id] || 1.0;
      let M_j = stopMass[sj.id] || 1.0;
      const nearbySpots = routeSpots.filter(sp => {
        const sdLng = (sp.lng - sj.lng) * 102000;
        const sdLat = (sp.lat - sj.lat) * 111000;
        return Math.sqrt(sdLng * sdLng + sdLat * sdLat) < 2000;
      });
      if (nearbySpots.length > 0) {
        const spotAtt = nearbySpots.reduce((sum, sp) => sum + spotAttractiveness(sp, spotRouteCount[sp.id] || 1), 0) / nearbySpots.length;
        M_j += spotAtt * 2.5;
      }
      totalFlow += M_i * M_j * distanceDecay(distKm, isTourist);
    }
  }

  totalFlow *= 380;
  const typeFactorMap: Record<string, number> = {
    '旅游专线': 1.35, '旅游接驳': 1.18, '景区接驳': 1.16, '快线接驳': 1.10, '常规公交': 0.95, '片区接驳': 1.00
  };
  totalFlow *= typeFactorMap[route.type] || 1.0;
  totalFlow *= monthSeasonality(month) * holidayBoost(date) * hourFactor(hour).peak;
  if (routeSpots.length > 0) {
    const avgComp = routeSpots.reduce((sum, sp) => sum + competitionFactor(sp, spots), 0) / routeSpots.length;
    totalFlow *= (0.85 + 0.15 * avgComp);
  }
  const noise = truncatedNormal(route.id * 37 + date.getDate() + month * 13 + hour * 7, 1.0, 0.06);
  return Math.round(totalFlow * noise);
}

// ====== 采集样本存储 ======
const collectionSamples: CollectionSample[] = [
  { id: 1, routeId: 2, collectedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), speed: 28, passengerCount: 51, loadRate: 78, source: '车载客流传感器' },
  { id: 2, routeId: 3, collectedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(), speed: 24, passengerCount: 47, loadRate: 73, source: 'GPS轨迹终端' },
  { id: 3, routeId: 4, collectedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(), speed: 31, passengerCount: 42, loadRate: 69, source: '移动端上报' },
  { id: 4, routeId: 1, collectedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), speed: 26, passengerCount: 39, loadRate: 64, source: '电子站牌' }
];
const collectionBaselineId = Math.max(0, ...collectionSamples.map(sample => sample.id));

// ====== 工具函数 ======
function simulateRouteStatistic(route: RouteDef, date = new Date()): RouteStatistic {
  const routeStops = route.stopIds.map(sid => stops.find(s => s.id === sid)).filter(Boolean) as Stop[];
  const routeSpots = route.spotIds.map(sid => spots.find(s => s.id === sid)).filter(Boolean) as Spot[];
  let passengerFlow = computeGravityFlow(route, routeStops, routeSpots, date);

  // Each newly collected passenger contributes to today's cumulative flow.
  const recent = collectionSamples.filter(s => s.routeId === route.id).slice(-12);
  const livePassengerIncrement = collectionSamples
    .filter(sample => sample.routeId === route.id && sample.id > collectionBaselineId)
    .reduce((sum, sample) => sum + Number(sample.passengerCount || 0), 0);
  passengerFlow += livePassengerIncrement;

  const avgSpotHeat = routeSpots.length > 0 ? routeSpots.reduce((s, sp) => s + sp.heat, 0) / routeSpots.length : 55;
  const vehicleTrips = Math.max(24, 48 + routeStops.length * 2.0);
  const loadFactor = passengerFlow / Math.max(vehicleTrips * 80, 1);
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-3.5 * (x - 0.5)));
  const modelCongestion = Math.round(34 + sigmoid(loadFactor) * 54 + truncatedNormal(route.id * 23 + date.getHours(), 0, 2.0));
  const avgLoadRate = recent.length
    ? recent.reduce((sum, sample) => sum + Number(sample.loadRate || 0), 0) / recent.length
    : modelCongestion;
  const avgSpeed = recent.length
    ? recent.reduce((sum, sample) => sum + Number(sample.speed || 0), 0) / recent.length
    : 27;
  const congestion = Math.round(Math.max(34, Math.min(92, modelCongestion * 0.65 + avgLoadRate * 0.35)) * 10) / 10;

  const districts = [...new Set(routeStops.map(s => s.district))];
  const avgDistrictMass = districts.reduce((s, d) => s + (districtMass[d]?.employment || 0.7), 0) / Math.max(districts.length, 1);
  const basePunctuality = 93.5 - congestion * 0.06 - avgDistrictMass * 2.5
    - Math.max(0, avgLoadRate - 70) * 0.025
    + (avgSpeed - 27) * 0.035;
  const noise2 = truncatedNormal(route.id * 13 + date.getMinutes(), 0, 1.2);
  const punctuality = Math.round(Math.max(82, Math.min(97, basePunctuality + noise2)) * 10) / 10;

  const flowHeat = Math.log10(Math.max(passengerFlow, 1000)) * 14 - 24;
  const modelHeat = Math.max(52, Math.min(99, avgSpotHeat * 0.55 + flowHeat * 0.45));
  const heat = dynamicHeatFromFreshSamples(modelHeat, route.id, date);

  return {
    id: route.id, routeId: route.id, date: date.toISOString().slice(0, 10),
    passengerFlow, punctuality, congestion, heat,
    routeNumber: route.number, routeName: route.name, type: route.type
  };
}

function attachRouteDetails(route: RouteDef) {
  const routeStops = route.stopIds.map((sid, idx) => {
    const s = stops.find(st => st.id === sid)!;
    return { ...s, sequence: idx + 1 };
  });
  const routeSpots = route.spotIds.map(sid => spots.find(s => s.id === sid)).filter(Boolean);
  return {
    ...route,
    stops: routeStops,
    spots: routeSpots,
    polyline: routeStops.map(s => [s.lng, s.lat]),
    statistics: simulateRouteStatistic(route)
  };
}

function collectionModeration(routeId: number, modelFlow: number): number {
  const recent = collectionSamples.filter(s => s.routeId === routeId).slice(-12);
  if (!recent.length) return modelFlow;
  const avgLoadRate = recent.reduce((s, sm) => s + (sm.loadRate || 0), 0) / recent.length;
  const avgPax = recent.reduce((s, sm) => s + (sm.passengerCount || 0), 0) / recent.length;
  return Math.round(modelFlow * 0.65 + avgPax * 28 * 0.35);
}

function dynamicHeatFromFreshSamples(modelHeat: number, routeId: number, now = new Date()): number {
  const windowMs = 10 * 60 * 1000;
  const freshSamples = collectionSamples
    .filter(sample => sample.routeId === routeId && sample.id > collectionBaselineId)
    .filter(sample => now.getTime() - new Date(sample.collectedAt).getTime() <= windowMs)
    .slice(-12);

  if (!freshSamples.length) return Math.round(modelHeat);

  let weightTotal = 0;
  let passengerTotal = 0;
  let loadTotal = 0;
  freshSamples.forEach(sample => {
    const ageMs = Math.max(0, now.getTime() - new Date(sample.collectedAt).getTime());
    const recencyWeight = Math.max(0.15, 1 - ageMs / windowMs);
    weightTotal += recencyWeight;
    passengerTotal += Number(sample.passengerCount || 0) * recencyWeight;
    loadTotal += Number(sample.loadRate || 0) * recencyWeight;
  });

  const avgPassenger = passengerTotal / Math.max(weightTotal, 1);
  const avgLoadRate = loadTotal / Math.max(weightTotal, 1);
  const passengerSignal = Math.min(100, avgPassenger / 80 * 100);
  const observedDemandHeat = passengerSignal * 0.6 + avgLoadRate * 0.4;
  const observationWeight = Math.min(0.42, 0.24 + freshSamples.length * 0.03);
  const dynamicHeat = modelHeat * (1 - observationWeight) + observedDemandHeat * observationWeight;

  return Math.round(Math.max(45, Math.min(99, dynamicHeat)) * 10) / 10;
}

// Trend buffer
const trendBuffer: Array<{ time: string; passengerFlow: number; topRoutes: Array<{ number: string; flow: number }> }> = [];

function captureTrendSnapshot() {
  const allStats = routes.map(r => simulateRouteStatistic(r));
  const totalFlow = allStats.reduce((s, r) => s + r.passengerFlow, 0);
  const top = allStats.sort((a, b) => b.passengerFlow - a.passengerFlow).slice(0, 3).map(r => ({ number: r.routeNumber, flow: r.passengerFlow }));
  trendBuffer.push({ time: new Date().toISOString(), passengerFlow: totalFlow, topRoutes: top });
  if (trendBuffer.length > 60) trendBuffer.shift();
}

// ====== Mock API 路由器 ======
let authToken = '';
const JWT_SECRET = 'mock-jwt-secret-browser';

function simpleJwtSign(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 }));
  return `${header}.${body}.mock`;
}

function simpleJwtVerify(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export interface MockResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  rawBody?: string;
}

export async function mockFetch(path: string, options?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<MockResponse> {
  const method = options?.method || 'GET';
  const headers = options?.headers || {};
  let body: Record<string, unknown> = {};
  try { if (options?.body) body = JSON.parse(options.body); } catch { /* ignore */ }

  const authHeader = headers['Authorization'] || headers['authorization'] || '';
  const isAuthed = authHeader.startsWith('Bearer ') ? !!simpleJwtVerify(authHeader.slice(7)) : false;

  const url = new URL(path, 'http://localhost');
  const pathname = url.pathname;

  function json(data: unknown, status = 200): MockResponse {
    return { status, body: { data }, headers: { 'Content-Type': 'application/json' } };
  }

  function raw(text: string, contentType: string): MockResponse {
    return { status: 200, body: text, headers: { 'Content-Type': contentType }, rawBody: text };
  }

  function error(msg: string, status = 400): MockResponse {
    return { status, body: { message: msg } };
  }

  // ─── Routes ───
  if (pathname === '/api/health') {
    return json({ status: 'ok', name: '昆明公交旅游路线可视化 API', dataMode: 'browser-mock' });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const { username, password } = body as { username?: string; password?: string };
    if (username === 'admin' && password === 'admin123') {
      const token = simpleJwtSign({ username, role: 'admin' });
      authToken = token;
      return json({ token, username });
    }
    return error('用户名或密码错误', 401);
  }

  if (pathname === '/api/auth/verify') {
    if (isAuthed) return json({ valid: true, username: 'admin' });
    return error('请先登录', 401);
  }

  if (pathname === '/api/routes') {
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
    const type = (url.searchParams.get('type') || '').toLowerCase();
    const spotId = Number(url.searchParams.get('spotId') || 0);
    const filtered = routes.filter(r => {
      if (keyword && ![r.number, r.name, r.start, r.end].some(f => f.toLowerCase().includes(keyword))) return false;
      if (type && r.type !== type) return false;
      if (spotId && !r.spotIds.includes(spotId)) return false;
      return true;
    }).map(attachRouteDetails);
    return json(filtered);
  }

  if (pathname.startsWith('/api/routes/')) {
    const id = Number(pathname.split('/').pop());
    const route = routes.find(r => r.id === id);
    if (!route) return error('线路不存在', 404);
    return json(attachRouteDetails(route));
  }

  if (pathname === '/api/stops') {
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
    const filtered = keyword ? stops.filter(s => s.name.includes(keyword) || s.district.includes(keyword)) : stops;
    return json(filtered);
  }

  if (pathname.startsWith('/api/stops/')) {
    const id = Number(pathname.split('/').pop());
    const stop = stops.find(s => s.id === id);
    if (!stop) return error('站点不存在', 404);
    const allRoutes = routes.map(attachRouteDetails);
    const associated = allRoutes.filter(r => r.stops.some((s: Stop & { sequence: number }) => s.id === stop.id))
      .map(r => ({ id: r.id, number: r.number, name: r.name, color: r.color, type: r.type }));
    const nearby = spots.filter(s => Math.abs(s.lng - stop.lng) < 0.04 && Math.abs(s.lat - stop.lat) < 0.04)
      .map(s => ({ id: s.id, name: s.name, category: s.category, district: s.district, heat: s.heat }));
    return json({ ...stop, routes: associated, nearbySpots: nearby });
  }

  if (pathname === '/api/spots') {
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
    const category = (url.searchParams.get('category') || '').toLowerCase();
    const now = new Date();
    const filtered = spots.filter(s => {
      if (keyword && !s.name.includes(keyword) && !s.district.includes(keyword)) return false;
      if (category && s.category !== category) return false;
      return true;
    }).map(s => {
      const jitter = 0.90 + seededRandom(s.id * 47 + now.getMinutes() + now.getSeconds() / 60) * 0.20;
      return { ...s, heat: Math.max(50, Math.min(99, Math.round(s.heat * jitter))) };
    });
    return json(filtered);
  }

  if (pathname === '/api/statistics/overview') {
    const routeStats = routes.map(r => simulateRouteStatistic(r));
    const passengerFlow = routeStats.reduce((s, r) => s + r.passengerFlow, 0);
    const avgPunctuality = routeStats.reduce((s, r) => s + r.punctuality, 0) / routeStats.length;
    const hotRoutes = routeStats.sort((a, b) => b.heat - a.heat).slice(0, 5);
    const districtStopCount: Record<string, number> = {};
    stops.forEach(s => { districtStopCount[s.district] = (districtStopCount[s.district] || 0) + 1; });
    return json({
      routeCount: routes.length, stopCount: stops.length, spotCount: spots.length,
      passengerFlow, avgPunctuality: Number(avgPunctuality.toFixed(1)),
      hotRoutes, districtStopCount,
      simulationModel: 'Gravity Model v2 (Zhao et al. 2024) — Browser Mock'
    });
  }

  if (pathname === '/api/statistics/routes') {
    return json(routes.map(r => simulateRouteStatistic(r)));
  }

  if (pathname === '/api/statistics/trend') {
    const minutes = Math.min(parseInt(url.searchParams.get('minutes') || '30'), 60);
    if (trendBuffer.length === 0) {
      // 首次填充
      for (let i = 0; i < 10; i++) {
        captureTrendSnapshot();
      }
    }
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const points = trendBuffer.filter(p => p.time >= cutoff);
    return json({ data: points, count: points.length, windowMinutes: minutes });
  }

  if (pathname === '/api/collection/samples') {
    if (method === 'POST') {
      const payload = body as { routeId?: number; speed?: number; passengerCount?: number; loadRate?: number; source?: string; collectedAt?: string };
      const route = routes.find(r => r.id === Number(payload.routeId)) || routes[0];
      const nextId = Math.max(0, ...collectionSamples.map(s => s.id)) + 1;
      const sample: CollectionSample = {
        id: nextId,
        routeId: route.id,
        collectedAt: payload.collectedAt || new Date().toISOString(),
        speed: payload.speed ?? Math.round(18 + Math.random() * 22),
        passengerCount: payload.passengerCount ?? Math.round(20 + Math.random() * 45),
        loadRate: payload.loadRate ?? Math.min(100, Math.round(Number(payload.passengerCount ?? 40) * 1.55)),
        source: payload.source || '模拟采集终端'
      };
      collectionSamples.push(sample);
      return json(sample, 201);
    }
    const routeId = Number(url.searchParams.get('routeId') || 0);
    const limit = Number(url.searchParams.get('limit') || 50);
    const filtered = collectionSamples
      .filter(s => !routeId || s.routeId === routeId)
      .sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime())
      .slice(-limit)
      .map(s => {
        const r = routes.find(item => item.id === s.routeId);
        return { ...s, routeNumber: r?.number, routeName: r?.name };
      });
    return json(filtered);
  }

  if (pathname === '/api/collection/samples/export') {
    const samples = collectionSamples.sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime());
    const header = 'id,线路ID,线路名称,速度(km/h),车内人数,满载率(%),数据来源,采集时间\n';
    const rows = samples.map(s => {
      const r = routes.find(item => item.id === s.routeId);
      return `${s.id},${s.routeId},${r?.number || ''},${s.speed},${s.passengerCount},${s.loadRate},${s.source || ''},${s.collectedAt || ''}`;
    }).join('\n');
    return raw('﻿' + header + rows, 'text/csv; charset=utf-8');
  }

  if (pathname === '/api/collection/summary') {
    const samples = collectionSamples.filter(() => true).slice(-200);
    const latest = samples[samples.length - 1] || null;
    const avgSpeed = samples.length > 0 ? samples.reduce((s, item) => s + item.speed, 0) / samples.length : 0;
    const avgLoadRate = samples.length > 0 ? samples.reduce((s, item) => s + item.loadRate, 0) / samples.length : 0;
    return json({
      sampleCount: samples.length,
      latest,
      avgSpeed: Number(avgSpeed.toFixed(1)),
      avgLoadRate: Number(avgLoadRate.toFixed(1)),
      onlineDevices: Math.min(routes.length, Math.max(4, new Set(samples.map(item => item.routeId)).size + 3))
    });
  }

  if (pathname === '/api/admin/routes' && method === 'POST') {
    if (!isAuthed) return error('请先登录', 401);
    const payload = body as Partial<RouteDef>;
    const nextId = Math.max(0, ...routes.map(r => r.id)) + 1;
    const route: RouteDef = {
      id: nextId, number: payload.number || '', name: payload.name || '',
      start: payload.start || '', end: payload.end || '',
      operationTime: payload.operationTime || '待补充', fare: payload.fare || '2元',
      type: payload.type || '常规公交', color: payload.color || '#5E6AD2',
      stopIds: Array.isArray(payload.stopIds) ? payload.stopIds.map(Number) : [],
      spotIds: Array.isArray(payload.spotIds) ? payload.spotIds.map(Number) : []
    };
    routes.push(route);
    return json(attachRouteDetails(route), 201);
  }

  if (pathname.startsWith('/api/admin/routes/')) {
    const id = Number(pathname.split('/').pop());
    if (method === 'PUT') {
      if (!isAuthed) return error('请先登录', 401);
      const idx = routes.findIndex(r => r.id === id);
      if (idx === -1) return error('线路不存在', 404);
      const payload = body as Partial<RouteDef>;
      routes[idx] = { ...routes[idx], ...payload, id };
      return json(attachRouteDetails(routes[idx]));
    }
    if (method === 'DELETE') {
      if (!isAuthed) return error('请先登录', 401);
      const idx = routes.findIndex(r => r.id === id);
      if (idx === -1) return error('线路不存在', 404);
      routes.splice(idx, 1);
      return { status: 204, body: null };
    }
  }

  if (pathname === '/api/admin/recalculate-heat' && method === 'POST') {
    if (!isAuthed) return error('请先登录', 401);
    const minuteSeed = new Date().getMinutes() + new Date().getSeconds() / 60;
    spots.forEach(s => {
      const jitter = 0.85 + seededRandom(s.id * 47 + minuteSeed + Math.random() * 10) * 0.30;
      s.heat = Math.max(50, Math.min(99, Math.round(s.heat * jitter)));
    });
    return json(spots.map(s => ({ id: s.id, name: s.name, heat: s.heat })));
  }

  return error('Not Found', 404);
}

// 启动趋势采集
const trendInterval = setInterval(captureTrendSnapshot, 30000);
captureTrendSnapshot();

// 暴露控制方法
export function mockLogin(token: string) { authToken = token; }
export function mockLogout() { authToken = ''; }
export function isMockMode() { return true; }
