/**
 * Demo road graph — Sukhumvit / Asok / Sathorn (Bangkok).
 * Production: replace with OSM + pgRouting extract.
 */

export const MAP_CENTER = { lng: 100.5612, lat: 13.7365, zoom: 14.2 };

export const DISTRICTS = [
  { id: 'asok', name: 'Asok', lng: 100.5608, lat: 13.7373 },
  { id: 'nana', name: 'Nana', lng: 100.5535, lat: 13.7405 },
  { id: 'phrom_phong', name: 'Phrom Phong', lng: 100.5693, lat: 13.7307 },
  { id: 'thong_lo', name: 'Thong Lo', lng: 100.5784, lat: 13.7233 },
  { id: 'sathorn', name: 'Sathorn', lng: 100.5342, lat: 13.7195 },
  { id: 'lumpini', name: 'Lumpini', lng: 100.5412, lat: 13.7312 },
];

/** Intersections (OSM-style nodes) */
export const NODES = [
  { id: 'asok', name: 'Asok', lng: 100.5608, lat: 13.7373, district: 'asok' },
  { id: 'nana', name: 'Nana', lng: 100.5535, lat: 13.7405, district: 'nana' },
  { id: 'pleonchit', name: 'Ploenchit', lng: 100.5480, lat: 13.7430, district: 'nana' },
  { id: 'phrom_phong', name: 'Phrom Phong', lng: 100.5693, lat: 13.7307, district: 'phrom_phong' },
  { id: 'thong_lo', name: 'Thong Lo', lng: 100.5784, lat: 13.7233, district: 'thong_lo' },
  { id: 'ekkamai', name: 'Ekkamai', lng: 100.5852, lat: 13.7195, district: 'thong_lo' },
  { id: 'sathorn_n', name: 'Sathorn N', lng: 100.5342, lat: 13.7280, district: 'sathorn' },
  { id: 'sathorn_s', name: 'Sathorn S', lng: 100.5365, lat: 13.7180, district: 'sathorn' },
  { id: 'lumpini', name: 'Lumpini', lng: 100.5412, lat: 13.7312, district: 'lumpini' },
  { id: 'rama4_w', name: 'Rama IV W', lng: 100.5520, lat: 13.7265, district: 'lumpini' },
  { id: 'rama4_e', name: 'Rama IV E', lng: 100.5720, lat: 13.7240, district: 'phrom_phong' },
  { id: 'witthayu', name: 'Witthayu', lng: 100.5495, lat: 13.7350, district: 'asok' },
];

function edge(fromId, toId, extra = {}) {
  const a = NODES.find((n) => n.id === fromId);
  const b = NODES.find((n) => n.id === toId);
  const coords = [
    [a.lng, a.lat],
    [
      (a.lng + b.lng) / 2 + (extra.bendLng || 0),
      (a.lat + b.lat) / 2 + (extra.bendLat || 0),
    ],
    [b.lng, b.lat],
  ];
  return {
    id: `${fromId}_${toId}`,
    from: fromId,
    to: toId,
    coordinates: coords,
    districtFrom: a.district,
    districtTo: b.district,
  };
}

export const EDGES = [
  edge('pleonchit', 'nana'),
  edge('nana', 'asok'),
  edge('asok', 'witthayu'),
  edge('witthayu', 'lumpini'),
  edge('lumpini', 'sathorn_n'),
  edge('sathorn_n', 'sathorn_s'),
  edge('asok', 'phrom_phong', { bendLng: 0.002 }),
  edge('phrom_phong', 'rama4_e'),
  edge('rama4_e', 'thong_lo'),
  edge('thong_lo', 'ekkamai'),
  edge('phrom_phong', 'rama4_w', { bendLat: -0.001 }),
  edge('rama4_w', 'lumpini'),
  edge('nana', 'lumpini', { bendLng: -0.003 }),
  edge('asok', 'rama4_e', { bendLng: 0.004, bendLat: -0.002 }),
  edge('sathorn_s', 'rama4_w', { bendLng: 0.002 }),
];

export function getGraphPayload() {
  return {
    center: MAP_CENTER,
    nodes: NODES,
    edges: EDGES.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      path: e.coordinates,
      districtFrom: e.districtFrom,
      districtTo: e.districtTo,
    })),
    districts: DISTRICTS,
    attribution: 'Demo graph · Sukhumvit corridor · OSM/pgRouting in production',
  };
}

export function nearestNode(lat, lng) {
  let best = NODES[0];
  let minD = Infinity;
  for (const n of NODES) {
    const d = (n.lat - lat) ** 2 + (n.lng - lng) ** 2;
    if (d < minD) {
      minD = d;
      best = n;
    }
  }
  return best;
}

export function edgeById(id) {
  return EDGES.find((e) => e.id === id);
}
