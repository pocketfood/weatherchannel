import type { WeatherState } from '../types';

const apiBase = import.meta.env.VITE_API_BASE || '';

export async function fetchWeatherState(signal?: AbortSignal): Promise<WeatherState> {
  const url = apiBase ? `${apiBase}/api/state` : '/api/state';
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load state: ${response.status}`);
  }
  return response.json() as Promise<WeatherState>;
}
