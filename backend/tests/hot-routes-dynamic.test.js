const assert = require('node:assert/strict');
const repo = require('../src/repositories/fileRepository');

const targetRouteId = 5;

function routeSnapshot() {
  const overview = repo.getOverview();
  const statistic = repo.getRouteStatistics().find((item) => item.routeId === targetRouteId);
  const rank = overview.hotRoutes.findIndex((item) => item.routeId === targetRouteId);
  return { statistic, rank };
}

const before = routeSnapshot();

repo.createCollectionSample({
  routeId: targetRouteId,
  speed: 18,
  passengerCount: 78,
  loadRate: 98,
  source: '热门线路动态排行回归测试'
});

const after = routeSnapshot();

assert.ok(before.statistic, 'target route statistic must exist before collection');
assert.ok(after.statistic, 'target route statistic must exist after collection');
assert.ok(
  after.statistic.heat > before.statistic.heat,
  `fresh high-demand sample should raise heat: ${before.statistic.heat} -> ${after.statistic.heat}`
);
assert.ok(
  after.rank >= 0 && (before.rank < 0 || after.rank < before.rank),
  `fresh high-demand sample should improve hot-route rank: ${before.rank} -> ${after.rank}`
);

console.log('Dynamic hot-routes regression test passed');
