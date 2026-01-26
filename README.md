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

## Map styling
The `/weathermap` page uses `maptalks` with a Carto basemap URL. For offline use, swap the tile URL to a local tileserver.

## Running on another device
- Set `VITE_API_BASE` in `frontend/.env` to the backend host (example: `VITE_API_BASE=http://192.168.1.50:5174`).
- Run `npm --prefix frontend run build` and serve the build with any static server, or use the Vite dev server during development.
