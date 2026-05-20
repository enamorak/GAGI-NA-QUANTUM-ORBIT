import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_PORT_FILE = path.join(__dirname, '..', 'runtime-port.json');
import db, {
  getQueueState,
  updateQueueState,
  upsertParticipant,
  getLeaderboard,
  getParticipant,
  appendMetric,
  getMetricsHistory,
  logActivity,
  addRandomParticipant,
  resetDemo,
  injectTraffic,
  applyScenario,
  faucetParticipant,
  setQuantumNoise,
  setImprovementPercent,
  getActivityLog,
} from './db.js';
import {
  quantumOptimize,
  fixedCyclePhases,
  nearestApproach,
} from './quantumOptimizer.js';
import {
  graphTick,
  getGraphDualState,
  injectGraphTraffic,
  addVehicleOnGraph,
  resetGraph,
  loadGraphScenario,
  regenerateRoadNetwork,
} from './graphSimulation.js';
import { runAllBenchmarks } from './benchmarks.js';
import { getStructurePayload } from './cityGraph.js';

dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

function queueTotal(queues) {
  return Object.values(queues).reduce((a, b) => a + b, 0);
}

function estimateWait(queues, mode, improvementPct, noise) {
  const base = queueTotal(queues) * 1.5;
  if (mode === 'quantum') {
    const factor = 1 - (improvementPct / 100) * (1 - (noise ?? 0.1));
    return Math.max(2, base * factor);
  }
  return base;
}

function recordMetrics(state, passed = 0) {
  const total = queueTotal(state.queues);
  const wait = estimateWait(
    state.queues,
    state.mode,
    state.improvementPercent,
    state.quantumNoise
  );
  appendMetric(state.tickCount ?? 0, total, wait, passed);
}

function spendTokens(wallet, amount) {
  const w = wallet.toLowerCase();
  db.prepare('UPDATE participants SET tokens = tokens - ? WHERE wallet = ? AND tokens >= ?').run(
    amount,
    w,
    amount
  );
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gagi-na-quantum-orbit-api', ducks: true });
});

app.get('/api/queue-state', (_req, res) => {
  res.json(getQueueState());
});

app.get('/api/metrics', (_req, res) => {
  const s = getQueueState();
  res.json({
    queueTotal: queueTotal(s.queues),
    waitSeconds: estimateWait(s.queues, s.mode, s.improvementPercent, s.quantumNoise),
    throughput: s.throughput,
    mode: s.mode,
    improvementPercent: s.improvementPercent,
  });
});

app.get('/api/metrics/history', (_req, res) => {
  const rows = getMetricsHistory(60);
  const fixed = [];
  const quantum = [];
  rows.forEach((r) => {
    const point = [r.tick % 1000, r.queue_total, r.wait_seconds];
    if (r.tick >= 1000) quantum.push(point);
    else fixed.push(point);
  });
  if (quantum.length === 0 && fixed.length > 0) {
    fixed.forEach((p) => {
      quantum.push([p[0], Math.max(4, Math.floor(p[1] * 0.72)), p[2] * 0.8]);
    });
  }
  res.json({ fixed, quantum });
});

app.get('/api/activity', (_req, res) => {
  res.json({ activity: getActivityLog() });
});

app.post('/api/join-orbit', (req, res) => {
  const { wallet, lat, lng, speed, type: bodyType } = req.body || {};
  if (!wallet || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'wallet, lat, lng required' });
  }

  const state = getQueueState();
  const queues = { ...state.queues };
  const approach = nearestApproach(lat, lng);
  queues[approach] = (queues[approach] || 0) + 1;

  const tokensAwarded = 5;
  const participant = upsertParticipant(wallet, lat, lng, speed ?? 25, tokensAwarded, 1);
  updateQueueState(queues, state.mode, state.phases, state.improvementPercent);

  const roll = Math.random();
  const vType =
    bodyType && ['duck', 'delivery', 'ambulance'].includes(bodyType)
      ? bodyType
      : roll > 0.9
        ? 'ambulance'
        : roll > 0.75
          ? 'delivery'
          : 'duck';
  const graph = addVehicleOnGraph(lat, lng, vType);

  const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
  logActivity(
    wallet,
    `${VEHICLE_LABEL(vType)} entered graph! +${tokensAwarded} ORBIT`,
    tokensAwarded,
    txHash
  );

  res.json({
    tokensAwarded,
    totalTokens: participant.tokens,
    dataPoints: participant.data_points,
    duckAvatar: participant.duck_avatar,
    queueUpdate: { approach, queues },
    vehicleType: vType,
    graph,
    txHash,
  });
});

