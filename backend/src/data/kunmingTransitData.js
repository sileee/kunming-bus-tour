const stops = [
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

const spots = [
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

const routes = [
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

const statistics = [
  { id: 1, routeId: 1, date: '2026-05-01', passengerFlow: 32800, punctuality: 91.5, congestion: 64, heat: 89 },
  { id: 2, routeId: 2, date: '2026-05-01', passengerFlow: 45200, punctuality: 88.2, congestion: 78, heat: 96 },
  { id: 3, routeId: 3, date: '2026-05-01', passengerFlow: 39800, punctuality: 89.6, congestion: 73, heat: 93 },
  { id: 4, routeId: 4, date: '2026-05-01', passengerFlow: 36500, punctuality: 90.1, congestion: 69, heat: 91 },
  { id: 5, routeId: 5, date: '2026-05-01', passengerFlow: 28600, punctuality: 92.4, congestion: 58, heat: 84 },
  { id: 6, routeId: 6, date: '2026-05-01', passengerFlow: 33400, punctuality: 90.9, congestion: 66, heat: 86 },
  { id: 7, routeId: 7, date: '2026-05-01', passengerFlow: 24700, punctuality: 93.1, congestion: 51, heat: 79 },
  { id: 8, routeId: 8, date: '2026-05-01', passengerFlow: 21800, punctuality: 92.8, congestion: 47, heat: 77 },
  { id: 9, routeId: 9, date: '2026-05-01', passengerFlow: 19600, punctuality: 90.3, congestion: 44, heat: 75 },
  { id: 10, routeId: 10, date: '2026-05-01', passengerFlow: 22600, punctuality: 91.2, congestion: 49, heat: 74 }
];

function attachRouteDetails(route) {
  const routeStops = route.stopIds.map((stopId, index) => ({
    ...stops.find((stop) => stop.id === stopId),
    sequence: index + 1
  }));
  const routeSpots = route.spotIds.map((spotId) => spots.find((spot) => spot.id === spotId));
  const stat = statistics.find((item) => item.routeId === route.id);

  return {
    ...route,
    stops: routeStops,
    spots: routeSpots,
    polyline: routeStops.map((stop) => [stop.lng, stop.lat]),
    statistics: stat
  };
}

module.exports = {
  stops,
  spots,
  routes,
  statistics,
  attachRouteDetails
};
