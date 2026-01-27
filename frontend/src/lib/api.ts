import type { WeatherState } from '../types';
import fallbackState from '../data/defaultState.json';

const apiBase = import.meta.env.VITE_API_BASE || '';

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load state: ${response.status}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch (_err) {
    throw new Error('Unexpected response format');
  }
}

export async function fetchWeatherState(signal?: AbortSignal): Promise<WeatherState> {
  if (apiBase) {
    try {
      return await fetchJson<WeatherState>(`${apiBase}/api/state`, signal);
    } catch (_err) {
      try {
        return await fetchJson<WeatherState>('/state.json', signal);
      } catch (_fallbackErr) {
        return fallbackState as WeatherState;
      }
    }
  }

  try {
    return await fetchJson<WeatherState>('/api/state', signal);
  } catch (_err) {
    try {
      return await fetchJson<WeatherState>('/state.json', signal);
    } catch (_fallbackErr) {
      return fallbackState as WeatherState;
    }
  }
}
