const MS_PER_DAY = 86_400_000;
const SYNODIC_MONTH = 29.53058867;

function decodeEnvJson(raw, base64) {
  if (raw) {
    return raw;
  }
  if (base64) {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  return '';
}

function parseLocations() {
  const raw = decodeEnvJson(
    process.env.WEATHER_LOCATIONS_JSON || '',
    process.env.WEATHER_LOCATIONS_BASE64 || ''
  );
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
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
  } catch (_err) {
    return [];
  }
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
  const results = await Promise.all(
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

  const available = results.filter(Boolean);
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
      'Lake effect snow bands continue overnight',
      'Wind chill advisory for northern counties',
      `Sunrise ${formatLocalTime(primary.sunrise)} | Sunset ${formatLocalTime(primary.sunset)}`,
      `Moon phase: ${moon.phaseName}`
    ],
    alerts: [{ title: 'Weather update' }]
  };
}

module.exports = async (req, res) => {
  const locations = parseLocations();
  if (locations.length) {
    try {
      const payload = await buildState(locations);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      res.status(200).json(payload);
      return;
    } catch (err) {
      res.status(502).json({ error: 'Failed to fetch weather data', detail: String(err) });
      return;
    }
  }

  const raw = decodeEnvJson(
    process.env.WEATHER_STATE_JSON || '',
    process.env.WEATHER_STATE_BASE64 || ''
  );
  if (!raw) {
    res.status(500).json({ error: 'WEATHER_LOCATIONS_JSON not set' });
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Invalid WEATHER_STATE_JSON', detail: String(err) });
  }
};
