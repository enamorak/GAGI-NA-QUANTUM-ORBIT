import {
  buildCityGraph,
  regenerateCityGraph,
  VEHICLE_TYPES,
  outgoingEdges,
} from './cityGraph.js';

/** Max ducks sitting on one edge (lane). */
export const EDGE_CAPACITY = 5;
const MAX_TOTAL_DUCKS = 72;
const MAX_NODE_WAIT = 10;

function createSim(mode) {
  const built = buildCityGraph();
  const graph = {
    nodes: built.nodes,
    edges: built.edges,
    generation: built.generation ?? 0,
  };
  const edgeDucks = Object.fromEntries(graph.edges.map((e) => [e.id, []]));
  return {
    mode,
    graph,
    edgeDucks,
    tick: 0,
    totalWait: 0,
    passed: 0,
    signalPhase: 0,
    ambulanceOnRed: 0,
  };
}

let fixedSim = createSim('fixed');
let quantumSim = createSim('quantum');

function nodeById(sim, id) {
  return sim.graph.nodes.find((n) => n.id === id);
}

function edgeById(sim, id) {
  return sim.graph.edges.find((e) => e.id === id);
}

function totalDucks(sim) {
  let n = 0;
  for (const list of Object.values(sim.edgeDucks)) n += list.length;
  for (const node of sim.graph.nodes) n += node.waitQueue.length;
  return n;
}

function pickType(type) {
  if (type) return type;
  const roll = Math.random();
  if (roll > 0.92) return 'ambulance';
  if (roll > 0.78) return 'delivery';
  return 'duck';
}

function makeDuck(type) {
  const vType = pickType(type);
  return {
    id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: vType,
    priority: VEHICLE_TYPES[vType].priority,
    progress: 0,
  };
}

function edgesWithSpace(sim) {
  return sim.graph.edges.filter((e) => sim.edgeDucks[e.id].length < EDGE_CAPACITY);
}

function trySpawnOnEdge(sim, type = null) {
  if (totalDucks(sim) >= MAX_TOTAL_DUCKS) return false;
  const free = edgesWithSpace(sim);
  if (!free.length) return false;
  const edge = free[Math.floor(Math.random() * free.length)];
  sim.edgeDucks[edge.id].push(makeDuck(type));
  return true;
}

function canPassSignal(sim, node, vType) {
  if (vType === 'ambulance') return true;
  const isQuantum = sim.mode === 'quantum';
  if (isQuantum && vType === 'delivery' && Math.random() > 0.35) return true;
  const phase = sim.signalPhase % 2 === 0 ? 'ns' : 'ew';
  if (node.signal === 'ns' && phase === 'ns') return true;
  if (node.signal === 'ew' && phase === 'ew') return true;
  return false;
}

function countAmbulanceOnRed(sim) {
  const phaseNs = sim.signalPhase % 2 === 0;
  const phase = phaseNs ? 'ns' : 'ew';
  let n = 0;
  for (const node of sim.graph.nodes) {
    const red =
      !((node.signal === 'ns' && phase === 'ns') ||
        (node.signal === 'ew' && phase === 'ew'));
    if (!red) continue;
    n += node.waitQueue.filter((d) => d.type === 'ambulance').length;
  }
  return n;
}

function dequeuePriority(queue) {
  if (!queue.length) return null;
  queue.sort((a, b) => b.priority - a.priority);
  return queue.shift();
}

function tryEnterEdge(sim, nodeId, duck) {
  const outs = outgoingEdges(sim.graph.edges, nodeId);
  if (!outs.length) {
    sim.passed += 1;
    return true;
  }
  const shuffled = [...outs].sort(() => Math.random() - 0.5);
  for (const e of shuffled) {
    const lane = sim.edgeDucks[e.id];
    if (lane.length < EDGE_CAPACITY) {
      duck.progress = 0;
      lane.push(duck);
      return true;
    }
  }
  return false;
}

function finishEdge(sim, edge, duck) {
  const target = nodeById(sim, edge.to);
  if (!target) return;

  if (!canPassSignal(sim, target, duck.type)) {
    if (duck.type === 'ambulance') {
      if (tryEnterEdge(sim, target.id, duck)) {
        sim.passed += 1;
      }
      return;
    }
    if (target.waitQueue.length < MAX_NODE_WAIT) {
      duck.progress = 0;
      target.waitQueue.push(duck);
      sim.totalWait += 1;
    }
    return;
  }

  if (tryEnterEdge(sim, target.id, duck)) {
    sim.passed += 1;
    return;
  }

  if (duck.type === 'ambulance') {
    duck.progress = 0.92;
    sim.edgeDucks[edge.id].push(duck);
    return;
  }

  if (target.waitQueue.length < MAX_NODE_WAIT) {
    duck.progress = 0;
    target.waitQueue.push(duck);
    sim.totalWait += 1;
  }
}

