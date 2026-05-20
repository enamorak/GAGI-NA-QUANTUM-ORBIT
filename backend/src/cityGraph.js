/**
 * City road network: intersections + streets as polylines (broken lines).
 */

export const VEHICLE_TYPES = {
  duck: { emoji: '🦆', priority: 1, label: 'Driver' },
  delivery: { emoji: '📦', priority: 2, label: 'Delivery' },
  ambulance: { emoji: '🚑', priority: 3, label: 'Ambulance' },
};

const DEFAULT_INTERSECTIONS = [
  { id: 'w0', x: 0.8, y: 5.2, signal: 'ns' },
  { id: 'w1', x: 2.8, y: 6.8, signal: 'ew' },
  { id: 'w2', x: 5.2, y: 7.6, signal: 'ns' },
  { id: 'w3', x: 8.5, y: 7.2, signal: 'ew' },
  { id: 'w4', x: 11.2, y: 6.0, signal: 'ns' },
  { id: 'n1', x: 3.0, y: 4.0, signal: 'ew' },
  { id: 'n2', x: 6.5, y: 4.8, signal: 'ns' },
  { id: 'n3', x: 9.8, y: 4.2, signal: 'ew' },
  { id: 'hub', x: 6.0, y: 5.8, signal: 'ns' },
  { id: 'e1', x: 10.5, y: 5.0, signal: 'ew' },
  { id: 's1', x: 2.2, y: 2.5, signal: 'ns' },
  { id: 's2', x: 5.5, y: 2.0, signal: 'ew' },
  { id: 's3', x: 8.8, y: 2.8, signal: 'ns' },
  { id: 's4', x: 11.0, y: 3.5, signal: 'ew' },
  { id: 'c0', x: 4.2, y: 0.8, signal: 'ew' },
  { id: 'c1', x: 7.5, y: 0.5, signal: 'ns' },
];

const DEFAULT_STREETS = [
  { from: 'w0', to: 'w1', bend: [2.8, 5.2] },
  { from: 'w1', to: 'w2', bend: [5.2, 6.8] },
  { from: 'w2', to: 'w3', bend: [8.5, 7.6] },
  { from: 'w3', to: 'w4', bend: [11.2, 7.2] },
  { from: 'w0', to: 'n1', bend: [0.8, 4.0] },
  { from: 'n1', to: 'hub', bend: [3.0, 5.8] },
  { from: 'hub', to: 'n2', bend: [6.5, 5.8] },
  { from: 'n2', to: 'n3', bend: [9.8, 4.8] },
  { from: 'n3', to: 'e1', bend: [10.5, 4.2] },
  { from: 'e1', to: 'w4', bend: [11.2, 5.0] },
  { from: 'w1', to: 'hub', bend: [2.8, 5.8] },
  { from: 'hub', to: 'w3', bend: [8.5, 5.8] },
  { from: 's1', to: 'n1', bend: [2.2, 4.0] },
  { from: 's2', to: 'n2', bend: [5.5, 4.8] },
  { from: 's3', to: 'n3', bend: [8.8, 4.2] },
  { from: 's1', to: 's2', bend: [5.5, 2.5] },
  { from: 's2', to: 's3', bend: [8.8, 2.0] },
  { from: 's3', to: 's4', bend: [11.0, 2.8] },
  { from: 'c0', to: 's1', bend: [4.2, 2.5] },
  { from: 'c0', to: 's2', bend: [4.2, 2.0] },
  { from: 'c1', to: 's2', bend: [7.5, 2.0] },
  { from: 'c1', to: 's3', bend: [7.5, 2.8] },
  { from: 's4', to: 'e1', bend: [11.0, 5.0] },
  { from: 'hub', to: 's2', bend: [6.0, 2.0] },
  { from: 'w2', to: 'hub', bend: [6.0, 7.6] },
];

let cachedGraph = null;
let graphGeneration = 0;

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPath(fromNode, toNode, bend) {
  const path = [[fromNode.x, fromNode.y]];
  if (bend?.length === 2) path.push(bend);
  else if (Array.isArray(bend?.[0])) bend.forEach((p) => path.push(p));
  path.push([toNode.x, toNode.y]);
  return path;
}