function VEHICLE_LABEL(t) {
  return t === 'ambulance' ? '🚑 Ambulance' : t === 'delivery' ? '📦 Delivery' : '🦆 Duck';
}

app.post('/api/quantum-optimize', (req, res) => {
  const { noise } = req.body || {};
  const state = getQueueState();
  const n = typeof noise === 'number' ? noise : state.quantumNoise;
  const result = quantumOptimize(state.queues);
  const adj = Math.max(5, Math.round(result.improvementPercent * (1 - n)));
  updateQueueState(state.queues, 'quantum', result.phases, adj, { quantumNoise: n });
  logActivity(null, `Quantum tunnel: N-S ${20 + adj % 12}s, E-W ${14 + adj % 8}s ⚛️`, 0, null);
  res.json({
    phases: result.phases,
    improvementPercent: adj,
    mode: 'quantum',
    phaseDescription: `north-south ${20 + adj % 15}s, east-west ${14 + adj % 10}s`,
  });
});

app.post('/api/mode', (req, res) => {
  const { mode, noise } = req.body || {};
  const state = getQueueState();
  if (mode === 'fixed') {
    const phases = fixedCyclePhases();
    updateQueueState(state.queues, 'fixed', phases, 0);
    return res.json({ mode: 'fixed', phases, improvementPercent: 0, graph: getGraphDualState() });
  }
  if (mode === 'quantum') {
    const n = typeof noise === 'number' ? noise : state.quantumNoise ?? 0.1;
    const result = quantumOptimize(state.queues);
    const adj = Math.max(12, Math.round(result.improvementPercent * (1 - n)));
    updateQueueState(state.queues, 'quantum', result.phases, adj, { quantumNoise: n });
    return res.json({
      mode: 'quantum',
      phases: result.phases,
      improvementPercent: adj,
      phaseDescription: `north-south ${22 + adj % 12}s, east-west ${15 + adj % 8}s`,
      graph: getGraphDualState(),
    });
  }
  return res.status(400).json({ error: 'mode must be fixed or quantum' });
});

app.post('/api/tick', (_req, res) => {
  const state = getQueueState();
  const queues = { ...state.queues };
  const dirs = ['north', 'south', 'east', 'west'];
  let passed = 0;

  if (Math.random() > 0.35) {
    queues[dirs[Math.floor(Math.random() * 4)]] += 1;
  }

  const quantumBoost = state.mode === 'quantum' ? 1.35 : 1;
  const drainChance = state.mode === 'quantum' ? 0.38 : 0.52;

  if (state.phases?.north === 'green') {
    ['north', 'south'].forEach((d) => {
      while (queues[d] > 0 && Math.random() < drainChance * quantumBoost) {
        queues[d] -= 1;
        passed += 1;
      }
    });
  } else {
    ['east', 'west'].forEach((d) => {
      while (queues[d] > 0 && Math.random() < (drainChance - 0.05) * quantumBoost) {
        queues[d] -= 1;
        passed += 1;
      }
    });
  }

  const tp = (state.throughput?.[state.mode === 'quantum' ? 'quantum' : 'fixed'] || 0) + passed;
  const tickCount = (state.tickCount || 0) + 1;
  updateQueueState(queues, state.mode, state.phases, state.improvementPercent, {
    tickCount,
    [state.mode === 'quantum' ? 'throughputQuantum' : 'throughputFixed']: tp,
  });

  const newState = getQueueState();
  recordMetrics({ ...newState, tickCount }, passed);
  const graph = graphTick();
  appendMetric(tickCount, graph.fixed.queueTotal, graph.fixed.totalWait * 0.5, passed);
  appendMetric(tickCount + 1000, graph.quantum.queueTotal, graph.quantum.totalWait * 0.5, passed);
  res.json({ ...newState, graph });
});

app.get('/api/leaderboard', (_req, res) => {
  res.json({
    leaderboard: getLeaderboard().map((r, i) => ({
      rank: i + 1,
      wallet: r.wallet,
      dataPoints: r.data_points,
      tokens: r.tokens,
      duckAvatar: r.duck_avatar || '🦆🚀',
      updatedAt: r.updated_at,
    })),
  });
});

app.get('/api/participant/:wallet', (req, res) => {
  const p = getParticipant(req.params.wallet);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json({
    wallet: p.wallet,
    dataPoints: p.data_points,
    tokens: p.tokens,
    duckAvatar: p.duck_avatar,
  });
});

