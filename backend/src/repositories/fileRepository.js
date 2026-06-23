const { routes, stops, spots, attachRouteDetails } = require('../data/kunmingTransitData');

const state = {
  routes: routes.map((route) => ({ ...route })),
  stops: stops.map((stop) => ({ ...stop })),
  spots: spots.map((spot) => ({ ...spot })),
  collectionSamples: [
    { id: 1, routeId: 2, collectedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), speed: 28, passengerCount: 51, loadRate: 78, source: '车载客流传感器' },
    { id: 2, routeId: 3, collectedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(), speed: 24, passengerCount: 47, loadRate: 73, source: 'GPS轨迹终端' },
    { id: 3, routeId: 4, collectedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(), speed: 31, passengerCount: 42, loadRate: 69, source: '移动端上报' },
    { id: 4, routeId: 1, collectedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), speed: 26, passengerCount: 39, loadRate: 64, source: '电子站牌' }
  ]
};

// Samples bundled with the demo establish the initial dashboard state. Only
// samples collected after startup are accumulated into today's live flow.
const collectionBaselineId = Math.max(0, ...state.collectionSamples.map((sample) => sample.id));

/* ================================================================
   Kunming Tourist Bus Passenger Flow Simulation Model v2
   Based on: Zhao et al. (2024, Sustainability) — Gravity Model
             Yang et al. (2023, JTR) — Distance Moderation Effects
             Rong et al. (2023) — Intervening Opportunities
             Zhou et al. (2025) — Holiday flow multipliers
             Ren et al. (2025, TRR) — Tourist-city holiday prediction
   ================================================================ */

// ─── District population / employment mass (Kunming 2023 stats, normalized) ───
const districtMass = {
  '五华区': { population: 1.14, employment: 0.92, composite: 2.06 },
  '盘龙区': { population: 1.00, employment: 0.88, composite: 1.88 },
  '官渡区': { population: 1.08, employment: 0.96, composite: 2.04 },
  '西山区': { population: 0.89, employment: 0.72, composite: 1.61 },
  '呈贡区': { population: 0.65, employment: 0.58, composite: 1.23 }
};

// ─── Monthly tourism seasonality index (Kunming, from Yunnan Tourism Bureau) ───
function monthSeasonality(month) {
  const index = {
    1: 0.62, 2: 0.78, 3: 0.88, 4: 0.95,
    5: 1.02, 6: 1.05, 7: 1.30, 8: 1.35,
    9: 1.05, 10: 1.40, 11: 0.90, 12: 0.72
  };
  return index[month] || 1.0;
}

// ─── Chinese holiday calendar (2026) ───
function holidayBoost(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dow = date.getDay();

  // Spring Festival (2026-02-17 ± 3 days)
  if (m === 2 && d >= 14 && d <= 20) return 1.48;
  // Qingming (early April)
  if (m === 4 && d >= 3 && d <= 7) return 1.25;
  // Labor Day (May 1-5)
  if (m === 5 && d >= 1 && d <= 5) return 1.42;
  // Dragon Boat (late May / early June)
  if ((m === 5 && d >= 28) || (m === 6 && d <= 2)) return 1.22;
  // Summer holiday boost (July-August)
  if (m === 7 || m === 8) return 1.18;
  // Mid-Autumn + National Day (late Sep - Oct 7)
  if ((m === 9 && d >= 28) || (m === 10 && d <= 8)) return 1.50;
  // Weekend (non-holiday)
  if (dow === 0 || dow === 6) return 1.24;
  return 1.0;
}

// ─── Hour-of-day time factor (from Ren et al., 2025 transit flow patterns) ───
function hourFactor(hour) {
  if (hour >= 6 && hour < 9)   return { peak: 1.38, desc: '早高峰' };
  if (hour >= 9 && hour < 12)  return { peak: 0.82, desc: '午前平峰' };
  if (hour >= 12 && hour < 14) return { peak: 0.70, desc: '午间低谷' };
  if (hour >= 14 && hour < 17) return { peak: 0.88, desc: '午后平峰' };
  if (hour >= 17 && hour < 20) return { peak: 1.26, desc: '晚高峰' };
  if (hour >= 20 && hour < 22) return { peak: 0.45, desc: '夜间' };
  if (hour >= 5 && hour < 6)   return { peak: 0.38, desc: '清晨' };
  return { peak: 0.10, desc: '深夜' };
}

