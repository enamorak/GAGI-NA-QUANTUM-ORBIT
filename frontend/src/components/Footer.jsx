const GITHUB =
  import.meta.env.VITE_GITHUB_URL ||
  'https://github.com/your-org/GAGI-NA-QUANTUM-ORBIT';
const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS || '';
const POLYGONSCAN =
  import.meta.env.VITE_POLYGONSCAN_URL || 'https://amoy.polygonscan.com/address/';

export function Footer() {
  return (
    <footer className="glass border-t border-white/10 mt-auto py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
        <div>
          <p className="font-display text-cyan-400/80">SEABW 2026 Vibe Coding Hackathon</p>
          <p>🦆 Southeast Asia Web3 · Bangkok / Ho Chi Minh</p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href={GITHUB} target="_blank" rel="noreferrer" className="hover:text-cyan-300">
            GitHub
          </a>
          {CONTRACT ? (
            <a
              href={`${POLYGONSCAN}${CONTRACT}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-300 font-mono text-xs"
            >
              Contract
            </a>
          ) : (
            <span className="text-xs">Set VITE_CONTRACT_ADDRESS after deploy</span>
          )}
        </div>
      </div>
    </footer>
  );
}
