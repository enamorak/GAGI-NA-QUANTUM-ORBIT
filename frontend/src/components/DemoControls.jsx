import { api, exportMetricsCsv } from '../api';

const SCENARIOS = [
  { id: 'bangkok_morning', label: '🌅 Rush hour' },
  { id: 'emergency', label: '🚑 Emergency wave' },
  { id: 'quantum_breakthrough', label: '⚛️ Quantum clear' },
];

export function DemoControls({
  onStateChange,
  showToast,
  metricsHistory,
  quantumNoise,
  onNoiseChange,
}) {
  const inject = async (count = 10) => {
    try {
      const res = await api.injectTraffic('all', count);
      onStateChange?.(res);
      showToast?.(`Injected ${count} rocket-ducks 🦆🚀`, 'success');
    } catch {
      showToast?.('Inject failed — is API running?', 'info');
    }
  };

  const reset = async () => {
    try {
      const res = await api.resetDemo();
      onStateChange?.({ queues: res.state?.queues, graph: res.graph });
      showToast?.('Demo reset complete', 'info');
    } catch {
      showToast?.('Reset failed', 'info');
    }
  };

  const loadScenario = async (name) => {
    try {
      const res = await api.scenario(name);
      onStateChange?.(res);
      showToast?.(`Scenario: ${name}`, 'quantum');
    } catch {
      showToast?.('Scenario load failed', 'info');
    }
  };

  const exportCsv = () => {
    const csv = exportMetricsCsv(metricsHistory || { fixed: [], quantum: [] }, 'fixed');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gagi-orbit-metrics.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast?.('Metrics exported', 'success');
  };

  const setAdvantage = async (pct) => {
    try {
      await api.setQuantumAdvantage(pct);
      showToast?.(`Quantum advantage set to ${pct}%`, 'quantum');
    } catch {
      showToast?.(`Advantage ~${pct}% (local)`, 'quantum');
    }
  };

  const setNoise = async (n) => {
    onNoiseChange?.(n);
    try {
      await api.setQuantumNoise(n);
    } catch {
      /* local */
    }
  };

  return (
    <div className="glass rounded-xl p-4 border border-dashed border-violet-500/30">
      <h4 className="font-display text-sm text-violet-300 mb-3">🎛️ Demo controls (judges)</h4>
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn-secondary text-xs" onClick={() => inject(10)}>
          Inject traffic
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={async () => {
            try {
              const g = await api.injectGraph(5, 'ambulance');
              onStateChange?.({ graph: g });
              showToast?.('🚑 Ambulance wave injected', 'success');
            } catch {
              showToast?.('Inject failed', 'info');
            }
          }}
        >
          🚑 Ambulances
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={reset}>
          Reset demo
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-2">Traffic scenarios (not navigation tabs)</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-violet-500/20"
            onClick={() => loadScenario(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <label className="text-xs text-slate-400 block mb-1">Quantum advantage %</label>
      <input
        type="range"
        min={0}
        max={50}
        defaultValue={22}
        className="w-full mb-3"
        onChange={(e) => setAdvantage(Number(e.target.value))}
      />
      <label className="text-xs text-slate-400 block mb-1">
        Quantum noise (imperfect QPU): {(quantumNoise * 100).toFixed(0)}%
      </label>
      <input
        type="range"
        min={0}
        max={90}
        value={Math.round(quantumNoise * 100)}
        className="w-full"
        onChange={(e) => setNoise(Number(e.target.value) / 100)}
      />
    </div>
  );
}
