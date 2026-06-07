const app = require('../src/server');

async function request(path, options = {}) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
    const expectedStatus = options.expectedStatus || 200;
    if (response.status !== expectedStatus) {
      throw new Error(`${path} returned ${response.status}`);
    }
    return response.status === 204 ? null : await response.json();
  } finally {
    server.close();
  }
}

(async () => {
  const health = await request('/api/health');
  const routes = await request('/api/routes');
  const overview = await request('/api/statistics/overview');
  const collection = await request('/api/collection/summary');
  const createdSample = await request('/api/collection/samples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routeId: 1,
      speed: 26,
      passengerCount: 38,
      loadRate: 62,
      source: '测试采集终端'
    }),
    expectedStatus: 201
  });
  const invalidSample = await request('/api/collection/samples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routeId: 1,
      speed: -1,
      passengerCount: 38,
      loadRate: 62
    }),
    expectedStatus: 400
  });
  const recalculatedHeat = await request('/api/admin/recalculate-heat', {
    method: 'POST'
  });

  if (health.status !== 'ok') throw new Error('health check failed');
  if (!Array.isArray(routes.data) || routes.data.length < 8) throw new Error('routes data too small');
  if (!overview.data || overview.data.routeCount < 8) throw new Error('overview count invalid');
  if (!collection.data || collection.data.sampleCount < 1) throw new Error('collection summary invalid');
  if (!createdSample.data || createdSample.data.source !== '测试采集终端') throw new Error('collection create failed');
  if (!invalidSample.message) throw new Error('collection validation failed');
  if (!Array.isArray(recalculatedHeat.data) || recalculatedHeat.data.length < 1) throw new Error('heat recalculation failed');

  console.log('API smoke test passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
