const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'kunming_bus_tour',
      waitForConnections: true,
      connectionLimit: 10
    });
  }
  return pool;
}

async function listRoutes(filters = {}) {
  const params = [];
  const where = [];
  if (filters.keyword) {
    where.push('(r.number LIKE ? OR r.name LIKE ? OR r.start_stop LIKE ? OR r.end_stop LIKE ?)');
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword, keyword, keyword);
  }
  if (filters.type) {
    where.push('r.type = ?');
    params.push(filters.type);
  }
  if (filters.spotId) {
    where.push('EXISTS (SELECT 1 FROM route_spots x WHERE x.route_id = r.id AND x.spot_id = ?)');
    params.push(Number(filters.spotId));
  }

  const [rows] = await getPool().query(
    `SELECT r.id, r.number, r.name, r.start_stop AS start, r.end_stop AS end,
            r.operation_time AS operationTime, r.fare, r.type, r.color
       FROM bus_routes r ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY r.id`,
    params
  );

  return Promise.all(rows.map((row) => getRouteById(row.id)));
}

async function getRouteById(id) {
  const [[route]] = await getPool().query(
    `SELECT id, number, name, start_stop AS start, end_stop AS end,
            operation_time AS operationTime, fare, type, color
       FROM bus_routes WHERE id = ?`,
    [id]
  );
  if (!route) return null;

  const [routeStops] = await getPool().query(
    `SELECT s.id, s.name, s.lng, s.lat, s.district, rs.sequence
       FROM route_stops rs
       JOIN bus_stops s ON s.id = rs.stop_id
      WHERE rs.route_id = ?
      ORDER BY rs.sequence`,
    [id]
  );
  const [routeSpots] = await getPool().query(
    `SELECT sp.id, sp.name, sp.lng, sp.lat, sp.category, sp.district, sp.rating, sp.heat, sp.intro
       FROM route_spots rsp
       JOIN tourist_spots sp ON sp.id = rsp.spot_id
      WHERE rsp.route_id = ?
      ORDER BY sp.heat DESC`,
    [id]
  );
  const routeStats = await getRouteStatistics();
  const stat = routeStats.find((item) => Number(item.routeId) === Number(id)) || null;

  return {
    ...route,
    stops: routeStops,
    spots: routeSpots,
    polyline: routeStops.map((stop) => [Number(stop.lng), Number(stop.lat)]),
    statistics: stat
  };
}

