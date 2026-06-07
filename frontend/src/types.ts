export interface Stop {
  id: number;
  name: string;
  lng: number;
  lat: number;
  district: string;
  sequence?: number;
}

export interface Spot {
  id: number;
  name: string;
  lng: number;
  lat: number;
  category: string;
  district: string;
  rating: number;
  heat: number;
  intro: string;
}

export interface RouteStatistic {
  id: number;
  routeId: number;
  routeNumber: string;
  routeName: string;
  type: string;
  date: string;
  passengerFlow: number;
  punctuality: number;
  congestion: number;
  heat: number;
}

export interface BusRoute {
  id: number;
  number: string;
  name: string;
  start: string;
  end: string;
  operationTime: string;
  fare: string;
  type: string;
  color: string;
  stops: Stop[];
  spots: Spot[];
  polyline: [number, number][];
  statistics?: RouteStatistic;
}

export interface Overview {
  routeCount: number;
  stopCount: number;
  spotCount: number;
  passengerFlow: number;
  avgPunctuality: number;
  hotRoutes: RouteStatistic[];
  districtStopCount: Record<string, number>;
}

export interface CollectionSample {
  id: number;
  routeId: number;
  routeNumber: string;
  routeName: string;
  collectedAt: string;
  speed: number;
  passengerCount: number;
  loadRate: number;
  source: string;
}

export interface CollectionSummary {
  sampleCount: number;
  latest: CollectionSample | null;
  avgSpeed: number;
  avgLoadRate: number;
  onlineDevices: number;
}
