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
- `WEATHER_LOCATIONS_JSON` (recommended): array of locations with lat/lon for live data.
- `WEATHER_STATE_BASE64` (optional): base64-encoded JSON (useful if quoting JSON is painful).
- `WEATHER_STATE_JSON` (optional): full JSON payload for the current state (fallback if live fetch is not configured).
- `WEATHER_ZIPS` (optional): comma-separated ZIPs for the `/api/zips` endpoint.
- `WEATHER_REGION_TITLE` (optional): title shown above the regional map.

Example `WEATHER_LOCATIONS_JSON` (single-line JSON):
```json
[{"name":"Metro Area","label":"Metro","zip":"00000","lat":40.71,"lon":-74.0},{"name":"Coastal South","label":"Coastal","zip":"11111","lat":32.08,"lon":-81.09},{"name":"Central Plains","label":"Plains","zip":"22222","lat":36.15,"lon":-95.99},{"name":"Hill Country","label":"Hill Country","zip":"33333","lat":30.27,"lon":-97.74}]
```

Notes:
- Ensure the Vercel project Root Directory is the repo root so `/api/*` functions deploy.
- If `WEATHER_LOCATIONS_JSON` is not set, the API falls back to `WEATHER_STATE_JSON`, then the app falls back to `frontend/public/state.json`.

## Map styling
The `/weathermap` page uses `maptalks` with a Carto basemap URL. For offline use, swap the tile URL to a local tileserver.

## Running on another device
- Set `VITE_API_BASE` in `frontend/.env` to the backend host (example: `VITE_API_BASE=http://192.168.1.50:5174`).
- Run `npm --prefix frontend run build` and serve the build with any static server, or use the Vite dev server during development.
