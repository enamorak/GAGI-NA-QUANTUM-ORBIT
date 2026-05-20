import { useEffect, useRef } from 'react';

function drawSeries(ctx, points, color, w, h, pad, maxY, animateT = 1) {
  if (!points?.length) return;
  const xs = points.map((p) => p[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach(([t, val], i) => {
    const x = pad + ((t - minX) / (maxX - minX)) * (w - pad * 2);
    const drawY = h - pad - ((val / maxY) * (h - pad * 2) * Math.min(1, animateT));
    if (i === 0) ctx.moveTo(x, drawY);
    else ctx.lineTo(x, drawY);
  });
  ctx.stroke();
}

function paintChart(canvas, history, mode, label, animateT) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const pad = 28;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#12182b';
  ctx.fillRect(0, 0, w, h);

  const fixed = history?.fixed || [];
  const quantum = history?.quantum || [];
  const allVals = [...fixed, ...quantum].map((p) => p[1]);
  const maxY = Math.max(10, ...allVals, 1);

  drawSeries(ctx, fixed, '#3b82f6', w, h, pad, maxY, 1);
  drawSeries(ctx, quantum, '#f97316', w, h, pad, maxY, animateT);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter,sans-serif';
  ctx.fillText(label, pad, 14);
  if (mode === 'quantum') {
    ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
    ctx.fillRect(0, 0, w, h);
  }
}

export function ComparisonGraph({ history, mode, label = 'Rocket queue velocity' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let raf = 0;
    const maxFrames = 25;

    const step = () => {
      frame += 1;
      paintChart(canvas, history, mode, label, Math.min(1, frame / maxFrames));
      if (frame < maxFrames) raf = requestAnimationFrame(step);
    };
    paintChart(canvas, history, mode, label, 1);
    frame = 0;
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [history, mode, label]);

  return (
    <div className="glass rounded-xl p-3">
      <h4 className="text-xs text-slate-400 mb-2 font-display">📊 {label}</h4>
      <canvas ref={canvasRef} width={400} height={140} className="w-full rounded-lg" />
    </div>
  );
}

export function WaitTimeGraph({ history, mode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const pad = 28;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#12182b';
    ctx.fillRect(0, 0, w, h);

    const fixed = (history?.fixed || []).map((p) => [p[0], p[2] ?? p[1] * 1.4]);
    const quantum = (history?.quantum || []).map((p) => [p[0], p[2] ?? p[1] * 0.85]);
    const maxY = Math.max(5, ...fixed.map((p) => p[1]), ...quantum.map((p) => p[1]), 1);

    const plot = (pts, color) => {
      if (!pts.length) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach(([t, val], i) => {
        const x = pad + (i / Math.max(1, pts.length - 1)) * (w - pad * 2);
        const y = h - pad - (val / maxY) * (h - pad * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    plot(fixed, '#ef4444');
    plot(quantum, '#22c55e');
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter,sans-serif';
    ctx.fillText('Avg wait (sec)', pad, 14);
  }, [history, mode]);

  return (
    <div className="glass rounded-xl p-3">
      <h4 className="text-xs text-slate-400 mb-2">⏱️ Average wait time</h4>
      <canvas ref={canvasRef} width={400} height={120} className="w-full rounded-lg" />
    </div>
  );
}
