export type ForecastPeriod = {
  period: string;
  summary: string;
  tempF: number;
  highF?: number;
  lowF?: number;
  precipChance?: number;
  icon?: string;
};

export type ForecastLocation = {
  name: string;
  zip: string;
  forecast: ForecastPeriod[];
};

export type MoonPhase = {
  name: string;
  date: string;
};

export type Almanac = {
  sunrise: string;
  sunset: string;
  sunriseTomorrow?: string;
  sunsetTomorrow?: string;
  moonPhase: string;
  moonIllumination: number;
  moonPhases?: MoonPhase[];
};

export type RegionalOverlay = {
  label: string;
  tempF: number;
  condition: string;
  lat: number;
  lon: number;
};

export type Regional = {
  title: string;
  mapImage: string;
  overlays: RegionalOverlay[];
};

export type WeatherState = {
  generatedAt: string;
  location: {
    name: string;
    zip: string;
  };
  locations?: ForecastLocation[];
  forecast: ForecastPeriod[];
  almanac: Almanac;
  regional: Regional;
  ticker: string[];
  alerts?: { title: string }[];
};
