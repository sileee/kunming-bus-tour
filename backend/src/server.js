require('dotenv').config();

const cors = require('cors');
const express = require('express');
const { getRepository } = require('./repositories');
const { authRequired, generateToken } = require('./authMiddleware');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

// ─── Production: serve built frontend ────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  // SPA fallback: non-API, non-file request → index.html (or tourist.html)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function repository() {
  return getRepository();
}

function validateCollectionPayload(payload) {
  const routeId = Number(payload.routeId);
  const speed = Number(payload.speed);
  const passengerCount = Number(payload.passengerCount);
  const loadRate = Number(payload.loadRate);
  const collectedAt = payload.collectedAt ? new Date(payload.collectedAt) : undefined;

  if (!Number.isInteger(routeId) || routeId <= 0) {
    return { error: 'routeId 必须为有效线路 ID' };
  }
  if (!Number.isFinite(speed) || speed < 0) {
    return { error: 'speed 必须为不小于 0 的数字' };
  }
  if (!Number.isInteger(passengerCount) || passengerCount < 0) {
    return { error: 'passengerCount 必须为不小于 0 的整数' };
  }
  if (!Number.isInteger(loadRate) || loadRate < 0 || loadRate > 100) {
    return { error: 'loadRate 必须为 0 到 100 的整数' };
  }
  if (payload.collectedAt && Number.isNaN(collectedAt.getTime())) {
    return { error: 'collectedAt 必须为有效时间' };
  }

  return {
    value: {
      routeId,
      speed,
      passengerCount,
      loadRate,
      collectedAt: collectedAt ? collectedAt.toISOString() : undefined,
      source: String(payload.source || '模拟采集终端').slice(0, 64)
    }
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: '昆明公交旅游路线可视化 API',
    dataMode: process.env.DATA_MODE || 'file'
  });
});

app.post('/api/auth/login', asyncHandler(async function(req, res) {
  const { username, password } = req.body || {};

  if (process.env.DATA_MODE === 'mysql') {
    try {
      const mysql = require('mysql2/promise');
      const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'kunming_bus_tour'
      });
      const result = await pool.query(
        'SELECT id, username, password, role FROM admin_users WHERE username = ? AND password = ?',
        [username, password]
      );
      await pool.end();
      const row = result[0][0];
      if (row) {
        var token = generateToken({ username: row.username, role: row.role });
        return res.json({ data: { token: token, username: row.username } });
      }
    } catch (e) {
      // Fall through to .env check if DB query fails
    }
  }

  var adminUser = process.env.ADMIN_USER || 'admin';
  var adminPass = process.env.ADMIN_PASS || 'admin123';
  if (username === adminUser && password === adminPass) {
    var token = generateToken({ username: username, role: 'admin' });
    return res.json({ data: { token: token, username: username } });
  }
  res.status(401).json({ message: '用户名或密码错误' });
}));

app.get('/api/auth/verify', authRequired, (req, res) => {
  res.json({ data: { valid: true, username: req.user.username } });
});

app.get('/api/routes', asyncHandler(async (req, res) => {
  const routes = await repository().listRoutes(req.query);
  res.json({ data: routes });
}));

app.get('/api/routes/:id', asyncHandler(async (req, res) => {
  const route = await repository().getRouteById(req.params.id);
  if (!route) {
    res.status(404).json({ message: '线路不存在' });
    return;
  }
  res.json({ data: route });
}));

app.get('/api/stops', asyncHandler(async (req, res) => {
  const stops = await repository().listStops(req.query);
  res.json({ data: stops });
}));

app.get('/api/spots', asyncHandler(async (req, res) => {
  const spots = await repository().listSpots(req.query);
  res.json({ data: spots });
}));

// Stop detail with associated routes & nearby spots
app.get('/api/stops/:id', asyncHandler(async (req, res) => {
  const repo = repository();
  const stop = await repo.getStopById(req.params.id);
  if (!stop) {
    res.status(404).json({ message: '站点不存在' });
    return;
  }
  // Attach routes that pass through this stop
  const allRoutes = await repo.listRoutes();
  const associatedRoutes = allRoutes
    .filter((r) => r.stops.some((s) => s.id === stop.id))
    .map((r) => ({ id: r.id, number: r.number, name: r.name, color: r.color, type: r.type }));
  // Nearby spots (within ~3km)
  const allSpots = await repo.listSpots();
  const nearbySpots = allSpots
    .filter((s) => Math.abs(s.lng - stop.lng) < 0.04 && Math.abs(s.lat - stop.lat) < 0.04)
    .map((s) => ({ id: s.id, name: s.name, category: s.category, district: s.district, heat: s.heat }));
  res.json({ data: { ...stop, routes: associatedRoutes, nearbySpots } });
}));

