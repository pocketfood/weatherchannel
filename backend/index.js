const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = process.env.PORT || 5174;
const dataDir = path.join(__dirname, 'data');
const statePath = path.join(dataDir, 'state.json');
const zipsPath = path.join(dataDir, 'zips.txt');
const locationsPath = path.join(dataDir, 'locations.json');
const mediaDir = path.join(__dirname, 'media');

const MS_PER_DAY = 86_400_000;
const SYNODIC_MONTH = 29.53058867;
const DEFAULT_REFRESH_MS = 60_000;

const stateCache = {
  value: null,
  expiresAt: 0,
  inFlight: null
};

app.use(cors());
app.use('/media', express.static(mediaDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/zips', async (_req, res) => {
  try {
    const zips = await resolveZips();
    res.set('Cache-Control', 'no-store');
    res.json({ zips });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to load ZIP list.' });
  }
});

app.get('/api/state', async (_req, res) => {
  try {
    const state = await resolveState();
    res.set('Cache-Control', 'no-store');
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load weather state.', detail: String(err) });
  }
});

app.listen(port, () => {
  console.log(`Weather backend running on http://localhost:${port}`);
});

function decodeEnvJson(raw, base64) {
  if (raw) {
    return raw;
  }
  if (base64) {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  return '';
}

async function parseLocations() {
  const raw = decodeEnvJson(
    process.env.WEATHER_LOCATIONS_JSON || '',
    process.env.WEATHER_LOCATIONS_BASE64 || ''
  );
  const parsed = raw ? parseLocationsJson(raw) : null;
  if (parsed?.length) {
    return parsed;
  }

  const filePath = process.env.WEATHER_LOCATIONS_FILE || locationsPath;
  const fileData = await readJsonFile(filePath);
  if (fileData && Array.isArray(fileData)) {
    return normalizeLocations(fileData);
  }

  return [];
}

function parseLocationsJson(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return normalizeLocations(parsed);
  } catch (_err) {
    return null;
  }
}

function normalizeLocations(entries) {
  return entries
    .map((entry) => ({
      name: String(entry.name || entry.label || 'Location'),
      label: String(entry.label || entry.name || 'Location'),
      zip: entry.zip ? String(entry.zip) : '00000',
      lat: Number(entry.lat ?? entry.latitude),
      lon: Number(entry.lon ?? entry.longitude),
      includeInForecast: entry.includeInForecast !== false,
      includeOnMap: entry.includeOnMap !== false
    }))
    .filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lon));
}

function parseEnvState() {
  const raw = decodeEnvJson(
    process.env.WEATHER_STATE_JSON || '',
    process.env.WEATHER_STATE_BASE64 || ''
  );
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function parseEnvZips() {
  const raw = process.env.WEATHER_ZIPS || '';
  return raw
    .split(/[\n,]+/)
    .map((zip) => zip.trim())
    .filter(Boolean);
}

function getRefreshMs() {
  const raw = Number(process.env.WEATHER_REFRESH_MS);
  if (Number.isFinite(raw) && raw >= 10_000) {
    return raw;
  }
  return DEFAULT_REFRESH_MS;
}

async function resolveZips() {
  const envZips = parseEnvZips();
  if (envZips.length) {
    return envZips;
  }

  const locations = await parseLocations();
  if (locations.length) {
    return locations.map((loc) => loc.zip).filter(Boolean);
  }

  const envState = parseEnvState();
  if (envState?.locations?.length) {
    return envState.locations.map((loc) => loc.zip).filter(Boolean);
  }

  try {
    const zipsFile = process.env.WEATHER_ZIPS_FILE || zipsPath;
    const raw = await fs.readFile(zipsFile, 'utf8');
    const zips = raw.split(/\s+/).filter(Boolean);
    if (zips.length) {
      return zips;
    }
  } catch (_err) {
    // ignore file errors and fall back to state.json
  }

  const fileState = await readJsonFile(statePath);
  if (fileState?.locations?.length) {
    return fileState.locations.map((loc) => loc.zip).filter(Boolean);
  }

  return [];
}

async function resolveState() {
  const locations = await parseLocations();
  if (locations.length) {
    return loadCachedState(locations);
  }

  const envState = parseEnvState();
  if (envState) {
    return envState;
  }

  const fileState = await readJsonFile(statePath);
  if (fileState) {
    return fileState;
  }

  throw new Error('No state source configured');
}

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

async function loadCachedState(locations) {
  const refreshMs = getRefreshMs();
  if (stateCache.value && Date.now() < stateCache.expiresAt) {
    return stateCache.value;
  }

  if (stateCache.inFlight) {
    return stateCache.inFlight;
  }

  stateCache.inFlight = (async () => {
    try {
      const next = await buildState(locations);
      stateCache.value = next;
      stateCache.expiresAt = Date.now() + refreshMs;
      return next;
    } finally {
      stateCache.inFlight = null;
    }
  })();

  return stateCache.inFlight;
}

function summarizeWeather(code) {
  if (code === 0) return 'Sunny';
  if (code === 1) return 'Mostly sunny';
  if (code === 2) return 'Partly sunny';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Cloudy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Light rain';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
  if ([71, 73, 75, 77].includes(code)) return 'Snow';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([85, 86].includes(code)) return 'Snow showers';
  if ([95, 96, 99].includes(code)) return 'Rain showers';
  return 'Clear';
}

function formatDayLabel(dateStr) {
  if (!dateStr) return 'Day';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatLocalTime(dateTime) {
  if (!dateTime || typeof dateTime !== 'string') {
    return '--';
  }
  const parts = dateTime.split('T');
  if (parts.length < 2) {
    return '--';
  }
  const timePart = parts[1];
  const [hourStr, minute = '00'] = timePart.split(':');
  const hour = Number(hourStr);
  if (!Number.isFinite(hour)) {
    return '--';
  }
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${meridiem}`;
}

function getMoonData(now) {
  const reference = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
  const daysSince = (now.getTime() - reference.getTime()) / MS_PER_DAY;
  const phase = ((daysSince % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * phase));

  let phaseName = 'New';
  if (phase < 0.03 || phase > 0.97) {
    phaseName = 'New';
  } else if (phase < 0.22) {
    phaseName = 'Waxing Crescent';
  } else if (phase < 0.28) {
    phaseName = 'First Quarter';
  } else if (phase < 0.47) {
    phaseName = 'Waxing Gibbous';
  } else if (phase < 0.53) {
    phaseName = 'Full';
  } else if (phase < 0.72) {
    phaseName = 'Waning Gibbous';
  } else if (phase < 0.78) {
    phaseName = 'Last Quarter';
  } else {
    phaseName = 'Waning Crescent';
  }

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const nextPhaseDate = (target) => {
    const delta = (target - phase + 1) % 1;
    const date = new Date(now.getTime() + delta * SYNODIC_MONTH * MS_PER_DAY);
    return formatDate(date);
  };

  return {
    phase,
    phaseName,
    illumination: Math.round(illumination * 100),
    nextPhases: [
      { name: 'First', date: nextPhaseDate(0.25) },
      { name: 'Full', date: nextPhaseDate(0.5) },
      { name: 'Last', date: nextPhaseDate(0.75) },
      { name: 'New', date: nextPhaseDate(0) }
    ]
  };
}

async function fetchOpenMeteo(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,sunrise,sunset',
    current_weather: 'true',
    temperature_unit: 'fahrenheit',
    windspeed_unit: 'mph',
    timezone: 'auto',
    forecast_days: '5'
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo ${response.status}`);
  }
  return response.json();
}