// ─── Deterministic pseudo-random (seeded, reproducible) ───
function seededRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// ─── Truncated normal (Box-Muller, bounded to ±2σ) ───
function truncatedNormal(seed, mean = 0, std = 1) {
  const u1 = seededRandom(seed);
  const u2 = seededRandom(seed + 0.618);
  let z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
  z = Math.max(-2, Math.min(2, z));
  return mean + z * std;
}

/* ---------- Distance Decay Function ----------
   From Yang et al. (2023, JTR): every 100km → ~5.56% decrease in tourist flow.
   At the intra-city scale (km), decay exponent γ ≈ 1.0–1.5.
   Tourist routes have higher γ (more sensitive to distance).
   Commuter routes have lower γ (less sensitive). ---------- */
function distanceDecay(distanceKm, isTouristRoute) {
  const gamma = isTouristRoute ? 1.25 : 0.85;
  return Math.pow(Math.max(distanceKm, 0.3), -gamma);
}

/* ---------- Destination Attractiveness Composite ----------
   From Zhao et al. (2024): composite index with weights for
   heat (popularity), rating (quality), and connectivity. ---------- */
function spotAttractiveness(spot, routeCount) {
  const heatNorm = (spot.heat || 50) / 100;
  const ratingNorm = (spot.rating || 4.0) / 5.0;
  const connectivityNorm = Math.log(1 + routeCount) / Math.log(11); // capped at 10 routes
  return Math.pow(heatNorm, 0.40) * Math.pow(ratingNorm, 0.35) * Math.pow(connectivityNorm, 0.25);
}

/* ---------- Spatial Competition (Intervening Opportunities) ----------
   From Rong et al. (2023): nearby attractions compete for the same tourist pool.
   More nearby spots → more competition → lower per-spot flow. ---------- */
function competitionFactor(spot, allSpots) {
  const nearby = allSpots.filter(s => {
    if (s.id === spot.id) return false;
    const dLng = (s.lng - spot.lng) * 102000;
    const dLat = (s.lat - spot.lat) * 111000;
    return Math.sqrt(dLng * dLng + dLat * dLat) < 4000; // 4km radius
  }).length;
  return 1 / (1 + nearby * 0.12);
}

/* ---------- Route Origin-Destination Gravity Flow ----------
   Calculates the gravity-model flow between each consecutive OD pair
   on a route, then sums to get total route flow. ---------- */
function computeGravityFlow(route, routeStops, routeSpots, date) {
  if (routeStops.length < 2) return 0;

  const isTourist = String(route.type).includes('旅游') || String(route.type).includes('景区');
  const month = date.getMonth() + 1;
  const hour = date.getHours();

  // Count how many routes pass through each spot (connectivity)
  const spotRouteCount = {};
  state.routes.forEach(r => {
    (r.spotIds || []).forEach(sid => {
      spotRouteCount[sid] = (spotRouteCount[sid] || 0) + 1;
    });
  });

  // Build stop → district mass lookup
  const stopMass = {};
  routeStops.forEach(s => {
    const dm = districtMass[s.district] || { composite: 1.0 };
    stopMass[s.id] = dm.composite;
  });

  let totalFlow = 0;
  const stopCount = routeStops.length;

  // Gravity model: sum over all stop pairs (i → j, i < j)
  for (let i = 0; i < stopCount; i++) {
    for (let j = i + 1; j < stopCount; j++) {
      const si = routeStops[i];
      const sj = routeStops[j];

      // Spatial distance between stops (km)
      const dLng = (sj.lng - si.lng) * 102000;
      const dLat = (sj.lat - si.lat) * 111000;
      const distKm = Math.sqrt(dLng * dLng + dLat * dLat) / 1000;

      // Origin mass: district composite
      const M_i = stopMass[si.id] || 1.0;

      // Destination mass: weighted by nearby spots
      let M_j = (stopMass[sj.id] || 1.0);
      // Boost destination if it has attached scenic spots
      const nearbySpots = routeSpots.filter(sp => {
        const sdLng = (sp.lng - sj.lng) * 102000;
        const sdLat = (sp.lat - sj.lat) * 111000;
        return Math.sqrt(sdLng * sdLng + sdLat * sdLat) < 2000; // 2km from stop
      });
      if (nearbySpots.length > 0) {
        const spotAtt = nearbySpots.reduce((sum, sp) => {
          return sum + spotAttractiveness(sp, spotRouteCount[sp.id] || 1);
        }, 0) / nearbySpots.length;
        M_j += spotAtt * 2.5;
      }

      // Distance decay
      const decay = distanceDecay(distKm, isTourist);

      // OD pair flow
      const odFlow = M_i * M_j * decay;
      totalFlow += odFlow;
    }
  }

  // Scale to realistic passenger volume
  // Calibrated so that a typical 7-stop tourist route → ~35,000–45,000 daily flow
  const gravityScale = 380;
  totalFlow *= gravityScale;

  // Route type factor (from Ren et al., 2025 — tourist routes carry more)
  const typeFactorMap = {
    '旅游专线': 1.35,
    '旅游接驳': 1.18,
    '景区接驳': 1.16,
    '快线接驳': 1.10,
    '常规公交': 0.95,
    '片区接驳': 1.00
  };
  const typeMult = typeFactorMap[route.type] || 1.0;
  totalFlow *= typeMult;

  // Seasonal & temporal modulation
  const seasonal = monthSeasonality(month);
  const holiday = holidayBoost(date);
  const hourF = hourFactor(hour).peak;

  totalFlow *= seasonal * holiday * hourF;

  // Spatial competition dampening (average across all spots on route)
  if (routeSpots.length > 0) {
    const avgCompetition = routeSpots.reduce((sum, sp) => {
      return sum + competitionFactor(sp, state.spots);
    }, 0) / routeSpots.length;
    totalFlow *= (0.85 + 0.15 * avgCompetition);
  }

  // Stochastic perturbation (truncated normal, ±2σ → ~±15% max)
  const noise = truncatedNormal(
    route.id * 37 + date.getDate() + month * 13 + hour * 7,
    1.0,
    0.06
  );
  totalFlow *= noise;

  return Math.round(totalFlow);
}

