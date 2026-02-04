import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import PageFrame from '../components/PageFrame';
import type { RegionalOverlay, WeatherState } from '../types';

type MapPageProps = {
  state: WeatherState | null;
};

const BASE_TILES = [
  'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
  'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
  'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
  'https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'
];

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: 'raster',
      tiles: BASE_TILES,
      tileSize: 256,
      attribution: ''
    }
  },
  layers: [
    {
      id: 'base',
      type: 'raster',
      source: 'base',
      paint: {
        'raster-opacity': 0.95
      }
    }
  ]
};

const RADAR_TILE_SIZE = 512;
const RADAR_COLOR_SCHEME = 2;
const RADAR_SMOOTH = 1;
const RADAR_SNOW = 1;
const RADAR_OPACITY = 0.7;
const RADAR_TILE_FADE_MS = 0;
const RADAR_FRAME_MS = 1000;
const RADAR_PAST_FRAMES = 10;

export default function MapPage({ state }: MapPageProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const [radarHost, setRadarHost] = useState('https://tilecache.rainviewer.com');
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapHostRef.current,
      style: BASE_STYLE,
      center: [-81.5, 38.2],
      zoom: 4.5,
      minZoom: 3,
      maxZoom: 7,
      attributionControl: false,
      interactive: false
    });

    mapRef.current = map;
    const handleResize = () => map.resize();
    map.on('load', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const loadRadar = async () => {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('Radar feed unavailable');
        }
        const data = (await response.json()) as RainViewerResponse;
        if (!isActive) {
          return;
        }

        const past = data.radar.past.slice(-RADAR_PAST_FRAMES);
        const nowcast = data.radar.nowcast ?? [];
        setRadarHost(data.host);
        setRadarFrames([...past, ...nowcast]);
      } catch (_err) {
        if (isActive) {
          setRadarFrames((prev) => (prev.length ? prev : []));
        }
      }
    };

    loadRadar();
    const refreshTimer = window.setInterval(loadRadar, 5 * 60_000);

    return () => {
      isActive = false;
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    setFrameIndex(0);
    if (radarFrames.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % radarFrames.length);
    }, RADAR_FRAME_MS);

    return () => window.clearInterval(timer);
  }, [radarFrames.length]);

  const radarUrl = useMemo(() => {
    const frame = radarFrames[frameIndex];
    if (!frame) {
      return null;
    }
    return `${radarHost}${frame.path}/${RADAR_TILE_SIZE}/{z}/{x}/{y}/${RADAR_COLOR_SCHEME}/${RADAR_SMOOTH}_${RADAR_SNOW}.png`;
  }, [radarFrames, frameIndex, radarHost]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !radarUrl) {
      return;
    }

    const applyRadar = () => {
      const sourceId = 'radar-source';
      const layerId = 'radar-layer';
      const source = map.getSource(sourceId) as maplibregl.RasterSource | undefined;

      if (!source) {
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [radarUrl],
          tileSize: RADAR_TILE_SIZE,
          attribution: ''
        });
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': RADAR_OPACITY,
            'raster-resampling': 'linear',
            'raster-fade-duration': RADAR_TILE_FADE_MS
          }
        });
        return;
      }

      if (typeof (source as { setTiles?: (tiles: string[]) => void }).setTiles === 'function') {
        (source as { setTiles: (tiles: string[]) => void }).setTiles([radarUrl]);
        return;
      }

      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      map.removeSource(sourceId);
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [radarUrl],
        tileSize: RADAR_TILE_SIZE,
        attribution: ''
      });
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': RADAR_OPACITY,
          'raster-resampling': 'linear',
          'raster-fade-duration': RADAR_TILE_FADE_MS
        }
      });
    };

    if (!map.isStyleLoaded()) {
      const handleLoad = () => applyRadar();
      map.once('load', handleLoad);
      return () => map.off('load', handleLoad);
    }

    applyRadar();
  }, [radarUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !state) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = state.regional.overlays.map((overlay) =>
      createOverlayMarker(map, overlay)
    );
  }, [state]);

  return (
    <PageFrame
      title="Regional Observations"
      location={state?.regional.title ?? 'United States'}
    >
      <div className="map-frame">
        <div className="map-legend" aria-hidden="true">
          <div className="map-legend-title">Precip</div>
          <div className="map-legend-bar" />
          <div className="map-legend-scale">
            <span>Light</span>
            <span>Heavy</span>
          </div>
        </div>
        <div ref={mapHostRef} className="maplibre-map" />
        {!state && <div className="map-loading">Loading regional map...</div>}
      </div>
    </PageFrame>
  );
}

type RadarFrame = {
  time: number;
  path: string;
};

type RainViewerResponse = {
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast?: RadarFrame[];
  };
};

function createOverlayMarker(map: maplibregl.Map, overlay: RegionalOverlay) {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-overlay';
  wrapper.innerHTML = `
    <div class="map-overlay-label">${overlay.label}</div>
    <div class="map-overlay-temp">${overlay.tempF}</div>
    <div class="map-overlay-cond">${overlay.condition}</div>
  `;

  const marker = new maplibregl.Marker({ element: wrapper, anchor: 'center' })
    .setLngLat([overlay.lon, overlay.lat])
    .addTo(map);

  return marker;
}