async function buildState(locations) {
  const results = await Promise.allSettled(
    locations.map(async (location) => {
      const data = await fetchOpenMeteo(location.lat, location.lon);
      const daily = data.daily || {};
      const times = daily.time || [];
      const maxTemps = daily.temperature_2m_max || [];
      const minTemps = daily.temperature_2m_min || [];
      const precip = daily.precipitation_probability_max || [];
      const codes = daily.weathercode || [];

      const forecast = times.slice(0, 5).map((day, index) => ({
        period: formatDayLabel(day),
        summary: summarizeWeather(codes[index]),
        tempF: maxTemps[index],
        highF: maxTemps[index],
        lowF: minTemps[index],
        precipChance: Number.isFinite(precip[index]) ? precip[index] : undefined
      }));

      const currentCode = data.current_weather?.weathercode ?? codes[0];
      const currentTemp = data.current_weather?.temperature ?? maxTemps[0];

      return {
        ...location,
        forecast,
        currentCode,
        currentTemp,
        sunrise: daily.sunrise?.[0],
        sunset: daily.sunset?.[0],
        sunriseTomorrow: daily.sunrise?.[1],
        sunsetTomorrow: daily.sunset?.[1]
      };
    })
  );

  const available = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  if (!available.length) {
    throw new Error('No forecast data');
  }

  const primary = available[0];
  const moon = getMoonData(new Date());

  return {
    generatedAt: new Date().toISOString(),
    location: {
      name: primary.name,
      zip: primary.zip
    },
    forecast: primary.forecast,
    locations: available
      .filter((entry) => entry.includeInForecast)
      .map((entry) => ({
        name: entry.name,
        zip: entry.zip,
        forecast: entry.forecast
      })),
    almanac: {
      sunrise: formatLocalTime(primary.sunrise),
      sunset: formatLocalTime(primary.sunset),
      sunriseTomorrow: formatLocalTime(primary.sunriseTomorrow),
      sunsetTomorrow: formatLocalTime(primary.sunsetTomorrow),
      moonPhase: moon.phaseName,
      moonIllumination: moon.illumination,
      moonPhases: moon.nextPhases
    },
    regional: {
      title: process.env.WEATHER_REGION_TITLE || 'United States',
      mapImage: '/media/maps/region-placeholder.svg',
      overlays: available
        .filter((entry) => entry.includeOnMap)
        .map((entry) => ({
          label: entry.label,
          tempF: Math.round(entry.currentTemp),
          condition: summarizeWeather(entry.currentCode),
          lat: entry.lat,
          lon: entry.lon
        }))
    },
    ticker: [
      'Live weather update',
      `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      `Sunrise ${formatLocalTime(primary.sunrise)} | Sunset ${formatLocalTime(primary.sunset)}`,
      `Moon phase: ${moon.phaseName}`
    ],
    alerts: [{ title: 'Weather update' }]
  };
}