/* ---------- Real-time collection accumulation ----------
   Adds newly reported passengers to the stable model baseline. ---------- */
function collectionModeration(routeId, modelFlow) {
  const livePassengerIncrement = state.collectionSamples
    .filter((sample) => sample.routeId === routeId && sample.id > collectionBaselineId)
    .reduce((sum, sample) => sum + Number(sample.passengerCount || 0), 0);
  return Math.round(modelFlow + livePassengerIncrement);
}

function dynamicHeatFromFreshSamples(modelHeat, routeId, now = new Date()) {
  const windowMs = 10 * 60 * 1000;
  const freshSamples = state.collectionSamples
    .filter((sample) => sample.routeId === routeId && sample.id > collectionBaselineId)
    .filter((sample) => now.getTime() - new Date(sample.collectedAt).getTime() <= windowMs)
    .slice(-12);

  if (!freshSamples.length) return Math.round(modelHeat);

  let weightTotal = 0;
  let passengerTotal = 0;
  let loadTotal = 0;
  freshSamples.forEach((sample) => {
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

/* ---------- Route Statistics Simulation ----------
   Produces passengerFlow, congestion, punctuality, heat for a route. ---------- */
function simulateRouteStatistic(route, date = new Date()) {
  const routeStops = route.stopIds
    .map(sid => state.stops.find(s => s.id === sid))
    .filter(Boolean);
  const routeSpots = route.spotIds
    .map(sid => state.spots.find(s => s.id === sid))
    .filter(Boolean);

  // Compute gravity-based passenger flow
  let passengerFlow = computeGravityFlow(route, routeStops, routeSpots, date);

  // Moderate with real collection data
  passengerFlow = collectionModeration(route.id, passengerFlow);

  // Average spot heat for reference
  const avgSpotHeat = routeSpots.length > 0
    ? routeSpots.reduce((s, sp) => s + sp.heat, 0) / routeSpots.length
    : 55;

  // Congestion: sigmoid of load factor — widely spread 35~92
  const vehicleTrips = Math.max(24, 48 + routeStops.length * 2.0);
  const dailyCapacity = vehicleTrips * 80;
  const loadFactor = passengerFlow / Math.max(dailyCapacity, 1);
  const sigmoid = (x) => 1 / (1 + Math.exp(-3.5 * (x - 0.5)));
  const modelCongestion = Math.round(
    34 + sigmoid(loadFactor) * 54 + truncatedNormal(route.id * 23 + date.getHours(), 0, 2.0)
  );
  const recentSamples = state.collectionSamples.filter(s => s.routeId === route.id).slice(-12);
  const avgLoadRate = recentSamples.length
    ? recentSamples.reduce((sum, sample) => sum + Number(sample.loadRate || 0), 0) / recentSamples.length
    : modelCongestion;
  const avgSpeed = recentSamples.length
    ? recentSamples.reduce((sum, sample) => sum + Number(sample.speed || 0), 0) / recentSamples.length
    : 27;
  const clampedCongestion = Math.round(
    Math.max(34, Math.min(92, modelCongestion * 0.65 + avgLoadRate * 0.35)) * 10
  ) / 10;

  // Punctuality: inversely related to congestion + road conditions (district-dependent)
  const districts = [...new Set(routeStops.map(s => s.district))];
  const avgDistrictMass = districts.reduce((s, d) => s + (districtMass[d]?.employment || 0.7), 0) / Math.max(districts.length, 1);
  const basePunctuality = 93.5 - clampedCongestion * 0.06 - avgDistrictMass * 2.5
    - Math.max(0, avgLoadRate - 70) * 0.025
    + (avgSpeed - 27) * 0.035;
  const noise = truncatedNormal(route.id * 13 + date.getMinutes(), 0, 1.2);
  const punctuality = Math.round(Math.max(82, Math.min(97, basePunctuality + noise)) * 10) / 10;

  // Heat: blend of spot popularity (55%) + passenger flow intensity (45%)
  const flowHeat = Math.log10(Math.max(passengerFlow, 1000)) * 14 - 24;
  const modelHeat = Math.max(52, Math.min(99, avgSpotHeat * 0.55 + flowHeat * 0.45));
  const heat = dynamicHeatFromFreshSamples(modelHeat, route.id, date);

  return {
    id: route.id,
    routeId: route.id,
    date: date.toISOString().slice(0, 10),
    passengerFlow,
    punctuality,
    congestion: clampedCongestion,
    heat,
    routeNumber: route.number,
    routeName: route.name,
    type: route.type
  };
}

/* ---------- API Functions (unchanged signatures) ---------- */

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function listRoutes(filters = {}) {
  const keyword = normalize(filters.keyword);
  const type = normalize(filters.type);
  const spotId = Number(filters.spotId || 0);

  return state.routes
    .filter((route) => {
      const keywordMatched = !keyword || [route.number, route.name, route.start, route.end].some((field) => normalize(field).includes(keyword));
      const typeMatched = !type || normalize(route.type) === type;
      const spotMatched = !spotId || route.spotIds.includes(spotId);
      return keywordMatched && typeMatched && spotMatched;
    })
    .map((route) => ({
      ...attachRouteDetails(route),
      statistics: simulateRouteStatistic(route)
    }));
}

function getRouteById(id) {
  const route = state.routes.find((item) => item.id === Number(id));
  return route ? { ...attachRouteDetails(route), statistics: simulateRouteStatistic(route) } : null;
}

function getStopById(id) {
  return state.stops.find((stop) => stop.id === Number(id)) || null;
}

function listStops(filters = {}) {
  const keyword = normalize(filters.keyword);
  return state.stops.filter((stop) => !keyword || normalize(stop.name).includes(keyword) || normalize(stop.district).includes(keyword));
}

function listSpots(filters = {}) {
  const keyword = normalize(filters.keyword);
  const category = normalize(filters.category);
  const now = new Date();
  const minuteSeed = now.getMinutes() + now.getSeconds() / 60;
  return state.spots
    .filter((spot) => {
      const keywordMatched = !keyword || normalize(spot.name).includes(keyword) || normalize(spot.district).includes(keyword);
      const categoryMatched = !category || normalize(spot.category) === category;
      return keywordMatched && categoryMatched;
    })
    .map((spot) => {
      const jitter = 0.90 + seededRandom(spot.id * 47 + minuteSeed) * 0.20;
      const dynamicHeat = Math.max(50, Math.min(99, Math.round(spot.heat * jitter)));
      return { ...spot, heat: dynamicHeat };
    });
}

function recalculateSpotHeat() {
  const minuteSeed = new Date().getMinutes() + new Date().getSeconds() / 60;
  state.spots.forEach((spot) => {
    const jitter = 0.85 + seededRandom(spot.id * 47 + minuteSeed + Math.random() * 10) * 0.30;
    spot.heat = Math.max(50, Math.min(99, Math.round(spot.heat * jitter)));
  });
  return state.spots.map((s) => ({ id: s.id, name: s.name, heat: s.heat }));
}

function getRouteStatistics() {
  return state.routes.map((route) => simulateRouteStatistic(route));
}

function getOverview() {
  const routeStats = getRouteStatistics();
  const passengerFlow = routeStats.reduce((sum, item) => sum + item.passengerFlow, 0);
  const avgPunctuality = routeStats.reduce((sum, item) => sum + item.punctuality, 0) / routeStats.length;
  const hotRoutes = routeStats.slice().sort((a, b) => b.heat - a.heat).slice(0, 5);
  const districtStopCount = state.stops.reduce((acc, stop) => {
    acc[stop.district] = (acc[stop.district] || 0) + 1;
    return acc;
  }, {});

  return {
    routeCount: state.routes.length,
    stopCount: state.stops.length,
    spotCount: state.spots.length,
    passengerFlow,
    avgPunctuality: Number(avgPunctuality.toFixed(1)),
    hotRoutes,
    districtStopCount,
    simulationModel: 'Gravity Model v2 (Zhao et al. 2024) × Intervening Opportunities (Rong et al. 2023) × Holiday Boost (Zhou et al. 2025)'
  };
}

function listCollectionSamples(filters = {}) {
  const routeId = Number(filters.routeId || 0);
  const limit = Number(filters.limit || 50);
  return state.collectionSamples
    .filter((sample) => !routeId || sample.routeId === routeId)
    .slice()
    .sort((a, b) => new Date(a.collectedAt) - new Date(b.collectedAt))
    .slice(-limit)
    .map((sample) => {
      const route = state.routes.find((item) => item.id === sample.routeId);
      return { ...sample, routeNumber: route?.number, routeName: route?.name };
    });
}

function createCollectionSample(payload) {
  const route = state.routes.find((item) => item.id === Number(payload.routeId)) || state.routes[0];
  const nextId = Math.max(0, ...state.collectionSamples.map((sample) => sample.id)) + 1;
  const passengerCount = Number(payload.passengerCount ?? Math.round(20 + Math.random() * 45));
  const speed = Number(payload.speed ?? Math.round(18 + Math.random() * 22));
  const loadRate = Number(payload.loadRate ?? Math.min(100, Math.round(passengerCount * 1.55)));
  const sample = {
    id: nextId,
    routeId: route.id,
    collectedAt: payload.collectedAt || new Date().toISOString(),
    speed,
    passengerCount,
    loadRate,
    source: payload.source || '模拟采集终端'
  };
  state.collectionSamples.push(sample);
  return listCollectionSamples({ routeId: sample.routeId, limit: 1 })[0];
}

function getCollectionSummary() {
  const samples = listCollectionSamples({ limit: 200 });
  const latest = samples[samples.length - 1] || null;
  const avgSpeed = samples.reduce((sum, item) => sum + item.speed, 0) / Math.max(samples.length, 1);
  const avgLoadRate = samples.reduce((sum, item) => sum + item.loadRate, 0) / Math.max(samples.length, 1);
  return {
    sampleCount: samples.length,
    latest,
    avgSpeed: Number(avgSpeed.toFixed(1)),
    avgLoadRate: Number(avgLoadRate.toFixed(1)),
    onlineDevices: Math.min(state.routes.length, Math.max(4, new Set(samples.map((item) => item.routeId)).size + 3))
  };
}

function createRoute(payload) {
  const nextId = Math.max(0, ...state.routes.map((route) => route.id)) + 1;
  const route = {
    id: nextId,
    number: payload.number,
    name: payload.name,
    start: payload.start,
    end: payload.end,
    operationTime: payload.operationTime || '待补充',
    fare: payload.fare || '2元',
    type: payload.type || '常规公交',
    color: payload.color || '#5E6AD2',
    stopIds: Array.isArray(payload.stopIds) ? payload.stopIds.map(Number) : [],
    spotIds: Array.isArray(payload.spotIds) ? payload.spotIds.map(Number) : []
  };
  state.routes.push(route);
  return { ...attachRouteDetails(route), statistics: simulateRouteStatistic(route) };
}

function updateRoute(id, payload) {
  const index = state.routes.findIndex((route) => route.id === Number(id));
  if (index === -1) return null;
  state.routes[index] = { ...state.routes[index], ...payload, id: Number(id) };
  return { ...attachRouteDetails(state.routes[index]), statistics: simulateRouteStatistic(state.routes[index]) };
}

function deleteRoute(id) {
  const index = state.routes.findIndex((route) => route.id === Number(id));
  if (index === -1) return false;
  state.routes.splice(index, 1);
  return true;
}

module.exports = {
  listRoutes,
  getRouteById,
  getStopById,
  listStops,
  listSpots,
  getRouteStatistics,
  getOverview,
  listCollectionSamples,
  createCollectionSample,
  getCollectionSummary,
  createRoute,
  updateRoute,
  deleteRoute,
  recalculateSpotHeat
};
