import { useMemo } from 'react';
import PageFrame from '../components/PageFrame';
import type { WeatherState } from '../types';

type MoonPageProps = {
  state: WeatherState | null;
};

export default function MoonPage({ state }: MoonPageProps) {
  const almanac = state?.almanac;
  const sunriseTomorrow = almanac?.sunriseTomorrow ?? almanac?.sunrise ?? '--';
  const sunsetTomorrow = almanac?.sunsetTomorrow ?? almanac?.sunset ?? '--';

  const { todayLabel, tomorrowLabel } = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    return {
      todayLabel: today.toLocaleDateString('en-US', { weekday: 'long' }),
      tomorrowLabel: tomorrow.toLocaleDateString('en-US', { weekday: 'long' })
    };
  }, []);

  const phases = almanac?.moonPhases?.length
    ? almanac.moonPhases
    : [
        { name: 'First', date: '--' },
        { name: 'Full', date: '--' },
        { name: 'Last', date: '--' },
        { name: 'New', date: '--' }
      ];

  return (
    <PageFrame title="Almanac">
      {!almanac ? (
        <div className="page-status">Loading almanac...</div>
      ) : (
        <div className="almanac">
          <div className="almanac-sun">
            <div className="sun-block">
              <div className="sun-title">{todayLabel}</div>
              <div className="sun-row">
                <span className="sun-label">Sunrise</span>
                <span className="sun-value">{almanac.sunrise}</span>
              </div>
              <div className="sun-row">
                <span className="sun-label">Sunset</span>
                <span className="sun-value">{almanac.sunset}</span>
              </div>
            </div>
            <div className="sun-block">
              <div className="sun-title">{tomorrowLabel}</div>
              <div className="sun-row">
                <span className="sun-label">Sunrise</span>
                <span className="sun-value">{sunriseTomorrow}</span>
              </div>
              <div className="sun-row">
                <span className="sun-label">Sunset</span>
                <span className="sun-value">{sunsetTomorrow}</span>
              </div>
            </div>
          </div>
          <div className="almanac-moon">
            <div className="moon-header">Moon Phases</div>
            <div className="moon-phase-grid">
              {phases.map((phase) => {
                const key = phase.name.toLowerCase();
                const phaseKey = key.includes('full')
                  ? 'full'
                  : key.includes('new')
                  ? 'new'
                  : key.includes('first')
                  ? 'first'
                  : key.includes('last')
                  ? 'last'
                  : 'full';

                return (
                  <div className="moon-phase-card" key={`${phase.name}-${phase.date}`}>
                    <div className="moon-disc" data-phase={phaseKey} aria-hidden="true" />
                    <div className="moon-phase-name">{phase.name}</div>
                    <div className="moon-phase-date">{phase.date}</div>
                  </div>
                );
              })}
            </div>
            <div className="moon-current">
              Current phase: {almanac.moonPhase} ({almanac.moonIllumination}%)
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
