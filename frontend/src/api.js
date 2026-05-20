const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  getQueueState: () => request('/api/queue-state'),
  getMetrics: () => request('/api/metrics'),
  getMetricsHistory: () => request('/api/metrics/history'),
  getActivity: () => request('/api/activity'),
  getGraphState: () => request('/api/graph/state'),
  graphTick: () => request('/api/graph/tick'),
  joinOrbit: (body) =>
    request('/api/join-orbit', { method: 'POST', body: JSON.stringify(body) }),
  quantumOptimize: (body) =>
    request('/api/quantum-optimize', {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  setMode: (mode, noise) =>
    request('/api/mode', {
      method: 'POST',
      body: JSON.stringify({ mode, noise }),
    }),
  tick: () => request('/api/tick', { method: 'POST' }),
  getLeaderboard: () => request('/api/leaderboard'),
  getParticipant: (wallet) => request(`/api/participant/${wallet}`),
  faucet: (wallet, amount) =>
    request('/api/faucet', {
      method: 'POST',
      body: JSON.stringify({ wallet, amount }),
    }),
  feedFlock: (wallet) =>
    request('/api/feed-flock', { method: 'POST', body: JSON.stringify({ wallet }) }),
  injectTraffic: (direction, count) =>
    request('/api/inject-traffic', {
      method: 'POST',
      body: JSON.stringify({ direction, count }),
    }),
  injectGraph: (count, type) =>
    request('/api/graph/inject', {
      method: 'POST',
      body: JSON.stringify({ count, type }),
    }),
  regenerateRoads: (seed) =>
    request('/api/graph/regenerate', {
      method: 'POST',
      body: JSON.stringify(seed != null ? { seed } : {}),
    }),
  getBenchmarks: () => request('/api/benchmarks'),
  resetDemo: () => request('/api/reset-demo', { method: 'POST' }),
  scenario: (name) =>
    request('/api/scenario', { method: 'POST', body: JSON.stringify({ name }) }),
  setQuantumAdvantage: (percent) =>
    request('/api/demo/quantum-advantage', {
      method: 'POST',
      body: JSON.stringify({ percent }),
    }),
  setQuantumNoise: (noise) =>
    request('/api/demo/quantum-noise', {
      method: 'POST',
      body: JSON.stringify({ noise }),
    }),

  async syncAll() {
    const [queueState, leaderboard, metricsHistory, activity, graph] = await Promise.all([
      request('/api/queue-state'),
      request('/api/leaderboard'),
      request('/api/metrics/history'),
      request('/api/activity'),
      request('/api/graph/state'),
    ]);
    return { queueState, leaderboard, metricsHistory, activity, graph };
  },
};

export function exportMetricsCsv(history, mode) {
  const lines = ['tick,queue_total,wait_seconds,mode'];
  const series = mode === 'quantum' ? history.quantum : history.fixed;
  series?.forEach(([t, q, w]) => lines.push(`${t},${q},${w},${mode}`));
  return lines.join('\n');
}
