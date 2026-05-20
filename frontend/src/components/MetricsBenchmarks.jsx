import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

function fmt(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toFixed(digits);
}

export function MetricsBenchmarks({ liveGraph }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getBenchmarks();
      setData(res);
    } catch (e) {
      setError(e.message || 'Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const live = liveGraph
    ? {
        id: 'live',
        label: 'Live simulation (current)',
        fixed: {
          avgWait: liveGraph.fixed?.totalWait / Math.max(1, liveGraph.fixed?.passed),
          queueTotal: liveGraph.fixed?.queueTotal,
          passed: liveGraph.fixed?.passed,
          ambulanceOnRed: liveGraph.fixed?.ambulanceOnRed ?? 0,
        },
        quantum: {
          avgWait: liveGraph.quantum?.totalWait / Math.max(1, liveGraph.quantum?.passed),
          queueTotal: liveGraph.quantum?.queueTotal,
          passed: liveGraph.quantum?.passed,
          ambulanceOnRed: liveGraph.quantum?.ambulanceOnRed ?? 0,
        },
        delta: {
          waitImprovePercent: liveGraph.improvementPercent ?? 0,
          queueImprovePercent: 0,
          passedDelta:
            (liveGraph.quantum?.passed ?? 0) - (liveGraph.fixed?.passed ?? 0),
        },
      }
    : null;

  const rows = data?.cases ? (live ? [live, ...data.cases] : data.cases) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-cyan-300">Algorithm comparison</h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            Classical fixed-cycle vs Quantum Orbit (QUBO + annealing) across traffic cases.
            {data?.ticksSimulated != null && (
              <span> Each case: {data.ticksSimulated} simulation ticks.</span>
            )}
          </p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={load} disabled={loading}>
          {loading ? 'Running…' : '↻ Re-run benchmarks'}
        </button>
      </div>

      {error && (
        <p className="text-amber-300 text-sm bg-amber-950/40 border border-amber-500/30 rounded-lg px-3 py-2">
          {error} — start the backend API first.
        </p>
      )}

      {data?.algorithm && (
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="glass rounded-lg p-3 border border-blue-500/20">
            <span className="text-blue-300 font-semibold">Classical</span>
            <p className="text-slate-400 mt-1">{data.algorithm.classical}</p>
          </div>
          <div className="glass rounded-lg p-3 border border-violet-500/20">
            <span className="text-violet-300 font-semibold">Quantum Orbit</span>
            <p className="text-slate-400 mt-1">{data.algorithm.quantum}</p>
          </div>
        </div>
      )}

      <div className="glass rounded-xl overflow-x-auto border border-white/10">
        <table className="w-full text-sm text-left min-w-[900px]">
          <thead className="text-slate-400 border-b border-white/10 bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 sticky left-0 bg-slate-900/90">Case</th>
              <th className="px-3 py-3" colSpan={4}>
                Classical
              </th>
              <th className="px-3 py-3" colSpan={4}>
                Quantum Orbit
              </th>
              <th className="px-3 py-3" colSpan={3}>
                Δ Quantum vs classical
              </th>
            </tr>
            <tr className="text-[10px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 sticky left-0 bg-slate-900/90" />
              <th className="px-2 py-2">Avg wait</th>
              <th className="px-2 py-2">Queue</th>
              <th className="px-2 py-2">Passed</th>
              <th className="px-2 py-2">🚑 on red</th>
              <th className="px-2 py-2">Avg wait</th>
              <th className="px-2 py-2">Queue</th>
              <th className="px-2 py-2">Passed</th>
              <th className="px-2 py-2">🚑 on red</th>
              <th className="px-2 py-2">Wait ↓%</th>
              <th className="px-2 py-2">Queue ↓%</th>
              <th className="px-2 py-2">Passed +</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                  No benchmark data yet
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id || row.label}
                className={`border-b border-white/5 hover:bg-white/5 ${
                  row.label?.includes('Live') ? 'bg-cyan-950/20' : ''
                }`}
              >
                <td className="px-4 py-3 font-medium text-slate-200 sticky left-0 bg-orbit-dark/95">
                  {row.label}
                </td>
                <td className="px-2 py-3 text-red-200/90">{fmt(row.fixed?.avgWait)}</td>
                <td className="px-2 py-3">{row.fixed?.queueTotal ?? '—'}</td>
                <td className="px-2 py-3">{row.fixed?.passed ?? '—'}</td>
                <td className="px-2 py-3">
                  <span
                    className={
                      row.fixed?.ambulanceOnRed > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'
                    }
                  >
                    {row.fixed?.ambulanceOnRed ?? 0}
                  </span>
                </td>
                <td className="px-2 py-3 text-emerald-200/90">{fmt(row.quantum?.avgWait)}</td>
                <td className="px-2 py-3">{row.quantum?.queueTotal ?? '—'}</td>
                <td className="px-2 py-3">{row.quantum?.passed ?? '—'}</td>
                <td className="px-2 py-3">
                  <span
                    className={
                      row.quantum?.ambulanceOnRed > 0
                        ? 'text-red-400 font-bold'
                        : 'text-emerald-400'
                    }
                  >
                    {row.quantum?.ambulanceOnRed ?? 0}
                  </span>
                </td>
                <td className="px-2 py-3 text-violet-300">
                  {row.delta?.waitImprovePercent != null
                    ? `${row.delta.waitImprovePercent}%`
                    : '—'}
                </td>
                <td className="px-2 py-3 text-violet-300">
                  {row.delta?.queueImprovePercent != null
                    ? `${row.delta.queueImprovePercent}%`
                    : '—'}
                </td>
                <td className="px-2 py-3 text-violet-300">
                  {row.delta?.passedDelta != null ? `+${row.delta.passedDelta}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Ambulances must never wait on red (target: 0 in all cases). Delivery gets quantum
        fast-lane; classical uses strict signal phases.
      </p>
    </div>
  );
}
