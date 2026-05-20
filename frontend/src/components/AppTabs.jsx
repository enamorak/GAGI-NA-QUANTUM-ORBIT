const TABS = [
  { id: 'simulation', label: 'Simulation', icon: '🛣️' },
  { id: 'metrics', label: 'Metrics & benchmarks', icon: '📊' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
];

export function AppTabs({ active, onChange }) {
  return (
    <nav
      className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-900/80 border border-white/10 max-w-3xl"
      role="tablist"
      aria-label="Main sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            active === tab.id
              ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
          onClick={() => onChange(tab.id)}
        >
          <span className="mr-1.5">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
