import { useEffect, useState } from 'react';

export function QuantumExplain({ mode }) {
  const [blink, setBlink] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => b + 1), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass rounded-xl p-4 text-sm space-y-3">
      <h4 className="font-display text-violet-300">⚛️ Quantum magic explained</h4>
      <div className="flex gap-3 items-start">
        <span className="text-2xl">🐢</span>
        <p className="text-slate-400">
          <strong className="text-slate-200">Classical:</strong> tries signal phases one by one
          (fixed cycle).
        </p>
      </div>
      <div className="flex gap-3 items-start">
        <span className="text-2xl">⚛️</span>
        <p className="text-slate-400">
          <strong className="text-violet-200">Quantum (QUBO + annealing):</strong> explores many
          phases at once — picks best for current queues.
        </p>
      </div>
      <div className="flex justify-center gap-2 py-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full border-2 ${
                mode === 'quantum' && blink % 4 === i
                  ? 'border-cyan-400 bg-cyan-500/30 shadow-lg shadow-cyan-500/50'
                  : 'border-violet-600 bg-violet-900/40'
              }`}
            />
            {i < 3 && (
              <div
                className={`w-6 h-0.5 ${
                  mode === 'quantum' ? 'bg-cyan-500/50' : 'bg-violet-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 text-center">Qubit entanglement (demo visualization)</p>
    </div>
  );
}
