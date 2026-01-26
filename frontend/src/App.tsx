import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import Ticker from './components/Ticker';
import { useWeatherState } from './lib/useWeatherState';
import ForecastPage from './pages/ForecastPage';
import MapPage from './pages/MapPage';
import MoonPage from './pages/MoonPage';

const fallbackTicker = [
  'Retro Weather Channel feed initializing',
  'Live updates every minute',
  'Local forecast, regional observations, almanac',
  'Stay tuned for soothing scenic clips'
];

export default function App() {
  const { state, error } = useWeatherState();

  return (
    <BrowserRouter>
      <div className="app">
        <div className="scanlines" aria-hidden="true" />
        <main className="main">
          <div className="page-viewport">
            <Routes>
              <Route path="/" element={<Navigate to="/forecast" replace />} />
              <Route
                path="/forecast"
                element={
                  <PageShell>
                    <ForecastPage state={state} />
                  </PageShell>
                }
              />
              <Route
                path="/weathermap"
                element={
                  <PageShell>
                    <MapPage state={state} />
                  </PageShell>
                }
              />
              <Route
                path="/moon-phase"
                element={
                  <PageShell>
                    <MoonPage state={state} />
                  </PageShell>
                }
              />
            </Routes>
          </div>
        </main>
        <Ticker items={state?.ticker ?? fallbackTicker} />
        {error && <div className="status-pill">{error}</div>}
      </div>
    </BrowserRouter>
  );
}

type PageShellProps = {
  children: ReactNode;
};

function PageShell({ children }: PageShellProps) {
  return <div className="page">{children}</div>;
}