app.post('/api/faucet', (req, res) => {
  const { wallet, amount } = req.body || {};
  if (!wallet) return res.status(400).json({ error: 'wallet required' });
  const p = faucetParticipant(wallet, amount || 100);
  const txHash = `0xfaucet${Date.now().toString(16)}`;
  logActivity(wallet, `Test ORBIT faucet: +${amount || 100} ORBIT`, amount || 100, txHash);
  res.json({ tokens: p.tokens, txHash });
});

app.post('/api/feed-flock', (req, res) => {
  const { wallet } = req.body || {};
  if (!wallet) return res.status(400).json({ error: 'wallet required' });
  const p = getParticipant(wallet);
  if (!p || p.tokens < 10) {
    return res.status(400).json({ error: 'Need at least 10 ORBIT' });
  }
  spendTokens(wallet, 10);
  const updated = getParticipant(wallet);
  logActivity(wallet, 'Fed the flock 🌾 — +20% duck speed 10s', -10, `0xfeed${Date.now().toString(16)}`);
  res.json({
    success: true,
    boostSeconds: 10,
    speedBoost: 1.2,
    remainingTokens: updated?.tokens ?? 0,
  });
});

app.post('/api/inject-traffic', (req, res) => {
  const { direction = 'all', count = 10 } = req.body || {};
  const queues = injectTraffic(direction, count);
  const graph = injectGraphTraffic(count);
  logActivity(null, `Injected ${count} vehicles (${direction})`, 0, null);
  res.json({ queues, graph });
});

app.post('/api/reset-demo', (_req, res) => {
  resetDemo();
  const graph = resetGraph();
  logActivity(null, 'Demo reset — graph cleared', 0, null);
  res.json({ ok: true, state: getQueueState(), graph });
});

app.post('/api/scenario', (req, res) => {
  const { name } = req.body || {};
  const queues = applyScenario(name || 'bangkok_morning');
  const graph = loadGraphScenario(name || 'bangkok_morning');
  res.json({ queues, name, graph });
});

app.get('/api/graph/structure', (_req, res) => {
  res.json(getStructurePayload());
});

app.get('/api/graph/state', (_req, res) => {
  res.json(getGraphDualState());
});

app.post('/api/graph/tick', (_req, res) => {
  res.json(graphTick());
});

app.post('/api/graph/inject', (req, res) => {
  const { count = 15, type } = req.body || {};
  const graph = injectGraphTraffic(count, type || null);
  res.json(graph);
});

app.post('/api/graph/regenerate', (req, res) => {
  const seed = Number(req.body?.seed) || Date.now();
  const result = regenerateRoadNetwork(seed);
  logActivity(null, `Road network regenerated (#${result.network?.generation})`, 0, null);
  res.json(result);
});

app.get('/api/benchmarks', (_req, res) => {
  res.json(runAllBenchmarks());
});

app.post('/api/demo/quantum-advantage', (req, res) => {
  const p = Math.min(50, Math.max(0, Number(req.body?.percent) || 22));
  setImprovementPercent(p);
  res.json({ improvementPercent: p, graph: getGraphDualState() });
});

app.post('/api/demo/quantum-noise', (req, res) => {
  const n = Math.min(0.9, Math.max(0, Number(req.body?.noise) ?? 0.1));
  setQuantumNoise(n);
  res.json({ quantumNoise: n, graph: getGraphDualState() });
});

setInterval(() => {
  try {
    addRandomParticipant();
  } catch (e) {
    console.warn('random participant', e.message);
  }
}, 15000);

function writeRuntimePort(port) {
  try {
    fs.writeFileSync(
      RUNTIME_PORT_FILE,
      JSON.stringify({ port, url: `http://localhost:${port}` }, null, 2)
    );
  } catch (e) {
    console.warn('Could not write runtime-port.json', e.message);
  }
}

function startServer(port) {
  const server = app.listen(port, () => {
    writeRuntimePort(port);
    console.log(`GAGI NA QUANTUM ORBIT API on http://localhost:${port}`);
    console.log(`Health: http://localhost:${port}/health`);
    if (port !== 3001) {
      console.log(
        `Note: Vite reads backend/runtime-port.json — restart "npm run dev" in frontend if proxy was stale.`
      );
    }
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      server.close(() => {
        if (port < 3010) {
          console.warn(`Port ${port} busy, trying ${port + 1}...`);
          startServer(port + 1);
        } else {
          console.error('No free port 3001-3010. Run: npm run dev:clean');
          process.exit(1);
        }
      });
      return;
    }
    throw err;
  });
}

function shutdown() {
  try {
    if (fs.existsSync(RUNTIME_PORT_FILE)) fs.unlinkSync(RUNTIME_PORT_FILE);
  } catch {
    /* */
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer(Number(process.env.PORT) || 3001);
