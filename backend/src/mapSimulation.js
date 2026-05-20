import { EDGES, NODES, DISTRICTS, nearestNode } from './bangkokGraph.js';

let state = {
  mode: 'fixed',
  improvementPercent: 22,
  quantumNoise: 0.1,
  vehicles: [],
  edgeLoad: {},
  signals: {},
  flows: [],
  quantumPulse: 0,
};

NODES.forEach((n) => {
  state.signals[n.id] = Math.random() > 0.5 ? 'green' : 'red';
});

function initLoads() {
  EDGES.forEach((e) => {
    state.edgeLoad[e.id] = 2 + Math.floor(Math.random() * 6);
  });
}
initLoads();

function positionOnEdge(edge, t) {
  const c = edge.coordinates;
  if (t <= 0) return { lng: c[0][0], lat: c[0][1] };
  if (t >= 1) return { lng: c[c.length - 1][0], lat: c[c.length - 1][1] };
  const seg = t * (c.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = c[Math.min(i, c.length - 1)];
  const b = c[Math.min(i + 1, c.length - 1)];
  return { lng: a[0] + (b[0] - a[0]) * f, lat: a[1] + (b[1] - a[1]) * f };
}

function spawnVehicle(edgeId = null) {
  const edge = edgeId
    ? EDGES.find((e) => e.id === edgeId)
    : EDGES[Math.floor(Math.random() * EDGES.length)];
  if (!edge) return;
  state.vehicles.push({
    id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    edgeId: edge.id,
    progress: 0,
    speed: 0.008 + Math.random() * 0.012,
    trail: [],
  });
  state.edgeLoad[edge.id] = (state.edgeLoad[edge.id] || 0) + 1;
}

const MAX_VEHICLES = 32;
for (let i = 0; i < 18; i++) spawnVehicle();

function buildFlows() {
  const pairs = {};
  DISTRICTS.forEach((d) => {
    DISTRICTS.forEach((d2) => {
      if (d.id === d2.id) return;
      const key = `${d.id}_${d2.id}`;
      pairs[key] = {
        source: [d.lng, d.lat],
        target: [d2.lng, d2.lat],
        count: 0,
      };
    });
  });

  state.vehicles.forEach((v) => {
    const e = EDGES.find((x) => x.id === v.edgeId);
    if (!e) return;
    const k = `${e.districtFrom}_${e.districtTo}`;
    if (pairs[k]) pairs[k].count += 1;
  });

  EDGES.forEach((e) => {
    const load = state.edgeLoad[e.id] || 0;
    const k = `${e.districtFrom}_${e.districtTo}`;
    if (pairs[k]) pairs[k].count += load * 0.3;
  });

  state.flows = Object.values(pairs).filter((f) => f.count > 0.5);
}

function rotateSignals() {
  const ids = NODES.map((n) => n.id);
  const green = ids[Math.floor(Math.random() * ids.length)];
  ids.forEach((id) => {
    state.signals[id] = id === green || Math.random() > 0.65 ? 'green' : 'red';
  });
}

export function setMapMode(mode, improvementPercent = 22, quantumNoise = 0.1) {
  state.mode = mode;
  state.improvementPercent = improvementPercent;
  state.quantumNoise = quantumNoise;
  if (mode === 'quantum') state.quantumPulse = 1;
}

export function addVehicleAt(lat, lng) {
  const node = nearestNode(lat, lng);
  const edge = EDGES.find((e) => e.from === node.id || e.to === node.id) || EDGES[0];
  spawnVehicle(edge.id);
  return { node, edge: edge.id };
}

export function mapTick() {
  const quantum = state.mode === 'quantum';
  const speedMul = quantum ? 1.35 + state.improvementPercent / 200 : 1;
  const drain = quantum ? 0.55 : 0.35;

  if (state.vehicles.length < MAX_VEHICLES && Math.random() > 0.5) spawnVehicle();
  if (Math.random() > 0.92) rotateSignals();

  state.vehicles = state.vehicles.filter((v) => {
    const edge = EDGES.find((e) => e.id === v.edgeId);
    if (!edge) return false;

    const atNode = edge.to;
    const signal = state.signals[atNode];
    if (signal === 'red' && v.progress > 0.75 && !quantum) {
      v.progress += v.speed * 0.15;
    } else {
      v.progress += v.speed * speedMul * (quantum && signal === 'red' ? 1.2 : 1);
    }

    const pos = positionOnEdge(edge, Math.min(1, v.progress));
    v.lng = pos.lng;
    v.lat = pos.lat;
    v.trail = [...(v.trail || []), [pos.lng, pos.lat]].slice(-12);

    if (v.progress >= 1) {
      state.edgeLoad[v.edgeId] = Math.max(0, (state.edgeLoad[v.edgeId] || 1) - drain);
      if (Math.random() > 0.3) {
        const next = EDGES.filter((e) => e.from === edge.to);
        if (next.length) {
          v.edgeId = next[Math.floor(Math.random() * next.length)].id;
          v.progress = 0;
          state.edgeLoad[v.edgeId] = (state.edgeLoad[v.edgeId] || 0) + 1;
          return true;
        }
      }
      return false;
    }
    return true;
  });

  if (quantum) {
    EDGES.forEach((e) => {
      state.edgeLoad[e.id] = Math.max(0, (state.edgeLoad[e.id] || 0) - 0.15);
    });
  }

  if (state.quantumPulse > 0) state.quantumPulse = Math.max(0, state.quantumPulse - 0.08);

  buildFlows();
  return getMapState();
}

export function getMapState() {
  const edges = EDGES.map((e) => ({
    id: e.id,
    path: e.coordinates,
    load: state.edgeLoad[e.id] || 0,
    districtFrom: e.districtFrom,
    districtTo: e.districtTo,
  }));

  const nodes = NODES.map((n) => ({
    ...n,
    signal: state.signals[n.id],
    queue: Math.floor((state.edgeLoad[`${n.id}_`] || 0) + Object.entries(state.edgeLoad)
      .filter(([k]) => k.includes(n.id))
      .reduce((s, [, v]) => s + v * 0.2, 0)),
  }));

  return {
    mode: state.mode,
    improvementPercent: state.improvementPercent,
    quantumNoise: state.quantumNoise,
    quantumPulse: state.quantumPulse,
    nodes,
    edges,
    vehicles: state.vehicles.map((v) => ({
      id: v.id,
      lng: v.lng,
      lat: v.lat,
      trail: v.trail,
      edgeId: v.edgeId,
    })),
    flows: state.flows,
    vehicleCount: state.vehicles.length,
    totalLoad: Object.values(state.edgeLoad).reduce((a, b) => a + b, 0),
  };
}

export function injectMapTraffic(count = 10) {
  for (let i = 0; i < count; i++) spawnVehicle();
  buildFlows();
  return getMapState();
}

export function resetMap() {
  state.vehicles = [];
  state.edgeLoad = {};
  initLoads();
  state.quantumPulse = 0;
  for (let i = 0; i < 20; i++) spawnVehicle();
  buildFlows();
  return getMapState();
}

export function loadScenario(name) {
  resetMap();
  if (name === 'bangkok_morning') {
    EDGES.slice(0, 8).forEach((e) => {
      state.edgeLoad[e.id] = 14 + Math.floor(Math.random() * 8);
    });
  } else if (name === 'hanoi_peak') {
    EDGES.filter((e) => e.districtTo === 'sathorn' || e.districtFrom === 'sathorn').forEach(
      (e) => {
        state.edgeLoad[e.id] = 18;
      }
    );
  } else if (name === 'quantum_breakthrough') {
    setMapMode('quantum', 28, 0.05);
  }
  for (let i = 0; i < 35; i++) spawnVehicle();
  buildFlows();
  return getMapState();
}
