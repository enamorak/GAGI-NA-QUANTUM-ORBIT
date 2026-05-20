import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'orbit.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    wallet TEXT PRIMARY KEY,
    data_points INTEGER DEFAULT 0,
    tokens INTEGER DEFAULT 0,
    duck_avatar TEXT DEFAULT '🦆🚀',
    last_lat REAL,
    last_lng REAL,
    last_speed REAL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS queue_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    north INTEGER DEFAULT 3,
    south INTEGER DEFAULT 2,
    east INTEGER DEFAULT 4,
    west INTEGER DEFAULT 2,
    mode TEXT DEFAULT 'fixed',
    phases_json TEXT DEFAULT '{}',
    improvement_percent INTEGER DEFAULT 22,
    quantum_noise REAL DEFAULT 0.1,
    tick_count INTEGER DEFAULT 0,
    throughput_fixed INTEGER DEFAULT 0,
    throughput_quantum INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tick INTEGER NOT NULL,
    queue_total INTEGER NOT NULL,
    wait_seconds REAL NOT NULL,
    throughput INTEGER DEFAULT 0,
    recorded_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT,
    message TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    tx_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO queue_state (id) VALUES (1);
`);

function migrate() {
  const cols = [
    ['participants', 'duck_avatar', "TEXT DEFAULT '🦆🚀'"],
    ['queue_state', 'quantum_noise', 'REAL DEFAULT 0.1'],
    ['queue_state', 'tick_count', 'INTEGER DEFAULT 0'],
    ['queue_state', 'throughput_fixed', 'INTEGER DEFAULT 0'],
    ['queue_state', 'throughput_quantum', 'INTEGER DEFAULT 0'],
  ];
  for (const [table, col, def] of cols) {
    try {
      db.prepare(`SELECT ${col} FROM ${table} LIMIT 1`).get();
    } catch {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    }
  }
}
migrate();

const DUCK_AVATARS = ['🦆🚀', '🦆🧑‍🚀', '🦆🌌', '🦆⚛️', '🦆🔮'];

export function getQueueState() {
  const row = db.prepare('SELECT * FROM queue_state WHERE id = 1').get();
  let phases = {};
  try {
    phases = JSON.parse(row.phases_json || '{}');
  } catch {
    phases = {};
  }
  const queues = {
    north: row.north,
    south: row.south,
    east: row.east,
    west: row.west,
  };
  const queueTotal = Object.values(queues).reduce((a, b) => a + b, 0);
  return {
    queues,
    mode: row.mode,
    phases,
    improvementPercent: row.improvement_percent,
    quantumNoise: row.quantum_noise ?? 0.1,
    tickCount: row.tick_count ?? 0,
    queueTotal,
    throughput: {
      fixed: row.throughput_fixed ?? 0,
      quantum: row.throughput_quantum ?? 0,
    },
  };
}

export function updateQueueState(queues, mode, phases, improvementPercent = 0, extra = {}) {
  const row = db.prepare('SELECT * FROM queue_state WHERE id = 1').get();
  db.prepare(
    `UPDATE queue_state SET
      north = ?, south = ?, east = ?, west = ?,
      mode = ?, phases_json = ?, improvement_percent = ?,
      quantum_noise = COALESCE(?, quantum_noise),
      tick_count = COALESCE(?, tick_count),
      throughput_fixed = COALESCE(?, throughput_fixed),
      throughput_quantum = COALESCE(?, throughput_quantum)
     WHERE id = 1`
  ).run(
    queues.north,
    queues.south,
    queues.east,
    queues.west,
    mode,
    JSON.stringify(phases),
    improvementPercent,
    extra.quantumNoise ?? null,
    extra.tickCount ?? null,
    extra.throughputFixed ?? null,
    extra.throughputQuantum ?? null
  );
}

export function setQuantumNoise(noise) {
  db.prepare('UPDATE queue_state SET quantum_noise = ? WHERE id = 1').run(noise);
}

export function setImprovementPercent(pct) {
  db.prepare('UPDATE queue_state SET improvement_percent = ? WHERE id = 1').run(pct);
}

export function upsertParticipant(wallet, lat, lng, speed, tokensAdd, dataPointsAdd = 1) {
  const w = wallet.toLowerCase();
  const existing = db.prepare('SELECT * FROM participants WHERE wallet = ?').get(w);
  const avatar = DUCK_AVATARS[Math.floor(Math.random() * DUCK_AVATARS.length)];
  if (existing) {
    db.prepare(
      `UPDATE participants SET
        data_points = data_points + ?,
        tokens = tokens + ?,
        last_lat = ?, last_lng = ?, last_speed = ?,
        updated_at = datetime('now')
       WHERE wallet = ?`
    ).run(dataPointsAdd, tokensAdd, lat, lng, speed, w);
  } else {
    db.prepare(
      `INSERT INTO participants (wallet, data_points, tokens, duck_avatar, last_lat, last_lng, last_speed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(w, dataPointsAdd, tokensAdd, avatar, lat, lng, speed);
  }
  return db.prepare('SELECT * FROM participants WHERE wallet = ?').get(w);
}

export function faucetParticipant(wallet, amount = 100) {
  const w = wallet.toLowerCase();
  const existing = db.prepare('SELECT * FROM participants WHERE wallet = ?').get(w);
  const avatar = DUCK_AVATARS[Math.floor(Math.random() * DUCK_AVATARS.length)];
  if (existing) {
    db.prepare('UPDATE participants SET tokens = tokens + ? WHERE wallet = ?').run(amount, w);
  } else {
    db.prepare(
      `INSERT INTO participants (wallet, data_points, tokens, duck_avatar)
       VALUES (?, 0, ?, ?)`
    ).run(w, amount, avatar);
  }
  return db.prepare('SELECT * FROM participants WHERE wallet = ?').get(w);
}

