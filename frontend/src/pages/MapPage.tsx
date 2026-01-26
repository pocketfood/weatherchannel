import { useEffect, useMemo, useRef, useState } from 'react';
import * as maptalks from 'maptalks';
import 'maptalks/dist/maptalks.css';
import PageFrame from '../components/PageFrame';
import type { RegionalOverlay, WeatherState } from '../types';

type MapPageProps = {
  state: WeatherState | null;
};

export default function MapPage({ state }: MapPageProps) {
  const mapRef = useRef<maptalks.Map | null>(null);
  const markersRef = useRef<maptalks.ui.UIMarker[]>([]);
  const radarLayerRef = useRef<maptalks.TileLayer | null>(null);
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const [radarHost, setRadarHost] = useState('https://tilecache.rainviewer.com');
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) {
      return;
    }

    const map = new maptalks.Map(mapHostRef.current, {
      center: [-86, 35.8],
      zoom: 5.1,
      minZoom: 3,
      maxZoom: 6,
      pitch: 0,
      attribution: false,
      zoomControl: false,
      zoomable: false,
      draggable: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragRotate: false,
      touchZoom: false,
      touchRotate: false,
      baseLayer: new maptalks.TileLayer('base', {
        urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        opacity: 0.95,
        crossOrigin: 'anonymous',
        renderer: 'canvas'
      })
    });

    mapRef.current = map;
    const refreshSize = () => map.checkSize();
    const raf = window.requestAnimationFrame(refreshSize);
    const timer = window.setTimeout(refreshSize, 150);
    window.addEventListener('resize', refreshSize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('resize', refreshSize);
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

        const past = data.radar.past.slice(-6);
        const nowcast = data.radar.nowcast ?? [];
        setRadarHost(data.host);
        setRadarFrames([...past, ...nowcast]);
      } catch (_err) {
        if (isActive) {
          setRadarFrames([]);
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
    }, 2000);

    return () => window.clearInterval(timer);
  }, [radarFrames.length]);

  const radarUrl = useMemo(() => {
    const frame = radarFrames[frameIndex];
    if (!frame) {
      return null;
    }
    return `${radarHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
  }, [radarFrames, frameIndex, radarHost]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !radarUrl) {
      return;
    }

    if (!radarLayerRef.current) {
      const layer = new maptalks.TileLayer('radar', {
        urlTemplate: radarUrl,
        opacity: 0.65,
        zIndex: 3,
        crossOrigin: 'anonymous',
        renderer: 'canvas'
      });
      layer.addTo(map);
      radarLayerRef.current = layer;
    } else {
      radarLayerRef.current.setOptions({ urlTemplate: radarUrl });
      radarLayerRef.current.forceReload();
    }
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
        <div ref={mapHostRef} className="maptalks-map" />
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

function createOverlayMarker(map: maptalks.Map, overlay: RegionalOverlay) {
  const content = `
    <div class="map-overlay">
      <div class="map-overlay-label">${overlay.label}</div>
      <div class="map-overlay-temp">${overlay.tempF}</div>
      <div class="map-overlay-cond">${overlay.condition}</div>
    </div>
  `;

  const marker = new maptalks.ui.UIMarker([overlay.lon, overlay.lat], {
    content,
    dy: -10,
    draggable: false
  });

  marker.addTo(map);
  return marker;
}
