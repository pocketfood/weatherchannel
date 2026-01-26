import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import PageFrame from '../components/PageFrame';
import type { ForecastLocation, WeatherState } from '../types';

type ForecastPageProps = {
  state: WeatherState | null;
};

export default function ForecastPage({ state }: ForecastPageProps) {
  const getIconKind = (summary: string): IconKind => {
    const text = summary.toLowerCase();
    if (text.includes('snow')) return 'snow';
    if (text.includes('rain')) return 'rain';
    if (text.includes('cloud') && text.includes('sun')) return 'partly';
    if (text.includes('cloud')) return 'cloudy';
    return 'sunny';
  };

  const forecastLocations = useMemo<ForecastLocation[]>(() => {
    if (!state) {
      return [];
    }

    if (state.locations?.length) {
      return state.locations;
    }

    return [
      {
        name: state.location.name,
        zip: state.location.zip,
        forecast: state.forecast
      }
    ];
  }, [state]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    if (forecastLocations.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % forecastLocations.length);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [forecastLocations.length]);

  const activeLocation = forecastLocations[activeIndex] ?? null;

  return (
    <PageFrame title="Extended Forecast" location={activeLocation?.name}>
      {!state ? (
        <div className="page-status">Loading forecast...</div>
      ) : (
        <div className="forecast-grid" key={activeLocation?.name ?? 'default'}>
          {(activeLocation?.forecast ?? state.forecast).map((period, index) => {
            const high = period.highF ?? period.tempF;
            const low = period.lowF ?? (typeof high === 'number' ? high - 10 : undefined);
            const kind = getIconKind(period.summary);

            return (
              <div
                className="forecast-card"
                key={period.period}
                style={{ '--reveal-delay': `${index * 0.12}s` } as CSSProperties}
              >
                <div className="forecast-day">{period.period}</div>
                <div className="forecast-icon-wrap">
                  <ForecastIcon kind={kind} />
                </div>
                <div className="forecast-desc">{period.summary}</div>
                <div className="forecast-bottom">
                  <div className="forecast-temps">
                    <div className="forecast-temp-block">
                      <span className="temp-label">Lo</span>
                      <span className="temp-value">{typeof low === 'number' ? low : '--'}</span>
                    </div>
                    <div className="forecast-temp-block">
                      <span className="temp-label">Hi</span>
                      <span className="temp-value">{typeof high === 'number' ? high : '--'}</span>
                    </div>
                  </div>
                  {typeof period.precipChance === 'number' && (
                    <div className="forecast-precip">Precip {period.precipChance}%</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageFrame>
  );
}

type IconKind = 'sunny' | 'partly' | 'cloudy' | 'snow' | 'rain';

type ForecastIconProps = {
  kind: IconKind;
};

function ForecastIcon({ kind }: ForecastIconProps) {
  if (kind === 'cloudy') {
    return (
      <svg className="forecast-icon cloudy" viewBox="0 0 120 120" role="img" aria-label="Cloudy">
        <path
          d="M40 78c-12 0-22-9-22-20 0-11 10-20 22-20 3 0 6 1 9 2 4-9 13-15 24-15 15 0 27 11 27 25 12 1 22 10 22 23 0 13-11 23-25 23H40z"
          className="icon-cloud"
        />
      </svg>
    );
  }

  if (kind === 'snow') {
    return (
      <svg className="forecast-icon snow" viewBox="0 0 120 120" role="img" aria-label="Snow">
        <path
          d="M32 70c-10 0-18-7-18-16 0-9 8-16 18-16 2 0 5 1 7 2 3-7 11-12 20-12 13 0 23 9 23 21 10 1 18 8 18 18 0 11-9 20-21 20H32z"
          className="icon-cloud"
        />
        <g className="icon-snow" strokeWidth="3" strokeLinecap="round">
          <path d="M44 90l4 8" />
          <path d="M60 90l4 8" />
          <path d="M76 90l4 8" />
        </g>
      </svg>
    );
  }

  if (kind === 'rain') {
    return (
      <svg className="forecast-icon rain" viewBox="0 0 120 120" role="img" aria-label="Rain">
        <path
          d="M32 68c-10 0-18-7-18-16 0-9 8-16 18-16 2 0 5 1 7 2 3-7 11-12 20-12 13 0 23 9 23 21 10 1 18 8 18 18 0 11-9 20-21 20H32z"
          className="icon-cloud"
        />
        <g className="icon-rain" strokeWidth="3" strokeLinecap="round">
          <path d="M46 88l-4 10" />
          <path d="M62 88l-4 10" />
          <path d="M78 88l-4 10" />
        </g>
      </svg>
    );
  }

  if (kind === 'partly') {
    return (
      <svg className="forecast-icon partly" viewBox="0 0 120 120" role="img" aria-label="Partly cloudy">
        <circle cx="70" cy="40" r="16" className="icon-sun" />
        <g className="icon-ray" strokeWidth="3" strokeLinecap="round">
          <path d="M70 14v10" />
          <path d="M70 56v10" />
          <path d="M44 40h10" />
          <path d="M86 40h10" />
          <path d="M52 22l8 8" />
          <path d="M80 50l8 8" />
        </g>
        <path
          d="M34 82c-10 0-18-7-18-16 0-9 8-16 18-16 2 0 5 1 7 2 3-7 11-12 20-12 13 0 23 9 23 21 10 1 18 8 18 18 0 11-9 20-21 20H34z"
          className="icon-cloud"
        />
      </svg>
    );
  }

  return (
    <svg className="forecast-icon sunny" viewBox="0 0 120 120" role="img" aria-label="Sunny">
      <circle cx="60" cy="60" r="20" className="icon-sun" />
      <g className="icon-ray" strokeWidth="4" strokeLinecap="round">
        <path d="M60 16v12" />
        <path d="M60 92v12" />
        <path d="M16 60h12" />
        <path d="M92 60h12" />
        <path d="M28 28l9 9" />
        <path d="M83 83l9 9" />
        <path d="M28 92l9-9" />
        <path d="M83 37l9-9" />
      </g>
    </svg>
  );
}
