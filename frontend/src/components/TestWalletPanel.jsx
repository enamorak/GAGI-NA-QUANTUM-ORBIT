import { useState } from 'react';
import { Wallet } from 'ethers';
import { api } from '../api';

const PRESET = [
  { label: 'Duck Alpha', emoji: '🦆🚀' },
  { label: 'Duck Beta', emoji: '🦆🌌' },
  { label: 'Duck Gamma', emoji: '🦆⚛️' },
];

export function TestWalletPanel({ onConnect, connectedAddress, onFaucet, showToast }) {
  const [collapsed, setCollapsed] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [showKey, setShowKey] = useState(false);

  const generate = async () => {
    const w = Wallet.createRandom();
    setGenerated({ address: w.address, privateKey: w.privateKey });
    onConnect?.(w.address);
    showToast?.(`Test wallet ${w.address.slice(0, 8)}... ready 🦆`, 'success');
    try {
      await api.faucet(w.address, 100);
      onFaucet?.(100);
    } catch {
      onFaucet?.(100);
    }
  };

  const connectPreset = async (i) => {
    const w = Wallet.createRandom();
    setGenerated({ address: w.address, privateKey: w.privateKey, preset: PRESET[i] });
    onConnect?.(w.address);
    try {
      const res = await api.faucet(w.address, 1000);
      onFaucet?.(res.tokens);
      showToast?.(`${PRESET[i].emoji} ${PRESET[i].label} — 1000 ORBIT`, 'success');
    } catch {
      onFaucet?.(1000);
      showToast?.(`${PRESET[i].emoji} preset wallet (local demo)`, 'success');
    }
  };

  const requestFaucet = async () => {
    const addr = connectedAddress || generated?.address;
    if (!addr) {
      showToast?.('Generate or connect a wallet first', 'info');
      return;
    }
    try {
      const res = await api.faucet(addr, 100);
      onFaucet?.(res.tokens);
      showToast?.('+100 ORBIT on test wallet 🪙', 'success');
    } catch {
      onFaucet?.(100);
      showToast?.('+100 ORBIT (local demo)', 'success');
    }
  };

  return (
    <div className="glass rounded-xl border border-amber-500/20 overflow-hidden">
      <button
        type="button"
        className="w-full px-4 py-3 flex justify-between items-center text-left text-sm font-semibold text-amber-200"
        onClick={() => setCollapsed(!collapsed)}
      >
        🧪 Test Wallets (SEABW demo)
        <span>{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10">
          <p className="text-xs text-slate-400 pt-2">
            Generate ephemeral wallets. Import key in MetaMask: Account → Import.
          </p>
          <button type="button" className="btn-secondary w-full text-sm" onClick={generate}>
            Generate test wallet
          </button>
          {generated && (
            <div className="text-xs font-mono bg-black/30 rounded-lg p-3 space-y-1">
              <p className="text-cyan-300 break-all">{generated.address}</p>
              <button
                type="button"
                className="text-violet-400 underline"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Hide' : 'Show'} private key
              </button>
              {showKey && (
                <p className="text-red-300/80 break-all text-[10px]">{generated.privateKey}</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {PRESET.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
                onClick={() => connectPreset(i)}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary w-full text-sm" onClick={requestFaucet}>
            Request test ORBIT (+100)
          </button>
        </div>
      )}
    </div>
  );
}
