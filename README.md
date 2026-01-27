# WeatherChannel

Retro Weather Channel-style renderer + lightweight backend.

## Structure
- `frontend/` Vite + React fullscreen renderer
- `backend/` Express server serving mock state + media

## Development
1) Install Node.js (18+ recommended) and npm.
2) Install dependencies:

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```

3) Run both apps:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api` + `/media` to the backend on `http://localhost:5174`.

## Data
Mock data lives in `backend/data/state.json`. Replace it with live API data when ready.

## Routes
- `/forecast` Extended Forecast screen
- `/weathermap` Regional Observations screen
- `/moon-phase` Almanac/Moon Phase screen

## Vercel (serverless API)
This deployment uses Vercel serverless functions instead of a long-running backend.

Set the following Vercel Environment Variables:
- `WEATHER_STATE_JSON` (required): full JSON payload for the current state.
- `WEATHER_STATE_BASE64` (optional): base64-encoded JSON (useful if quoting JSON is painful).
- `WEATHER_ZIPS` (optional): comma-separated ZIPs for the `/api/zips` endpoint.

Example `WEATHER_STATE_JSON` (single-line JSON):
```json
{"generatedAt":"2025-01-25T12:00:00Z","location":{"name":"Metro Area","zip":"00000"},"forecast":[{"period":"Tonight","summary":"Light snow, breezy","tempF":28,"highF":28,"lowF":18,"precipChance":40}],"almanac":{"sunrise":"07:12 AM","sunset":"05:04 PM","moonPhase":"Waning Gibbous","moonIllumination":73},"regional":{"title":"United States","mapImage":"/media/maps/region-placeholder.svg","overlays":[{"label":"Northeast","tempF":31,"condition":"Cloudy","lat":41.2,"lon":-74.8}]},"ticker":["Lake effect snow bands continue overnight"]}
```

Notes:
- Ensure the Vercel project Root Directory is the repo root so `/api/*` functions deploy.
- If `WEATHER_STATE_JSON` is not set, the app falls back to `frontend/public/state.json`.

## Map styling
The `/weathermap` page uses `maptalks` with a Carto basemap URL. For offline use, swap the tile URL to a local tileserver.

## Running on another device
- Set `VITE_API_BASE` in `frontend/.env` to the backend host (example: `VITE_API_BASE=http://192.168.1.50:5174`).
- Run `npm --prefix frontend run build` and serve the build with any static server, or use the Vite dev server during development.
