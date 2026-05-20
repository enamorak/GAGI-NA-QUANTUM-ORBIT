import { lazy, Suspense, useState } from 'react';

const BangkokOrbitMap = lazy(() =>
  import('./BangkokOrbitMap.jsx').then((m) => ({ default: m.BangkokOrbitMap }))
);

export function MapLoader(props) {
  const [enabled, setEnabled] = useState(false);

  if (!enabled) {
    return (
      <div className="w-full h-[min(50vh,400px)] rounded-xl border border-cyan-500/30 bg-slate-900/80 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-300 text-center max-w-md text-sm">
          3D map (Deck.gl + MapLibre) loads ~2MB. Click to open Bangkok traffic view and
          keep the rest of the site responsive.
        </p>
        <button type="button" className="btn-primary" onClick={() => setEnabled(true)}>
          🗺️ Open Bangkok map
        </button>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="w-full h-[min(65vh,520px)] rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">
          Loading map engine…
        </div>
      }
    >
      <BangkokOrbitMap {...props} />
    </Suspense>
  );
}