function makeBend(a, b, rnd) {
  if (rnd() > 0.5) return [b.x, a.y];
  return [a.x, b.y];
}

function buildGraphFromLayout(intersections, streets) {
  const map = Object.fromEntries(intersections.map((n) => [n.id, n]));
  const nodes = intersections.map((n) => ({ ...n, waitQueue: [] }));
  const edges = streets
    .map((s) => {
      const a = map[s.from];
      const b = map[s.to];
      if (!a || !b) return null;
      const path = buildPath(a, b, s.bend);
      return {
        id: `${s.from}_${s.to}`,
        from: s.from,
        to: s.to,
        path,
        length: pathLength(path),
      };
    })
    .filter(Boolean);
  return { nodes, edges, generation: graphGeneration };
}

function generateProceduralLayout(seed) {
  const rnd = mulberry32(seed);
  const count = 14 + Math.floor(rnd() * 4);
  const nodes = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `x${i}`,
      x: 0.8 + rnd() * 10.5,
      y: 0.5 + rnd() * 7.2,
      signal: rnd() > 0.5 ? 'ns' : 'ew',
    });
  }

  const streets = [];
  const edgeSet = new Set();
  for (let i = 0; i < nodes.length; i++) {
    const dists = nodes
      .map((n, j) => ({
        j,
        d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y),
      }))
      .filter((x) => x.j !== i && x.d > 0.8 && x.d < 4.5)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);

    for (const { j } of dists) {
      if (rnd() > 0.42) continue;
      const key = `${nodes[i].id}_${nodes[j].id}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      streets.push({
        from: nodes[i].id,
        to: nodes[j].id,
        bend: makeBend(nodes[i], nodes[j], rnd),
      });
    }
  }

  if (streets.length < 12) {
    return buildGraphFromLayout(DEFAULT_INTERSECTIONS, DEFAULT_STREETS);
  }
  return buildGraphFromLayout(nodes, streets);
}

export function pathLength(path) {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  }
  return len;
}

export function positionOnPath(path, t) {
  if (!path?.length) return { x: 0, y: 0 };
  if (t <= 0) return { x: path[0][0], y: path[0][1] };
  if (t >= 1) return { x: path[path.length - 1][0], y: path[path.length - 1][1] };

  const total = pathLength(path);
  let need = t * total;

  for (let i = 1; i < path.length; i++) {
    const ax = path[i - 1][0];
    const ay = path[i - 1][1];
    const bx = path[i][0];
    const by = path[i][1];
    const seg = Math.hypot(bx - ax, by - ay);
    if (need <= seg || i === path.length - 1) {
      const u = seg > 0 ? need / seg : 0;
      return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u };
    }
    need -= seg;
  }
  const last = path[path.length - 1];
  return { x: last[0], y: last[1] };
}

export function buildCityGraph() {
  if (cachedGraph) {
    return {
      nodes: cachedGraph.nodes.map((n) => ({ ...n, waitQueue: [] })),
      edges: cachedGraph.edges.map((e) => ({ ...e })),
      generation: cachedGraph.generation,
    };
  }

  cachedGraph = buildGraphFromLayout(DEFAULT_INTERSECTIONS, DEFAULT_STREETS);
  return buildCityGraph();
}

/** New random road network (polylines); resets cached layout. */
export function regenerateCityGraph(seed = Date.now()) {
  graphGeneration += 1;
  cachedGraph = generateProceduralLayout(seed >>> 0);
  return {
    nodeCount: cachedGraph.nodes.length,
    edgeCount: cachedGraph.edges.length,
    generation: cachedGraph.generation,
  };
}

export function getStructurePayload() {
  const g = buildCityGraph();
  return {
    nodes: g.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, signal: n.signal })),
    edges: g.edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      path: e.path,
    })),
    stats: {
      nodeCount: g.nodes.length,
      edgeCount: g.edges.length,
      generation: g.generation,
    },
  };
}

export function outgoingEdges(edges, nodeIdStr) {
  return edges.filter((e) => e.from === nodeIdStr);
}
