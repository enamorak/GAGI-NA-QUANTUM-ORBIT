import { useEffect, useRef, useCallback } from 'react';

const DIR_OFFSETS = {
  north: { x: 0, y: -1, lane: 'v' },
  south: { x: 0, y: 1, lane: 'v' },
  east: { x: 1, y: 0, lane: 'h' },
  west: { x: -1, y: 0, lane: 'h' },
};

function drawDuckRocket(ctx, x, y, opts = {}) {
  const { peck = 0, ghost = false, scale = 1, feedJump = 0 } = opts;
  const py = y + Math.sin(peck) * 3 - feedJump;
  ctx.save();
  ctx.globalAlpha = ghost ? 0.5 : 1;
  ctx.translate(x, py);
  ctx.scale(scale, scale);
  ctx.font = '14px Segoe UI Emoji, Apple Color Emoji, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚀', 0, 2);
  ctx.fillText('🦆', 0, -6);
  ctx.restore();
}

function drawTrail(ctx, points) {
  points.forEach((p, i) => {
    const a = (i / points.length) * 0.5;
    ctx.fillStyle = `rgba(0, 229, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 - i * 0.15, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOrbitToken(ctx, x, y, life) {
  ctx.globalAlpha = life;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 7px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('O', x, y + 2.5);
  ctx.globalAlpha = 1;
}

function drawLight(ctx, x, y, phase) {
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x - 8, y - 18, 16, 36);
  ctx.beginPath();
  ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
  ctx.fillStyle = phase === 'green' ? '#22c55e' : '#374151';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + 8, 5, 0, Math.PI * 2);
  ctx.fillStyle = phase === 'red' ? '#ef4444' : '#374151';
  ctx.fill();
}

export function QuantumDuckCanvas({
  queues = {},
  phases = {},
  mode = 'fixed',
  quantumFlash = false,
  quantumTunnel = false,
  flyingDucks = [],
  orbitParticles = [],
  feedBoost = false,
  feedJumpPhase = 0,
  size = 520,
}) {
  const canvasRef = useRef(null);
  const trailsRef = useRef(new Map());
  const peckRef = useRef(0);
  const rafRef = useRef(null);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const roadW = Math.min(80, w * 0.14);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    if (quantumFlash) {
      ctx.fillStyle = 'rgba(128, 0, 255, 0.3)';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - roadW / 2, 0, roadW, h);
    ctx.fillRect(0, cy - roadW / 2, w, roadW);

    ctx.strokeStyle = '#fbbf24';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, cy - roadW / 2);
    ctx.moveTo(cx, cy + roadW / 2);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(cx - roadW / 2, cy);
    ctx.moveTo(cx + roadW / 2, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = mode === 'quantum' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(0,0,0,0.15)';
    ctx.fillRect(cx - roadW / 2, cy - roadW / 2, roadW, roadW);

    if (mode === 'quantum') {
      const t = Date.now() / 1000;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 60, 22, t, 0, Math.PI * 2);
      ctx.stroke();
    }

    const lightPos = {
      north: [cx, cy - roadW / 2 - 22],
      south: [cx, cy + roadW / 2 + 22],
      east: [cx + roadW / 2 + 22, cy],
      west: [cx - roadW / 2 - 22, cy],
    };
    Object.entries(phases).forEach(([dir, ph]) => {
      const [lx, ly] = lightPos[dir] || [cx, cy];
      drawLight(ctx, lx, ly, ph);
    });

    peckRef.current += 0.12;
    const feedJ = feedBoost ? Math.abs(Math.sin(feedJumpPhase)) * 8 : 0;

    Object.entries(queues).forEach(([dir, count]) => {
      const off = DIR_OFFSETS[dir];
      const n = Math.min(count, 14);
      for (let i = 0; i < n; i++) {
        const spacing = 13;
        let x = cx + off.x * (roadW / 2 + 18 + i * spacing);
        let y = cy + off.y * (roadW / 2 + 18 + i * spacing);
        if (off.lane === 'v') x += dir === 'north' ? -14 : 14;
        else y += dir === 'west' ? -14 : 14;

        if (quantumTunnel && phases[dir] === 'red') {
          x += off.x * 10;
          y += off.y * 10;
        }

        const key = `${dir}-${i}`;
        let trail = trailsRef.current.get(key) || [];
        trail.push({ x, y, a: 1 });
        if (trail.length > 8) trail = trail.slice(-8);
        trailsRef.current.set(key, trail);
        drawTrail(ctx, trail);

        const isGreen = phases[dir] === 'green';
        drawDuckRocket(ctx, x, y, {
          peck: isGreen ? 0 : peckRef.current + i * 0.3,
          ghost: quantumTunnel && !isGreen,
          feedJump: feedJ,
        });
      }
    });

    flyingDucks.forEach((fd) => {
      const x = fd.x * w;
      const y = fd.y * h;
      drawDuckRocket(ctx, x, y, { scale: 1.3 });
      if (fd.trail) drawTrail(ctx, fd.trail.map((p) => ({ x: p.x * w, y: p.y * h })));
    });

    orbitParticles.forEach((p) => {
      drawOrbitToken(ctx, p.x * w, p.y * h, p.life);
    });

    if (feedBoost) {
      for (let i = 0; i < 12; i++) {
        const fx = cx + (Math.random() - 0.5) * roadW;
        const fy = cy + (Math.random() - 0.5) * roadW;
        ctx.fillStyle = '#facc15';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(fx, fy, 3, 3);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 12);
    ctx.fillText('S', cx, h - 8);
    ctx.fillText('E', w - 8, cy + 4);
    ctx.fillText('W', 10, cy + 4);
  }, [
    queues,
    phases,
    mode,
    quantumFlash,
    quantumTunnel,
    flyingDucks,
    orbitParticles,
    feedBoost,
    feedJumpPhase,
  ]);

  useEffect(() => {
    const loop = () => {
      paint();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paint]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full max-w-[600px] mx-auto rounded-xl border border-violet-500/30 shadow-2xl shadow-violet-900/40"
      aria-label="Quantum duck intersection"
    />
  );
}
