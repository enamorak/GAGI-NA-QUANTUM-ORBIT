export function ToastNotification({ toasts = [] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg border shadow-xl text-sm flex gap-2 animate-pulseGlow ${
            t.type === 'quantum'
              ? 'border-violet-500/60 bg-violet-950/95 text-violet-100'
              : t.type === 'success'
                ? 'border-emerald-500/60 bg-emerald-950/95 text-emerald-100'
                : 'border-cyan-500/60 bg-orbit-panel/95 text-cyan-100'
          }`}
          role="alert"
        >
          <span className="text-lg shrink-0">🦆</span>
          <p>{t.msg}</p>
        </div>
      ))}
    </div>
  );
}
