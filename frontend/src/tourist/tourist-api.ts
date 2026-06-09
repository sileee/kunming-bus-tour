import type { BusRoute, Spot, RouteStatistic, Overview } from '../types';
import { mockFetch } from '../mockApi';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
const useMock = !baseUrl && import.meta.env.PROD;

async function get<T>(path: string): Promise<T> {
  if (useMock) {
    const result = await mockFetch(path);
    if (result.status >= 400) throw new Error(`${path} 请求失败：${result.status}`);
    return ((result.body as any)?.data ?? result.body) as T;
  }

  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} 请求失败：${response.status}`);
  const body = await response.json();
  return body.data;
}

async function send<T>(path: string, payload: unknown): Promise<T> {
  if (useMock) {
    const result = await mockFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (result.status >= 400) throw new Error(`${path} 请求失败：${result.status}`);
    return ((result.body as any)?.data ?? result.body) as T;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`${path} 请求失败：${response.status}`);
  const body = await response.json();
  return body.data;
}

export const touristApi = {
  routes: (query = '') => get<BusRoute[]>(`/api/routes${query}`),
  route: (id: number) => get<BusRoute>(`/api/routes/${id}`),
  stops: () => get<any[]>('/api/stops'),
  spots: () => get<Spot[]>('/api/spots'),
  overview: () => get<Overview>('/api/statistics/overview'),
  routeStatistics: () => get<RouteStatistic[]>('/api/statistics/routes'),
  createCollectionSample: (payload: any) => send<any>('/api/collection/samples', payload)
};
