CREATE DATABASE IF NOT EXISTS kunming_bus_tour DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kunming_bus_tour;

DROP TABLE IF EXISTS route_statistics;
DROP TABLE IF EXISTS collection_samples;
DROP TABLE IF EXISTS route_spots;
DROP TABLE IF EXISTS route_stops;
DROP TABLE IF EXISTS tourist_spots;
DROP TABLE IF EXISTS bus_stops;
DROP TABLE IF EXISTS bus_routes;

CREATE TABLE bus_routes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  number VARCHAR(32) NOT NULL COMMENT '线路编号',
  name VARCHAR(100) NOT NULL COMMENT '线路展示名称',
  start_stop VARCHAR(100) NOT NULL COMMENT '起点站',
  end_stop VARCHAR(100) NOT NULL COMMENT '终点站',
  operation_time VARCHAR(64) NOT NULL COMMENT '运营时间',
  fare VARCHAR(32) NOT NULL COMMENT '票价',
  type VARCHAR(32) NOT NULL COMMENT '线路类型',
  color VARCHAR(16) NOT NULL DEFAULT '#2563eb' COMMENT '地图渲染颜色',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='公交线路表';

CREATE TABLE bus_stops (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '站点名称',
  lng DECIMAL(10, 6) NOT NULL COMMENT '经度',
  lat DECIMAL(10, 6) NOT NULL COMMENT '纬度',
  district VARCHAR(32) NOT NULL COMMENT '行政区'
) COMMENT='公交站点表';

CREATE TABLE tourist_spots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '景点名称',
  lng DECIMAL(10, 6) NOT NULL COMMENT '经度',
  lat DECIMAL(10, 6) NOT NULL COMMENT '纬度',
  category VARCHAR(32) NOT NULL COMMENT '景点类型',
  district VARCHAR(32) NOT NULL COMMENT '行政区',
  rating DECIMAL(2, 1) NOT NULL COMMENT '推荐评分',
  heat INT NOT NULL COMMENT '热度指数',
  intro VARCHAR(255) NOT NULL COMMENT '简介'
) COMMENT='旅游景点表';

CREATE TABLE route_stops (
  route_id INT NOT NULL,
  stop_id INT NOT NULL,
  sequence INT NOT NULL COMMENT '站点顺序',
  PRIMARY KEY (route_id, stop_id),
  CONSTRAINT fk_route_stops_route FOREIGN KEY (route_id) REFERENCES bus_routes(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_stops_stop FOREIGN KEY (stop_id) REFERENCES bus_stops(id) ON DELETE CASCADE
) COMMENT='线路站点关联表';

CREATE TABLE route_spots (
  route_id INT NOT NULL,
  spot_id INT NOT NULL,
  PRIMARY KEY (route_id, spot_id),
  CONSTRAINT fk_route_spots_route FOREIGN KEY (route_id) REFERENCES bus_routes(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_spots_spot FOREIGN KEY (spot_id) REFERENCES tourist_spots(id) ON DELETE CASCADE
) COMMENT='线路景点关联表';

CREATE TABLE route_statistics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  route_id INT NOT NULL,
  stat_date DATE NOT NULL,
  passenger_flow INT NOT NULL COMMENT '仿真客流量',
  punctuality DECIMAL(5, 2) NOT NULL COMMENT '准点率',
  congestion INT NOT NULL COMMENT '拥挤度',
  heat INT NOT NULL COMMENT '热度值',
  CONSTRAINT fk_route_statistics_route FOREIGN KEY (route_id) REFERENCES bus_routes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_route_date (route_id, stat_date)
) COMMENT='线路运营统计表';

CREATE TABLE collection_samples (
  id INT PRIMARY KEY AUTO_INCREMENT,
  route_id INT NOT NULL,
  collected_at DATETIME NOT NULL COMMENT '采集时间',
  speed DECIMAL(5, 2) NOT NULL COMMENT '车辆速度 km/h',
  passenger_count INT NOT NULL COMMENT '车内客流人数',
  load_rate INT NOT NULL COMMENT '满载率百分比',
  source VARCHAR(64) NOT NULL COMMENT '采集来源',
  CONSTRAINT fk_collection_samples_route FOREIGN KEY (route_id) REFERENCES bus_routes(id) ON DELETE CASCADE,
  INDEX idx_collection_route_time (route_id, collected_at)
) COMMENT='公交运行采集样本表';

CREATE TABLE admin_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE COMMENT '登录用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码（明文存储，实训项目）',
  role VARCHAR(32) NOT NULL DEFAULT 'admin' COMMENT '角色',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) COMMENT='管理员用户表';