export function getLeaderboard(limit = 20) {
  return db
    .prepare(
      `SELECT wallet, data_points, tokens, duck_avatar, updated_at
       FROM participants ORDER BY tokens DESC, data_points DESC LIMIT ?`
    )
    .all(limit);
}

export function getParticipant(wallet) {
  return db.prepare('SELECT * FROM participants WHERE wallet = ?').get(wallet?.toLowerCase());
}

export function appendMetric(tick, queueTotal, waitSeconds, throughput = 0) {
  db.prepare(
    `INSERT INTO metrics_history (tick, queue_total, wait_seconds, throughput) VALUES (?, ?, ?, ?)`
  ).run(tick, queueTotal, waitSeconds, throughput);
  const count = db.prepare('SELECT COUNT(*) as c FROM metrics_history').get().c;
  if (count > 120) {
    db.prepare(
      `DELETE FROM metrics_history WHERE id IN (
        SELECT id FROM metrics_history ORDER BY id ASC LIMIT ?
      )`
    ).run(count - 80);
  }
}

export function getMetricsHistory(limit = 60) {
  return db
    .prepare(
      `SELECT tick, queue_total, wait_seconds, throughput, recorded_at
       FROM metrics_history ORDER BY id DESC LIMIT ?`
    )
    .all(limit)
    .reverse();
}

export function seedMetricsIfEmpty() {
  const c = db.prepare('SELECT COUNT(*) as n FROM metrics_history').get().n;
  if (c > 0) return;
  let qFixed = 28;
  let qQuantum = 22;
  for (let t = 0; t < 30; t++) {
    qFixed = Math.min(45, qFixed + Math.floor(Math.random() * 3));
    qQuantum = Math.max(8, qQuantum + Math.floor(Math.random() * 2) - 2);
    if (t > 15) qQuantum = Math.max(6, qQuantum - 1);
    appendMetric(t, qFixed, qFixed * 1.4, Math.floor(Math.random() * 3));
    appendMetric(t + 1000, qQuantum, qQuantum * 0.85, Math.floor(Math.random() * 5));
  }
}

export function clearMetrics() {
  db.prepare('DELETE FROM metrics_history').run();
  seedMetricsIfEmpty();
}

export function logActivity(wallet, message, tokens = 0, txHash = null) {
  db.prepare(
    `INSERT INTO activity_log (wallet, message, tokens, tx_hash) VALUES (?, ?, ?, ?)`
  ).run(wallet?.toLowerCase() || null, message, tokens, txHash);
  const count = db.prepare('SELECT COUNT(*) as c FROM activity_log').get().c;
  if (count > 50) {
    db.prepare(
      `DELETE FROM activity_log WHERE id IN (
        SELECT id FROM activity_log ORDER BY id ASC LIMIT ?
      )`
    ).run(count - 40);
  }
}

export function getActivityLog(limit = 15) {
  return db
    .prepare(
      `SELECT wallet, message, tokens, tx_hash, created_at FROM activity_log
       ORDER BY id DESC LIMIT ?`
    )
    .all(limit);
}

export function addRandomParticipant() {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const wallet = `0x${Array.from({ length: 40 }, hex).join('')}`;
  const points = 1 + Math.floor(Math.random() * 10);
  const tokens = points * (2 + Math.floor(Math.random() * 4));
  upsertParticipant(
    wallet,
    13.75 + Math.random() * 0.02,
    100.5 + Math.random() * 0.02,
    15 + Math.random() * 40,
    tokens,
    points
  );
  logActivity(
    wallet,
    `Duck ${wallet.slice(0, 6)}... shared route → +${tokens} ORBIT`,
    tokens,
    `0x${Array.from({ length: 8 }, hex).join('')}...`
  );
  return wallet;
}

export function resetDemo() {
  db.prepare(
    `UPDATE queue_state SET north=4, south=3, east=5, west=3, mode='fixed',
     phases_json='{"north":"green","south":"green","east":"red","west":"red"}',
     improvement_percent=22, quantum_noise=0.1, tick_count=0,
     throughput_fixed=0, throughput_quantum=0 WHERE id=1`
  ).run();
  db.prepare('DELETE FROM metrics_history').run();
  seedMetricsIfEmpty();
}

export function injectTraffic(direction, count) {
  const state = getQueueState();
  const queues = { ...state.queues };
  const dirs = direction === 'all' ? ['north', 'south', 'east', 'west'] : [direction];
  for (let i = 0; i < count; i++) {
    const d = dirs[i % dirs.length];
    queues[d] = (queues[d] || 0) + 1;
  }
  updateQueueState(queues, state.mode, state.phases, state.improvementPercent);
  return queues;
}

export function applyScenario(name) {
  const scenarios = {
    bangkok_morning: { north: 12, south: 11, east: 4, west: 3 },
    hanoi_peak: { north: 5, south: 3, east: 14, west: 2 },
    quantum_breakthrough: { north: 2, south: 2, east: 2, west: 2 },
  };
  const queues = scenarios[name] || scenarios.bangkok_morning;
  const state = getQueueState();
  updateQueueState(queues, state.mode, state.phases, state.improvementPercent);
  return queues;
}

seedMetricsIfEmpty();

export default db;
