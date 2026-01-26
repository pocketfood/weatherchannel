import { useEffect, useRef, useState } from 'react';
import type { WeatherState } from '../types';
import { fetchWeatherState } from './api';

const REFRESH_MS = 60_000;

export function useWeatherState() {
  const [state, setState] = useState<WeatherState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        const next = await fetchWeatherState(controller.signal);
        if (isMounted.current) {
          setState(next);
          setError(null);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);

    return () => {
      isMounted.current = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return { state, error };
}