// Export collection samples as CSV
app.get('/api/collection/samples/export', asyncHandler(async (req, res) => {
  const samples = await repository().listCollectionSamples({ limit: 9999 });
  const header = 'id,线路ID,线路名称,速度(km/h),车内人数,满载率(%),数据来源,采集时间\n';
  const rows = samples.map((s) =>
    `${s.id},${s.routeId},${s.routeNumber || ''},${s.speed},${s.passengerCount},${s.loadRate},${s.source || ''},${s.collectedAt || ''}`
  ).join('\n');
  // BOM for Chinese Excel compatibility
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=collection_samples.csv');
  res.write('﻿');
  res.end(header + rows);
}));

// Statistics trend snapshots (in-memory circular buffer, last 30 minutes)
const trendBuffer = [];
const MAX_TREND_POINTS = 60;

async function captureTrendSnapshot() {
  const repo = repository();
  if (!repo.getOverview || !repo.getRouteStatistics) return;
  try {
    const overview = await repo.getOverview();
    const routes = await repo.getRouteStatistics();
    trendBuffer.push({
      time: new Date().toISOString(),
      passengerFlow: overview.passengerFlow,
      topRoutes: routes.slice().sort((a, b) => b.passengerFlow - a.passengerFlow).slice(0, 3).map((r) => ({ number: r.routeNumber, flow: r.passengerFlow }))
    });
    if (trendBuffer.length > MAX_TREND_POINTS) trendBuffer.shift();
  } catch { /* skip if repo doesn't support stats yet */ }
}

app.get('/api/statistics/trend', asyncHandler(async (req, res) => {
  const minutes = Math.min(parseInt(req.query.minutes) || 30, 60);
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const points = trendBuffer.filter((p) => p.time >= cutoff);
  res.json({ data: points, count: points.length, windowMinutes: minutes });
}));

app.get('/api/statistics/overview', asyncHandler(async (req, res) => {
  const overview = await repository().getOverview();
  res.json({ data: overview });
}));

app.get('/api/statistics/routes', asyncHandler(async (req, res) => {
  const statistics = await repository().getRouteStatistics();
  res.json({ data: statistics });
}));

app.get('/api/collection/samples', asyncHandler(async (req, res) => {
  const samples = await repository().listCollectionSamples(req.query);
  res.json({ data: samples });
}));

app.post('/api/collection/samples', asyncHandler(async (req, res) => {
  const validation = validateCollectionPayload(req.body);
  if (validation.error) {
    res.status(400).json({ message: validation.error });
    return;
  }
  const sample = await repository().createCollectionSample(validation.value);
  res.status(201).json({ data: sample });
}));

app.get('/api/collection/summary', asyncHandler(async (req, res) => {
  const summary = await repository().getCollectionSummary();
  res.json({ data: summary });
}));

app.post('/api/admin/routes', authRequired, asyncHandler(async (req, res) => {
  const route = await repository().createRoute(req.body);
  res.status(201).json({ data: route });
}));

app.put('/api/admin/routes/:id', authRequired, asyncHandler(async (req, res) => {
  const route = await repository().updateRoute(req.params.id, req.body);
  if (!route) {
    res.status(404).json({ message: '线路不存在' });
    return;
  }
  res.json({ data: route });
}));

app.delete('/api/admin/routes/:id', authRequired, asyncHandler(async (req, res) => {
  const deleted = await repository().deleteRoute(req.params.id);
  if (!deleted) {
    res.status(404).json({ message: '线路不存在' });
    return;
  }
  res.status(204).send();
}));

// Manual spot heat recalculation
app.post('/api/admin/recalculate-heat', authRequired, asyncHandler(async (req, res) => {
  const repo = repository();
  if (!repo.recalculateSpotHeat) {
    res.status(501).json({ message: '当前数据模式不支持手动刷新热度' });
    return;
  }
  const result = await repo.recalculateSpotHeat();
  res.json({ data: result, message: '景点热度已重新计算' });
}));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: '服务端处理失败',
    detail: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Kunming bus tour API listening on http://localhost:${port}`);
    // Start trend snapshot capture every 30s
    captureTrendSnapshot();
    setInterval(captureTrendSnapshot, 30000);
  });
}

module.exports = app;
