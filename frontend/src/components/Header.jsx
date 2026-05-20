export function Header({ wallet, onConnect }) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/orbit-icon.svg" alt="" className="w-10 h-10" />
          <div>
            <h1 className="font-display font-bold text-sm sm:text-base tracking-wide text-cyan-300">
              GAGI NA QUANTUM ORBIT
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400">🦆 Rocket-ducks · SEABW 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {wallet.isConnected && (
            <div className="text-right text-sm">
              <p className="font-mono text-cyan-300">{wallet.shortAddress}</p>
              <p className="text-emerald-400 font-semibold">{wallet.balance} ORBIT</p>
            </div>
          )}
          <button
            type="button"
            onClick={onConnect}
            disabled={wallet.connecting}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {wallet.isConnected ? '🦆 Connected' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    </header>
  );
}
