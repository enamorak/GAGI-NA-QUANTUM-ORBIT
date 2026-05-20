import { useEffect, useState } from 'react';
import { truncateWallet } from '../hooks/useWallet';

const POLYGONSCAN =
  import.meta.env.VITE_POLYGONSCAN_URL || 'https://amoy.polygonscan.com/tx/';

export function Leaderboard({ rows = [], activity = [], highlightWallet }) {
  const [spinWallet, setSpinWallet] = useState(null);

  useEffect(() => {
    if (!highlightWallet) return;
    setSpinWallet(highlightWallet);
    const t = setTimeout(() => setSpinWallet(null), 600);
    return () => clearTimeout(t);
  }, [highlightWallet, rows]);

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl overflow-x-auto">
        <h3 className="font-display text-lg px-4 pt-4 pb-2">🏆 Active orbit participants</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-slate-400 border-b border-white/10">
            <tr>
              <th className="px-4 py-3">Duck crew</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Data points</th>
              <th className="px-4 py-3">ORBIT</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No ducks on orbit yet — generate a test wallet or join the road
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.wallet}
                  className={`border-b border-white/5 transition-all ${
                    idx === 0 ? 'bg-emerald-500/10' : 'hover:bg-white/5'
                  } ${row._new ? 'animate-pulse bg-emerald-500/20' : ''}`}
                >
                  <td className="px-4 py-3 text-2xl">
                    <span
                      className={
                        spinWallet === row.wallet ? 'inline-block animate-spin' : ''
                      }
                      style={{ animationDuration: '0.3s' }}
                    >
                      {row.duckAvatar || '🦆🚀'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-cyan-200">
                    {truncateWallet(row.wallet)}
                  </td>
                  <td className="px-4 py-3">{row.dataPoints}</td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">{row.tokens}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activity.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-sm text-slate-400 mb-3">⛓️ On-chain style activity (demo)</h4>
          <ul className="space-y-2 text-xs max-h-40 overflow-y-auto">
            {activity.map((a, i) => (
              <li key={i} className="flex flex-wrap gap-2 text-slate-300 border-b border-white/5 pb-2">
                <span>🦆</span>
                <span className="flex-1">{a.message}</span>
                {a.tx_hash && (
                  <a
                    href={`${POLYGONSCAN}${a.tx_hash.replace('...', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-500 hover:underline font-mono"
                  >
                    tx
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
