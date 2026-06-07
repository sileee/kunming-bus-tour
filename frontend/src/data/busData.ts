// ===== Bus Route & Station Data (Leaflet [lat, lng] format) =====

export interface Stop {
  id: number; name: string; lat: number; lng: number;
  lineIds?: number[];
  nearbyScenic?: string;
  passengerFlow?: number;
  transfer?: boolean;
}

export interface BusRouteData {
  id: number; name: string; type: string; color: string;
  start: string; end: string;
  passengerFlow: number;
  path: [number, number][];
  stationIds: number[];
  operationTime?: string;
  fare?: string;
}

export const stations: Stop[] = [
  { id: 1, name: '昆明站', lng: 102.7229, lat: 25.0156, lineIds: [1, 2, 6], passengerFlow: 32000, transfer: true, nearbyScenic: '南屏街' },
  { id: 2, name: '东风广场', lng: 102.7217, lat: 25.0401, lineIds: [1, 4, 10], passengerFlow: 28500, nearbyScenic: '南屏街' },
  { id: 3, name: '南屏街东口', lng: 102.7148, lat: 25.0393, lineIds: [1, 3], passengerFlow: 31000, nearbyScenic: '南屏街' },
  { id: 4, name: '金马坊', lng: 102.7103, lat: 25.0345, lineIds: [1, 3, 4], passengerFlow: 24000, nearbyScenic: '金马碧鸡坊' },
  { id: 5, name: '小西门', lng: 102.7006, lat: 25.0428, lineIds: [1, 5], passengerFlow: 22000, nearbyScenic: '翠湖公园' },
  { id: 6, name: '翠湖东门', lng: 102.7071, lat: 25.0488, lineIds: [1, 5], passengerFlow: 19500, nearbyScenic: '翠湖公园' },
  { id: 7, name: '云南大学', lng: 102.704, lat: 25.0527, lineIds: [1, 5], passengerFlow: 18000, nearbyScenic: '云南大学' },
  { id: 8, name: '建设路', lng: 102.693, lat: 25.052, lineIds: [1], passengerFlow: 15000 },
  { id: 9, name: '黄土坡', lng: 102.662, lat: 25.058, lineIds: [1], passengerFlow: 12000 },
  { id: 10, name: '大观楼', lng: 102.6718, lat: 25.0338, lineIds: [6], passengerFlow: 16000, nearbyScenic: '大观公园' },
  { id: 11, name: '海埂公园', lng: 102.6689, lat: 24.9654, lineIds: [2, 3, 6, 9], passengerFlow: 25000, nearbyScenic: '海埂公园' },
  { id: 12, name: '云南民族村', lng: 102.6705, lat: 24.9705, lineIds: [2, 3, 4], passengerFlow: 22000, nearbyScenic: '云南民族村' },
  { id: 13, name: '滇池大坝', lng: 102.6565, lat: 24.966, lineIds: [2, 9], passengerFlow: 28000, nearbyScenic: '滇池大坝' },
  { id: 14, name: '高峣', lng: 102.638, lat: 24.971, lineIds: [9], passengerFlow: 8000, nearbyScenic: '西山风景区' },
  { id: 15, name: '世博园', lng: 102.7572, lat: 25.0712, lineIds: [4, 10], passengerFlow: 17000, nearbyScenic: '世博园' },
  { id: 16, name: '白龙寺', lng: 102.755, lat: 25.058, lineIds: [4, 10], passengerFlow: 12000 },
  { id: 17, name: '菊花村', lng: 102.737, lat: 25.022, lineIds: [10], passengerFlow: 14000 },
  { id: 18, name: '官渡古镇', lng: 102.7564, lat: 24.9567, lineIds: [8], passengerFlow: 19000, nearbyScenic: '官渡古镇' },
  { id: 19, name: '斗南花市', lng: 102.7968, lat: 24.9009, lineIds: [7, 8], passengerFlow: 21000, nearbyScenic: '斗南花市' },
  { id: 20, name: '昆明南站', lng: 102.861, lat: 24.873, lineIds: [7], passengerFlow: 35000, transfer: true },
  { id: 21, name: '圆通山', lng: 102.709, lat: 25.0525, lineIds: [5], passengerFlow: 13000, nearbyScenic: '翠湖公园' },
  { id: 22, name: '护国桥', lng: 102.719, lat: 25.041, lineIds: [3], passengerFlow: 18000, nearbyScenic: '南屏街' },
  { id: 23, name: '滇池路口', lng: 102.691, lat: 25.013, lineIds: [2, 3, 4, 6], passengerFlow: 16000, transfer: true },
  { id: 24, name: '大商汇', lng: 102.701, lat: 25.004, lineIds: [2, 6], passengerFlow: 11000 },
  { id: 25, name: '前兴路公交枢纽', lng: 102.707, lat: 24.989, lineIds: [2], passengerFlow: 9000, transfer: true },
  { id: 26, name: '云南省博物馆', lng: 102.759, lat: 24.956, lineIds: [8], passengerFlow: 14000, nearbyScenic: '官渡古镇' },
  { id: 27, name: '斗南地铁站', lng: 102.796, lat: 24.907, lineIds: [7, 8], passengerFlow: 17000, transfer: true },
  { id: 28, name: '呈贡广场', lng: 102.8, lat: 24.889, lineIds: [7], passengerFlow: 12000 },
];