async function listStops(filters = {}) {
  const params = [];
  let sql = 'SELECT id, name, lng, lat, district FROM bus_stops';
  if (filters.keyword) {
    sql += ' WHERE name LIKE ? OR district LIKE ?';
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  sql += ' ORDER BY district, name';
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function listSpots(filters = {}) {
  const params = [];
  const where = [];
  if (filters.keyword) {
    where.push('(name LIKE ? OR district LIKE ?)');
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  if (filters.category) {
    where.push('category = ?');
    params.push(filters.category);
  }
  const [rows] = await getPool().query(
    `SELECT id, name, lng, lat, category, district, rating, heat, intro
       FROM tourist_spots ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY heat DESC`,
    params
  );
  return rows;
}

async function getRouteStatistics() {
  const [rows] = await getPool().query(
    `SELECT COALESCE(s.id, r.id) AS id,
            r.id AS routeId,
            COALESCE(s.stat_date, CURDATE()) AS date,
            COALESCE(s.passenger_flow, 18000) AS passengerFlow,
            COALESCE(s.punctuality, 90.0) AS punctuality,
            COALESCE(s.congestion, 55.0) AS congestion,
            COALESCE(s.heat, 60) AS heat,
            r.number AS routeNumber,
            r.name AS routeName,
            r.type
       FROM bus_routes r
       LEFT JOIN route_statistics s ON s.route_id = r.id AND s.stat_date = CURDATE()
      ORDER BY r.id`
  );
  const liveRows = await applyLiveCollection(rows);
  return liveRows.sort((a, b) => b.heat - a.heat);
}

async function getOverview() {
  const [[counts]] = await getPool().query(
    `SELECT
      (SELECT COUNT(*) FROM bus_routes) AS routeCount,
      (SELECT COUNT(*) FROM bus_stops) AS stopCount,
      (SELECT COUNT(*) FROM tourist_spots) AS spotCount,
      (SELECT ROUND(AVG(punctuality), 1) FROM route_statistics WHERE stat_date = CURDATE()) AS avgPunctuality`
  );
  const routeStats = await getRouteStatistics();
  const passengerFlow = routeStats.reduce((sum, item) => sum + Number(item.passengerFlow || 0), 0);
  const avgPunctuality = routeStats.length
    ? Math.round((routeStats.reduce((sum, item) => sum + Number(item.punctuality || 0), 0) / routeStats.length) * 10) / 10
    : Number(counts.avgPunctuality || 0);
  const hotRoutes = routeStats.slice().sort((a, b) => b.heat - a.heat).slice(0, 5);
  const [districtRows] = await getPool().query('SELECT district, COUNT(*) AS count FROM bus_stops GROUP BY district');
  const districtStopCount = Object.fromEntries(districtRows.map((row) => [row.district, row.count]));
  return { ...counts, passengerFlow, avgPunctuality, hotRoutes, districtStopCount };
}

async function listCollectionSamples(filters = {}) {
  const params = [];
  let sql = `SELECT c.id, c.route_id AS routeId, c.collected_at AS collectedAt, c.speed,
                    c.passenger_count AS passengerCount, c.load_rate AS loadRate, c.source,
                    r.number AS routeNumber, r.name AS routeName
               FROM collection_samples c
               JOIN bus_routes r ON r.id = c.route_id`;
  if (filters.routeId) {
    sql += ' WHERE c.route_id = ?';
    params.push(Number(filters.routeId));
  }
  sql += ' ORDER BY c.collected_at DESC LIMIT ?';
  params.push(Number(filters.limit || 50));
  const [rows] = await getPool().query(sql, params);
  return rows.reverse();
}

async function updateRouteStatsFromSamples(routeId) {
  const [[sampleStats]] = await getPool().query(
    `SELECT COUNT(*) AS cnt,
            ROUND(AVG(passenger_count), 2) AS avgPax,
            ROUND(AVG(load_rate), 2) AS avgLoad,
            ROUND(AVG(speed), 2) AS avgSpeed
       FROM collection_samples
      WHERE route_id = ? AND collected_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
    [routeId]
  );
  if (!sampleStats || sampleStats.cnt === 0) return;

  const avgPax = Number(sampleStats.avgPax);
  const avgLoad = Number(sampleStats.avgLoad);
  const avgSpeed = Number(sampleStats.avgSpeed);
  const sampleCount = Number(sampleStats.cnt);

  const [[current]] = await getPool().query(
    `SELECT passenger_flow AS passengerFlow, punctuality, congestion, heat
       FROM route_statistics WHERE route_id = ? AND stat_date = CURDATE()`,
    [routeId]
  );

  const baseFlow = current ? Number(current.passengerFlow) : 18000;
  const baseCongestion = current ? Number(current.congestion) : 55;
  const basePunctuality = current ? Number(current.punctuality) : 90;
  const baseHeat = current ? Number(current.heat) : 60;

  const estimatedTrips = 44 + Math.min(sampleCount, 12) * 3;
  const observedFlow = avgPax * estimatedTrips * (0.75 + avgLoad / 120);
  const alpha = Math.min(0.55, 0.22 + sampleCount * 0.025);

  const passengerFlow = Math.round(baseFlow * (1 - alpha) + observedFlow * alpha);
  const congestion = clamp(Math.round((baseCongestion * 0.45 + avgLoad * 0.55) * 10) / 10, 25, 98);
  const punctuality = clamp(
    Math.round((basePunctuality - Math.max(0, avgLoad - 70) * 0.08 + Math.max(0, avgSpeed - 24) * 0.04) * 10) / 10,
    78, 98
  );
  const flowHeat = Math.log10(Math.max(passengerFlow, 1000)) * 14 - 24;
  const heat = Math.round(clamp(baseHeat * 0.55 + flowHeat * 0.45, 45, 99));

  await getPool().query(
    `INSERT INTO route_statistics (route_id, stat_date, passenger_flow, punctuality, congestion, heat)
     VALUES (?, CURDATE(), ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE passenger_flow = VALUES(passenger_flow),
                             punctuality = VALUES(punctuality),
                             congestion = VALUES(congestion),
                             heat = VALUES(heat)`,
    [routeId, passengerFlow, punctuality, congestion, heat]
  );
}

async function createCollectionSample(payload) {
  const routeId = Number(payload.routeId);
  const [result] = await getPool().query(
    `INSERT INTO collection_samples(route_id, collected_at, speed, passenger_count, load_rate, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      routeId,
      payload.collectedAt ? new Date(payload.collectedAt) : new Date(),
      Number(payload.speed),
      Number(payload.passengerCount),
      Number(payload.loadRate),
      payload.source || '模拟采集终端'
    ]
  );
  await updateRouteStatsFromSamples(routeId);
  const [rows] = await getPool().query(
    `SELECT c.id, c.route_id AS routeId, c.collected_at AS collectedAt, c.speed,
            c.passenger_count AS passengerCount, c.load_rate AS loadRate, c.source,
            r.number AS routeNumber, r.name AS routeName
       FROM collection_samples c JOIN bus_routes r ON r.id = c.route_id
      WHERE c.id = ?`,
    [result.insertId]
  );
  return rows[0];
}

async function getCollectionSummary() {
  const [[summary]] = await getPool().query(
    `SELECT COUNT(*) AS sampleCount,
            ROUND(AVG(speed), 1) AS avgSpeed,
            ROUND(AVG(load_rate), 1) AS avgLoadRate,
            COUNT(DISTINCT route_id) AS onlineDevices
       FROM collection_samples`
  );
  const [latestRows] = await getPool().query(
    `SELECT c.id, c.route_id AS routeId, c.collected_at AS collectedAt, c.speed,
            c.passenger_count AS passengerCount, c.load_rate AS loadRate, c.source,
            r.number AS routeNumber, r.name AS routeName
       FROM collection_samples c JOIN bus_routes r ON r.id = c.route_id
      ORDER BY c.collected_at DESC LIMIT 1`
  );
  return {
    ...summary,
    latest: latestRows[0] || null,
    onlineDevices: Math.max(summary.onlineDevices || 0, 4)
  };
}

async function applyLiveCollection(rows) {
  const [sampleRows] = await getPool().query(
    `SELECT route_id AS routeId,
            COUNT(*) AS sampleCount,
            AVG(passenger_count) AS avgPassengerCount,
            AVG(load_rate) AS avgLoadRate,
            AVG(speed) AS avgSpeed
       FROM collection_samples
      WHERE collected_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
      GROUP BY route_id`
  );
  const sampleByRoute = new Map(sampleRows.map((row) => [Number(row.routeId), row]));
  const tickSeed = Math.floor(Date.now() / 1500);

  return rows.map((row) => {
    const routeId = Number(row.routeId);
    const sample = sampleByRoute.get(routeId);
    const baseFlow = Number(row.passengerFlow || 18000);
    const baseCongestion = Number(row.congestion || 55);
    const basePunctuality = Number(row.punctuality || 90);
    const baseHeat = Number(row.heat || 60);
    const jitter = 0.97 + seededRandom(routeId * 101 + tickSeed) * 0.06;

    let passengerFlow = Math.round(baseFlow * jitter);
    let congestion = baseCongestion;
    let punctuality = basePunctuality;

    if (sample) {
      const avgLoadRate = Number(sample.avgLoadRate || 0);
      const avgSpeed = Number(sample.avgSpeed || 0);

      congestion = clamp(Math.round((baseCongestion * 0.55 + avgLoadRate * 0.45) * 10) / 10, 25, 98);
      punctuality = clamp(
        Math.round((basePunctuality - Math.max(0, avgLoadRate - 70) * 0.06 + Math.max(0, avgSpeed - 24) * 0.03) * 10) / 10,
        78,
        98
      );
      passengerFlow = Math.round(passengerFlow * (1 + (avgLoadRate - 55) * 0.0008));
    }

    const flowHeat = Math.log10(Math.max(passengerFlow, 1000)) * 14 - 24;
    const heat = Math.round(clamp(baseHeat * 0.55 + flowHeat * 0.45, 45, 99));

    return {
      ...row,
      passengerFlow,
      congestion,
      punctuality,
      heat
    };
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function createRoute(payload) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO bus_routes(number, name, start_stop, end_stop, operation_time, fare, type, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [payload.number, payload.name, payload.start, payload.end, payload.operationTime, payload.fare, payload.type, payload.color]
    );
    const routeId = result.insertId;

    if (Array.isArray(payload.stopIds) && payload.stopIds.length > 0) {
      const rows = payload.stopIds.map((stopId, index) => [routeId, Number(stopId), index + 1]);
      await connection.query('INSERT INTO route_stops(route_id, stop_id, sequence) VALUES ?', [rows]);
    }

    if (Array.isArray(payload.spotIds) && payload.spotIds.length > 0) {
      const rows = payload.spotIds.map((spotId) => [routeId, Number(spotId)]);
      await connection.query('INSERT INTO route_spots(route_id, spot_id) VALUES ?', [rows]);
    }

    await connection.commit();
    return getRouteById(routeId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateRoute(id, payload) {
  await getPool().query(
    'UPDATE bus_routes SET number = ?, name = ?, start_stop = ?, end_stop = ?, operation_time = ?, fare = ?, type = ?, color = ? WHERE id = ?',
    [payload.number, payload.name, payload.start, payload.end, payload.operationTime, payload.fare, payload.type, payload.color, id]
  );
  return getRouteById(id);
}

async function deleteRoute(id) {
  const [result] = await getPool().query('DELETE FROM bus_routes WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function recalculateSpotHeat() {
  const [spots] = await getPool().query('SELECT id, name, heat FROM tourist_spots ORDER BY id');
  const minuteSeed = new Date().getMinutes() + new Date().getSeconds() / 60;
  const updated = spots.map((spot) => {
    const jitter = 0.85 + seededRandom(spot.id * 47 + minuteSeed + Math.random() * 10) * 0.30;
    const heat = Math.max(50, Math.min(99, Math.round(Number(spot.heat || 50) * jitter)));
    return { id: spot.id, name: spot.name, heat };
  });

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const spot of updated) {
      await connection.query('UPDATE tourist_spots SET heat = ? WHERE id = ?', [spot.heat, spot.id]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return updated;
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

module.exports = {
  listRoutes,
  getRouteById,
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
