import type { BusRoute, CollectionSample, CollectionSummary, Overview, RouteStatistic, Spot, Stop } from './types';
import { mockFetch, mockLogin, mockLogout } from './mockApi';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

// 生产环境无后端时自动启用浏览器端 Mock
const useMock = !baseUrl && import.meta.env.PROD;

let authToken = '';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

async function doReal<T>(path: string, method: string, body?: unknown, raw = false): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: method !== 'GET' ? authHeaders() : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`${path} 请求失败：${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  if (raw) return response.json();
  const json = await response.json();
  return json.data;
}

async function callMock<T>(path: string, method: string, body?: unknown, raw = false): Promise<T> {
  const result = await mockFetch(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: authHeaders()
  });
  if (result.status >= 400) {
    throw new Error(`${path} 请求失败：${result.status}`);
  }
  if (result.status === 204) return undefined as T;
  if (raw) return result.body as T;
  return (result.body as any)?.data ?? (result.body as T);
}

async function call<T>(path: string, method = 'GET', body?: unknown, raw = false): Promise<T> {
  if (useMock) return callMock<T>(path, method, body, raw);
  return doReal<T>(path, method, body, raw);
}

export function setAuthToken(token: string) {
  authToken = token;
  if (useMock) mockLogin(token);
}

export function clearAuthToken() {
  authToken = '';
  if (useMock) mockLogout();
}

// Mock 模式下生成 CSV 下载
export async function downloadMockCsv() {
  const result = await mockFetch('/api/collection/samples/export');
  const csv = result.rawBody || '';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'collection_samples.csv';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const api = {
  health: () => call<{ status: string; name: string; dataMode: string }>('/api/health', 'GET', undefined, true),
  routes: (query = '') => call<BusRoute[]>('/api/routes' + query),
  route: (id: number) => call<BusRoute>('/api/routes/' + id),
  stops: () => call<Stop[]>('/api/stops'),
  spots: () => call<Spot[]>('/api/spots'),
  overview: () => call<Overview>('/api/statistics/overview'),
  routeStatistics: () => call<RouteStatistic[]>('/api/statistics/routes'),
  collectionSamples: (query = '?limit=80') => call<CollectionSample[]>('/api/collection/samples' + query),
  collectionSummary: () => call<CollectionSummary>('/api/collection/summary'),
  createCollectionSample: (payload: Partial<CollectionSample>) => call<CollectionSample>('/api/collection/samples', 'POST', payload),
  createRoute: (payload: Partial<BusRoute>) => call<BusRoute>('/api/admin/routes', 'POST', payload),
  updateRoute: (id: number, payload: Partial<BusRoute>) => call<BusRoute>('/api/admin/routes/' + id, 'PUT', payload),
  deleteRoute: (id: number) => call<void>('/api/admin/routes/' + id, 'DELETE'),
  recalculateSpotHeat: () => call<Array<{ id: number; name: string; heat: number }>>('/api/admin/recalculate-heat', 'POST'),
  stopDetail: (id: number) => call<any>('/api/stops/' + id),
  exportSamplesCsv: () => useMock ? '#' : (baseUrl + '/api/collection/samples/export'),
  statisticsTrend: (minutes = 30) => call<any>('/api/statistics/trend?minutes=' + minutes),
  login: (username: string, password: string) => call<{ token: string; username: string }>('/api/auth/login', 'POST', { username, password }),
  verifyAuth: () => call<{ valid: boolean; username: string }>('/api/auth/verify', 'POST')
};
