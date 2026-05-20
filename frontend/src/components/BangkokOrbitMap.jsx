import { useMemo, useState, useCallback, useEffect, memo } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import { PathLayer, ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';
const INITIAL_VIEW = {
  longitude: 100.5612,
  latitude: 13.7365,
  zoom: 13.8,
  pitch: 40,
  bearing: -15,
};

function loadColor(mode, load, maxLoad) {
  const t = Math.min(1, load / Math.max(1, maxLoad));
  if (mode === 'quantum') return [80 + t * 40, 200 - t * 60, 255 - t * 80, 180];
  return [220 + t * 35, 60, 60, 160 + t * 60];
}

function BangkokOrbitMapInner({ mapState, graph, mode }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [mapLoaded, setMapLoaded] = useState(false);

  const edges = mapState?.edges || [];
  const vehicles = (mapState?.vehicles || []).slice(0, 35);
  const nodes = mapState?.nodes || [];
  const flows = (mapState?.flows || [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const maxLoad = useMemo(
    () => Math.max(1, ...edges.map((e) => e.load || 0)),
    [edges]
  );
  const maxFlow = useMemo(
    () => Math.max(1, ...flows.map((f) => f.count || 0)),
    [flows]
  );

  const layers = useMemo(() => {
    if (!mapState || !graph) return [];

    return [
      new PathLayer({
        id: 'roads',
        data: edges,
        getPath: (d) => d.path,
        getWidth: (d) => 3 + (d.load / maxLoad) * 10,
        getColor: (d) => loadColor(mode, d.load, maxLoad),
        widthMinPixels: 2,
        updateTriggers: { getColor: [mode, maxLoad] },
      }),
      new ArcLayer({
        id: 'flows',
        data: flows,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getSourceColor:
          mode === 'quantum' ? [0, 200, 255, 140] : [239, 68, 68, 120],
        getTargetColor:
          mode === 'quantum' ? [0, 229, 255, 80] : [220, 38, 38, 80],
        getWidth: (d) => Math.min(8, 1 + d.count * 0.5),
        greatCircle: false,
      }),
      new ScatterplotLayer({
        id: 'nodes',
        data: nodes,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 50,
        getFillColor: (d) =>
          d.signal === 'green' ? [34, 197, 94, 180] : [239, 68, 68, 180],
        radiusMinPixels: 5,
        radiusMaxPixels: 14,
      }),
      new ScatterplotLayer({
        id: 'ducks',
        data: vehicles,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 22,
        getFillColor:
          mode === 'quantum' ? [139, 92, 246, 220] : [59, 130, 246, 200],
        radiusMinPixels: 5,
        radiusMaxPixels: 10,
      }),
    ];
  }, [mapState, graph, mode, edges, vehicles, nodes, flows, maxLoad, maxFlow]);

  const onViewStateChange = useCallback(({ viewState: vs }) => setViewState(vs), []);

  return (
    <div className="relative w-full h-[min(65vh,520px)] rounded-xl overflow-hidden border border-cyan-500/20 bg-slate-900">
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900 text-slate-400 text-sm">
          Loading Bangkok map…
        </div>
      )}
      <DeckGL
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={true}
        layers={layers}
        useDevicePixels={1}
      >
        <Map
          mapStyle={MAP_STYLE}
          attributionControl={false}
          onLoad={() => setMapLoaded(true)}
        />
      </DeckGL>
      <div className="absolute top-3 left-3 glass px-3 py-2 rounded-lg text-xs pointer-events-none z-20">
        <p className="font-display text-cyan-300">Bangkok · Sukhumvit graph</p>
        <p className="text-slate-400">
          {mode === 'quantum' ? '⚛️ Quantum' : '🐢 Fixed'} · {vehicles.length} ducks
        </p>
      </div>
    </div>
  );
}

export const BangkokOrbitMap = memo(BangkokOrbitMapInner);
