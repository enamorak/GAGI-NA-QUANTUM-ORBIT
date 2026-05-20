export function Hero({ onJoin, onSim }) {
  return (
    <section className="relative overflow-hidden py-16 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 to-transparent pointer-events-none" />
      <div className="max-w-4xl mx-auto text-center relative">
        <p className="text-cyan-400 font-display text-xs tracking-[0.25em] mb-3">
          GAGI NA · YOUR PEOPLE ON THE CITY&apos;S QUANTUM ORBIT
        </p>
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
          Ducks on the quantum graph
        </h2>
        <p className="text-slate-300 max-w-2xl mx-auto mb-4 text-sm sm:text-base">
          Huge city graph — watch 🦆 📦 🚑 move on edges. Classical vs Quantum Orbit side by side —{' '}
          <span className="text-violet-300">ambulance priority & shorter queues</span>.
        </p>
        <p className="text-xs text-slate-500 max-w-xl mx-auto mb-8 italic">
          Why ducks on rockets? Gagi Na means &quot;your own people&quot; — loyal, clever, together.
          Rockets are the quantum leap in urban mobility.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button type="button" onClick={onJoin} className="btn-primary">
            🦆 Join the Orbit
          </button>
          <button type="button" onClick={onSim} className="btn-secondary">
            Watch duck simulation
          </button>
        </div>
      </div>
    </section>
  );
}
