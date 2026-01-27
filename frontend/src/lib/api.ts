import type { WeatherState } from '../types';

const apiBase = import.meta.env.VITE_API_BASE || '';

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load state: ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('Unexpected response format');
  }
  return response.json() as Promise<T>;
}

export async function fetchWeatherState(signal?: AbortSignal): Promise<WeatherState> {
  if (apiBase) {
    return fetchJson<WeatherState>(`${apiBase}/api/state`, signal);
  }

  try {
    return await fetchJson<WeatherState>('/api/state', signal);
  } catch (_err) {
    return fetchJson<WeatherState>('/state.json', signal);
  }
}