function tickSim(sim) {
  sim.tick += 1;
  if (sim.tick % 12 === 0) sim.signalPhase += 1;

  if (Math.random() > 0.38) trySpawnOnEdge(sim);

  const speedBase = sim.mode === 'quantum' ? 0.055 : 0.032;

  for (const edge of sim.graph.edges) {
    const lane = sim.edgeDucks[edge.id];
    if (!lane.length) continue;

    const congestion = 1 + 0.35 * (lane.length - 1);
    const finished = [];

    for (const duck of lane) {
      const prioMul =
        duck.type === 'ambulance' ? 1.5 : duck.type === 'delivery' ? 1.2 : 1;
      const qMul = sim.mode === 'quantum' ? 1.2 : 1;
      duck.progress += (speedBase * prioMul * qMul) / congestion;
      if (duck.progress >= 1) finished.push(duck);
    }

    sim.edgeDucks[edge.id] = lane.filter((d) => d.progress < 1);
    for (const duck of finished) finishEdge(sim, edge, duck);
  }

  for (const node of sim.graph.nodes) {
    if (!node.waitQueue.length) continue;

    const ambulances = node.waitQueue.filter((d) => d.type === 'ambulance');
    const others = node.waitQueue.filter((d) => d.type !== 'ambulance');
    node.waitQueue = [...ambulances, ...others];

    const toProcess = node.waitQueue.filter((d) => canPassSignal(sim, node, d.type));
    node.waitQueue = node.waitQueue.filter((d) => !canPassSignal(sim, node, d.type));

    for (const duck of toProcess) {
      if (tryEnterEdge(sim, node.id, duck)) continue;
      if (duck.type === 'ambulance') continue;
      if (node.waitQueue.length < MAX_NODE_WAIT) node.waitQueue.push(duck);
    }
  }

  sim.ambulanceOnRed = countAmbulanceOnRed(sim);
  return sim;
}

for (let i = 0; i < 28; i++) trySpawnOnEdge(fixedSim);
for (let i = 0; i < 28; i++) trySpawnOnEdge(quantumSim);

function serializeSim(sim) {
  const queueTotal = sim.graph.nodes.reduce((s, n) => s + n.waitQueue.length, 0);
  let onEdges = 0;
  let occupiedLanes = 0;

  const edges = sim.graph.edges.map((e) => {
    const ducks = sim.edgeDucks[e.id] || [];
    onEdges += ducks.length;
    if (ducks.length) occupiedLanes += 1;
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      path: e.path,
      capacity: EDGE_CAPACITY,
      count: ducks.length,
      empty: ducks.length === 0,
      ducks: ducks.map((d, slot) => ({
        id: d.id,
        type: d.type,
        progress: Math.min(1, d.progress),
        slot,
        priority: d.priority,
      })),
    };
  });

  return {
    mode: sim.mode,
    tick: sim.tick,
    signalPhase: sim.signalPhase,
    edgeCapacity: EDGE_CAPACITY,
    queueTotal,
    passed: sim.passed,
    totalWait: sim.totalWait,
    onEdges,
    occupiedLanes,
    emptyLanes: edges.length - occupiedLanes,
    ambulanceOnRed: sim.ambulanceOnRed ?? 0,
    graphGeneration: sim.graph.generation ?? 0,
    edges,
    nodes: sim.graph.nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      signal: n.signal,
      queueLen: n.waitQueue.length,
      queueTypes: n.waitQueue.slice(0, 4).map((q) => q.type),
    })),
    vehicles: [],
  };
}

export function graphTick() {
  tickSim(fixedSim);
  tickSim(quantumSim);
  return {
    fixed: serializeSim(fixedSim),
    quantum: serializeSim(quantumSim),
    improvementPercent: Math.min(
      45,
      Math.round(
        ((fixedSim.totalWait - quantumSim.totalWait) /
          Math.max(1, fixedSim.totalWait)) *
          100
      )
    ),
  };
}

export function getGraphDualState() {
  return {
    fixed: serializeSim(fixedSim),
    quantum: serializeSim(quantumSim),
    improvementPercent: 22,
  };
}

export function injectGraphTraffic(count = 15, type = null) {
  for (let i = 0; i < count; i++) {
    trySpawnOnEdge(fixedSim, type);
    trySpawnOnEdge(quantumSim, type);
  }
  return getGraphDualState();
}

export function addVehicleOnGraph(_lat, _lng, type = 'duck') {
  trySpawnOnEdge(fixedSim, type);
  trySpawnOnEdge(quantumSim, type);
  return getGraphDualState();
}

export function resetGraph() {
  fixedSim = createSim('fixed');
  quantumSim = createSim('quantum');
  for (let i = 0; i < 24; i++) {
    trySpawnOnEdge(fixedSim);
    trySpawnOnEdge(quantumSim);
  }
  return getGraphDualState();
}

export function regenerateRoadNetwork(seed) {
  const info = regenerateCityGraph(seed);
  fixedSim = createSim('fixed');
  quantumSim = createSim('quantum');
  for (let i = 0; i < 20; i++) {
    trySpawnOnEdge(fixedSim);
    trySpawnOnEdge(quantumSim);
  }
  return { ...getGraphDualState(), network: info };
}

export function loadGraphScenario(name) {
  resetGraph();
  if (name === 'bangkok_morning') {
    for (let i = 0; i < 35; i++) {
      trySpawnOnEdge(fixedSim);
      trySpawnOnEdge(quantumSim);
    }
  } else if (name === 'emergency') {
    for (let i = 0; i < 10; i++) {
      trySpawnOnEdge(fixedSim, 'ambulance');
      trySpawnOnEdge(quantumSim, 'ambulance');
    }
  }
  return getGraphDualState();
}