// Path coordinates: Leaflet [lat, lng] format
function toLatLng(lng: number, lat: number): [number, number] { return [lat, lng]; }

export const busRoutes: BusRouteData[] = [
  {
    id: 1, name: '2路', type: '常规公交', color: '#2563eb',
    start: '昆明站', end: '黄土坡', passengerFlow: 32800,
    operationTime: '06:00-22:30', fare: '2元',
    stationIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    path: [[102.7229,25.0156],[102.7217,25.0401],[102.7148,25.0393],[102.7103,25.0345],[102.7006,25.0428],[102.7071,25.0488],[102.704,25.0527],[102.693,25.052],[102.662,25.058]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 2, name: '44路', type: '旅游接驳', color: '#0f766e',
    start: '昆明站', end: '海埂公园', passengerFlow: 45200,
    operationTime: '06:30-21:30', fare: '2元',
    stationIds: [1, 24, 25, 23, 12, 11, 13],
    path: [[102.7229,25.0156],[102.701,25.004],[102.707,24.989],[102.691,25.013],[102.6705,24.9705],[102.6689,24.9654],[102.6565,24.966]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 3, name: '73路', type: '旅游接驳', color: '#dc2626',
    start: '护国桥', end: '海埂公园', passengerFlow: 39800,
    operationTime: '06:20-22:00', fare: '2元',
    stationIds: [22, 3, 4, 23, 12, 11],
    path: [[102.719,25.041],[102.7148,25.0393],[102.7103,25.0345],[102.691,25.013],[102.6705,24.9705],[102.6689,24.9654]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 4, name: 'A1路', type: '旅游专线', color: '#7c3aed',
    start: '世博园', end: '云南民族村', passengerFlow: 36500,
    operationTime: '07:00-20:00', fare: '2元',
    stationIds: [15, 16, 2, 3, 4, 23, 12],
    path: [[102.7572,25.0712],[102.755,25.058],[102.7217,25.0401],[102.7148,25.0393],[102.7103,25.0345],[102.691,25.013],[102.6705,24.9705]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 5, name: '100路', type: '常规公交', color: '#ea580c',
    start: '小西门', end: '圆通山', passengerFlow: 28600,
    operationTime: '06:30-21:00', fare: '2元',
    stationIds: [5, 6, 7, 21, 2],
    path: [[102.7006,25.0428],[102.7071,25.0488],[102.704,25.0527],[102.709,25.0525],[102.7217,25.0401]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 6, name: '24路', type: '常规公交', color: '#0891b2',
    start: '昆明站', end: '海埂公园', passengerFlow: 33400,
    operationTime: '06:00-21:30', fare: '2元',
    stationIds: [1, 24, 10, 23, 12, 11],
    path: [[102.7229,25.0156],[102.701,25.004],[102.6718,25.0338],[102.691,25.013],[102.6705,24.9705],[102.6689,24.9654]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 7, name: 'K31路', type: '快线接驳', color: '#16a34a',
    start: '昆明南站', end: '斗南花市', passengerFlow: 24700,
    operationTime: '07:00-20:30', fare: '2元',
    stationIds: [20, 28, 27, 19],
    path: [[102.861,24.873],[102.8,24.889],[102.796,24.907],[102.7968,24.9009]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 8, name: '253路', type: '片区接驳', color: '#be123c',
    start: '官渡古镇', end: '斗南花市', passengerFlow: 21800,
    operationTime: '06:40-20:30', fare: '2元',
    stationIds: [18, 26, 27, 19],
    path: [[102.7564,24.9567],[102.759,24.956],[102.796,24.907],[102.7968,24.9009]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 9, name: '94路', type: '景区接驳', color: '#4d7c0f',
    start: '海埂公园', end: '高峣', passengerFlow: 19600,
    operationTime: '07:00-19:30', fare: '2元',
    stationIds: [11, 13, 14],
    path: [[102.6689,24.9654],[102.6675,24.9675],[102.664,24.9672],[102.6605,24.9665],[102.6565,24.966],[102.6535,24.9668],[102.649,24.9685],[102.6445,24.97],[102.641,24.9708],[102.638,24.971]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
  {
    id: 10, name: '47路', type: '常规公交', color: '#9333ea',
    start: '菊花村', end: '世博园', passengerFlow: 22600,
    operationTime: '06:30-21:00', fare: '2元',
    stationIds: [17, 2, 16, 15],
    path: [[102.737,25.022],[102.7217,25.0401],[102.755,25.058],[102.7572,25.0712]].map(p => toLatLng(p[0], p[1])) as [number, number][]
  },
];

export const routeTypes = [
  { type: '常规公交', value: 4, color: '#2563eb' },
  { type: '旅游专线', value: 2, color: '#7c3aed' },
  { type: '旅游接驳', value: 2, color: '#0f766e' },
  { type: '快线接驳', value: 1, color: '#16a34a' },
  { type: '片区接驳', value: 1, color: '#be123c' },
  { type: '景区接驳', value: 2, color: '#4d7c0f' },
];

// Time-series flow data — realistic hourly pattern based on transit operating hours
// Follows the same hour-factor logic as the Gravity Model v2 simulation
// Source: Ren et al. (2025, TRR) transit flow temporal patterns
function hourFlowMultiplier(hour: number): number {
  if (hour >= 6 && hour < 9)   return 1.38;  // 早高峰
  if (hour >= 9 && hour < 12)  return 0.82;  // 午前平峰
  if (hour >= 12 && hour < 14) return 0.70;  // 午间低谷
  if (hour >= 14 && hour < 17) return 0.88;  // 午后平峰
  if (hour >= 17 && hour < 20) return 1.26;  // 晚高峰
  if (hour >= 20 && hour < 22) return 0.45;  // 晚间稀疏
  if (hour >= 5 && hour < 6)   return 0.35;  // 清晨首班
  return 0.0;  // 22:00-05:00 公交停运
}

export const timeFlowData = Array.from({ length: 24 }, (_, hour) => {
  const mult = hourFlowMultiplier(hour);
  // Base daily flow ~150,000 across 10 routes on weekdays
  // Average hourly flow ≈ daily / 16 operating hours ≈ 9,375
  // Apply realistic peak multiplier + small noise
  const baseHourlyFlow = 9400;
  const flow = mult > 0
    ? Math.round(baseHourlyFlow * mult * (0.94 + Math.random() * 0.12))
    : 0;
  return {
    time: `${String(hour).padStart(2, '0')}:00`,
    flow
  };
});

// Route flow ranking
export const routeFlowRank = busRoutes
  .map(r => ({ id: r.id, name: r.name, flow: r.passengerFlow }))
  .sort((a, b) => b.flow - a.flow);

// Hot stations (top 10 by passenger flow)
export const hotStations = stations
  .filter(s => s.passengerFlow)
  .sort((a, b) => (b.passengerFlow || 0) - (a.passengerFlow || 0))
  .slice(0, 10)
  .map(s => ({ id: s.id, name: s.name, flow: s.passengerFlow || 0 }));
