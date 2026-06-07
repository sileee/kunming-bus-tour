import type { BusRoute, CollectionSample, CollectionSummary, Overview, RouteStatistic, Spot, Stop } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

let authToken = '';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} 请求失败：${response.status}`);
  }
  const body = await response.json();
  return body.data;
}

async function send<T>(path: string, method: string, payload?: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: authHeaders(),
    body: payload ? JSON.stringify(payload) : undefined
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`${path} 请求失败：${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  return body.data;
}

async function getRaw<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} request failed: ${response.status}`);
  }
  return response.json();
}

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = '';
}

export const api = {
  health: () => getRaw<{ status: string; name: string; dataMode: string }>('/api/health'),
  routes: (query = '') => get<BusRoute[]>(`/api/routes${query}`),
  route: (id: number) => get<BusRoute>(`/api/routes/${id}`),
  stops: () => get<Stop[]>('/api/stops'),
  spots: () => get<Spot[]>('/api/spots'),
  overview: () => get<Overview>('/api/statistics/overview'),
  routeStatistics: () => get<RouteStatistic[]>('/api/statistics/routes'),
  collectionSamples: (query = '?limit=80') => get<CollectionSample[]>(`/api/collection/samples${query}`),
  collectionSummary: () => get<CollectionSummary>('/api/collection/summary'),
  createCollectionSample: (payload: Partial<CollectionSample>) => send<CollectionSample>('/api/collection/samples', 'POST', payload),
  createRoute: (payload: Partial<BusRoute>) => send<BusRoute>('/api/admin/routes', 'POST', payload),
  updateRoute: (id: number, payload: Partial<BusRoute>) => send<BusRoute>(`/api/admin/routes/${id}`, 'PUT', payload),
  deleteRoute: (id: number) => send<void>(`/api/admin/routes/${id}`, 'DELETE'),
  recalculateSpotHeat: () => send<Array<{ id: number; name: string; heat: number }>>('/api/admin/recalculate-heat', 'POST'),
  stopDetail: (id: number) => get<any>(`/api/stops/${id}`),
  exportSamplesCsv: () => `${baseUrl}/api/collection/samples/export`,
  statisticsTrend: (minutes = 30) => get<{ data: Array<{ time: string; passengerFlow: number; topRoutes: Array<{ number: string; flow: number }> }>; count: number; windowMinutes: number }>(`/api/statistics/trend?minutes=${minutes}`),
  login: (username: string, password: string) => send<{ token: string; username: string }>('/api/auth/login', 'POST', { username, password }),
  verifyAuth: () => send<{ valid: boolean; username: string }>('/api/auth/verify', 'POST')
};
