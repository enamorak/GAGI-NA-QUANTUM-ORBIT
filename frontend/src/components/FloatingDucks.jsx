import { useEffect, useState } from 'react';

const INITIAL = [
  { id: 1, x: 10, y: 20, dx: 0.15, dy: 0.08, emoji: '🦆🚀' },
  { id: 2, x: 70, y: 60, dx: -0.12, dy: 0.1, emoji: '🦆🌌' },
  { id: 3, x: 40, y: 80, dx: 0.1, dy: -0.09, emoji: '🦆⚛️' },
  { id: 4, x: 85, y: 30, dx: -0.08, dy: 0.11, emoji: '🦆🔮' },
];

export function FloatingDucks() {
  const [ducks, setDucks] = useState(INITIAL);
  const [boost, setBoost] = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      setDucks((prev) =>
        prev.map((d) => {
          let nx = d.x + d.dx * (boost === d.id ? 2.5 : 1);
          let ny = d.y + d.dy * (boost === d.id ? 2.5 : 1);
          let ndx = d.dx;
          let ndy = d.dy;
          if (nx < 0 || nx > 95) ndx *= -1;
          if (ny < 0 || ny > 90) ndy *= -1;
          return {
            ...d,
            x: Math.max(0, Math.min(95, nx)),
            y: Math.max(0, Math.min(90, ny)),
            dx: ndx,
            dy: ndy,
          };
        })
      );
    }, 50);
    return () => clearInterval(id);
  }, [boost]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {ducks.map((d) => (
        <span
          key={d.id}
          className="absolute text-2xl opacity-[0.12] select-none pointer-events-auto cursor-pointer hover:opacity-40 transition-opacity"
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
          onMouseEnter={() => {
            setBoost(d.id);
            setTimeout(() => setBoost(null), 800);
          }}
        >
          {d.emoji}
          {boost === d.id && (
            <span className="absolute -top-2 left-4 text-xs opacity-60">✨✨✨</span>
          )}
        </span>
      ))}
    </div>
  );
}
