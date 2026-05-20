import { useEffect, useRef, useMemo } from 'react';

const EMOJI = { duck: '🦆', delivery: '📦', ambulance: '🚑' };
const ROAD_WIDTH = 10;
const INTERSECTION_R = 15;

function boundsFromGraph(state) {
  const nodes = state?.nodes || [];
  if (!nodes.length) return { minX: 0, maxX: 12, minY: 0, maxY: 8 };
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const pad = 0.8;
  return {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };
}

function toScreen(x, y, b, w, h, pad) {
  const sx = pad + ((x - b.minX) / (b.maxX - b.minX || 1)) * (w - pad * 2);
  const sy = pad + ((y - b.minY) / (b.maxY - b.minY || 1)) * (h - pad * 2);
  return [sx, h - sy];
}

function polylineLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
}

function pointAtDistance(pts, dist) {
  if (dist <= 0) return { x: pts[0][0], y: pts[0][1], i: 0 };
  let d = dist;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg || i === pts.length - 1) {
      const u = seg > 0 ? d / seg : 0;
      return {
        x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u,
        y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u,
        i,
      };
    }
    d -= seg;
  }
  const last = pts[pts.length - 1];
  return { x: last[0], y: last[1], i: pts.length - 1 };
}

/** Trim polyline ends so road stops at intersection, not through it. */
function trimPolyline(pts, shrink) {
  const total = polylineLength(pts);
  if (total <= shrink * 2.5) return pts;
  const start = pointAtDistance(pts, shrink);
  const end = pointAtDistance(pts, total - shrink);
  const out = [[start.x, start.y]];
  for (let i = start.i; i < end.i && i < pts.length - 1; i++) {
    const p = pts[i];
    const last = out[out.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.5) out.push([p[0], p[1]]);
  }
  const last = out[out.length - 1];
  if (Math.hypot(end.x - last[0], end.y - last[1]) > 0.5) {
    out.push([end.x, end.y]);
  } else {
    out[out.length - 1] = [end.x, end.y];
  }
  return out.length >= 2 ? out : pts;
}

function pathToScreen(path, b, w, h, pad) {
  return (path || []).map(([x, y]) => toScreen(x, y, b, w, h, pad));
}

function positionOnScreenPolyline(pts, t) {
  const total = polylineLength(pts);
  if (total <= 0) return { x: pts[0]?.[0] ?? 0, y: pts[0]?.[1] ?? 0 };
  const p = pointAtDistance(pts, Math.min(1, Math.max(0, t)) * total);
  return { x: p.x, y: p.y };
}

function tangentAt(pts, t) {
  const total = polylineLength(pts);
  const d = Math.min(total * 0.98, Math.max(total * 0.02, t * total));
  const p0 = pointAtDistance(pts, d);
  const p1 = pointAtDistance(pts, Math.min(total, d + 8));
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len };
}

function drawBrokenRoad(ctx, pts, count, cap, flash) {
  if (pts.length < 2) return;
  const empty = count === 0;
  const fill = empty ? 0 : Math.min(count, cap) / cap;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);

  if (empty) {
    ctx.strokeStyle = '#3d4f66';
    ctx.lineWidth = ROAD_WIDTH - 3;
    ctx.setLineDash([5, 7]);
  } else {
    ctx.setLineDash([]);
    const hue = flash ? 195 : 42;
    ctx.strokeStyle = `hsla(${hue}, 50%, ${38 + fill * 14}%, 0.92)`;
    ctx.lineWidth = ROAD_WIDTH;
  }
  ctx.stroke();
  ctx.setLineDash([]);

  if (!empty && pts.length >= 2) {
    const tip = positionOnScreenPolyline(pts, 0.78);
    const { ux, uy } = tangentAt(pts, 0.78);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(tip.x + ux * 6, tip.y + uy * 6);
    ctx.lineTo(tip.x - uy * 3, tip.y + ux * 3);
    ctx.lineTo(tip.x + uy * 3, tip.y - ux * 3);
    ctx.closePath();
    ctx.fill();
  }
}

function drawIntersection(ctx, cx, cy, node, phaseNs) {
  const isNs = node.signal === 'ns';
  const green = (isNs && phaseNs) || (!isNs && !phaseNs);
  const q = node.queueLen || 0;

  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, INTERSECTION_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const hy = cy - 5;
  ctx.fillStyle = '#030712';
  ctx.fillRect(cx - 10, hy - 9, 20, 18);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(cx - 10, hy - 9, 20, 18);

  ctx.beginPath();
  ctx.arc(cx - 4, hy - 1, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = green ? '#374151' : '#ef4444';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + 4, hy - 1, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = green ? '#22c55e' : '#374151';
  ctx.fill();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 7px Inter,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isNs ? 'NS' : 'EW', cx, cy + 11);

  const types = node.queueTypes || [];
  types.slice(0, 5).forEach((tp, i) => {
    const angle = Math.PI * 0.6 + (i / Math.max(1, types.length - 1)) * Math.PI * 0.85;
    const r = INTERSECTION_R + 13;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(EMOJI[tp] || '🦆', cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  });

  if (q > types.length) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 8px Inter,sans-serif';
    ctx.fillText(`+${q - types.length}`, cx, cy + INTERSECTION_R + 11);
  }
}

function laneOffset(ux, uy, slot, count) {
  if (count <= 1) return [0, 0];
  const nx = -uy;
  const ny = ux;
  const mid = (slot - (count - 1) / 2) * 7;
  return [nx * mid, ny * mid];
}

export function QuantumGraphCanvas({
  title,
  state,
  flash = false,
  height = 460,
  pulseKey = 0,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(0);
  const pulseRef = useRef(0);
  const smoothRef = useRef(new Map());

  const bounds = useMemo(() => boundsFromGraph(state), [state]);
  const capacity = state?.edgeCapacity ?? 5;

  useEffect(() => {
    if (pulseKey) pulseRef.current = 1;
  }, [pulseKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;

    const ctx = canvas.getContext('2d');
    let raf = 0;
    const pad = 36;

    const draw = () => {
      animRef.current += 0.04;
      if (pulseRef.current > 0) pulseRef.current = Math.max(0, pulseRef.current - 0.035);

      const w = canvas.width;
      const h = canvas.height;
      const b = bounds;
      const phaseNs = (state.signalPhase || 0) % 2 === 0;

      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      if (flash) {
        ctx.fillStyle = `rgba(128, 0, 255, ${0.04 + Math.sin(animRef.current) * 0.03})`;
        ctx.fillRect(0, 0, w, h);
      }

      const nodePos = new Map();
      (state.nodes || []).forEach((n) => {
        const [cx, cy] = toScreen(n.x, n.y, b, w, h, pad);
        nodePos.set(n.id, { cx, cy, n });
      });

      (state.edges || []).forEach((e) => {
        const screen = trimPolyline(pathToScreen(e.path, b, w, h, pad), INTERSECTION_R - 2);
        drawBrokenRoad(ctx, screen, e.count || 0, e.capacity || capacity, flash);
      });

      nodePos.forEach(({ cx, cy, n }) => drawIntersection(ctx, cx, cy, n, phaseNs));

      const smooth = smoothRef.current;
      const seen = new Set();

      (state.edges || []).forEach((e) => {
        const ducks = e.ducks || [];
        if (!ducks.length) return;
        const screen = trimPolyline(pathToScreen(e.path, b, w, h, pad), INTERSECTION_R - 2);

        ducks.forEach((d) => {
          seen.add(d.id);
          const prev = smooth.get(d.id);
          let prog = d.progress ?? 0;
          const cur = prev?.progress ?? prog;
          prog = cur + (prog - cur) * 0.38;
          smooth.set(d.id, { progress: prog });

          const p = positionOnScreenPolyline(screen, Math.min(1, Math.max(0, prog)));
          const { ux, uy } = tangentAt(screen, prog);
          const [ox, oy] = laneOffset(ux, uy, d.slot, ducks.length);
          const bob = Math.sin(animRef.current * 2 + d.slot) * 1.2;

          ctx.font = d.type === 'ambulance' ? '15px sans-serif' : '13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(EMOJI[d.type] || '🦆', p.x + ox, p.y + oy + bob);
        });
      });

      for (const id of smooth.keys()) {
        if (!seen.has(id)) smooth.delete(id);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`On streets: ${state.onEdges ?? 0}`, pad, 14);
      ctx.fillText(`At signals (waiting): ${state.queueTotal ?? 0}`, pad, 26);
      if (state.ambulanceOnRed > 0) {
        ctx.fillStyle = '#f87171';
        ctx.fillText(`Ambulance on red: ${state.ambulanceOnRed}`, pad, 38);
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [state, bounds, flash, height, capacity]);

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/10">
      <div
        className={`px-3 py-2 text-sm font-display border-b border-white/10 ${
          flash ? 'text-violet-300 bg-violet-950/40' : 'text-slate-300 bg-slate-900/50'
        }`}
      >
        {title}
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="w-full block"
        style={{ height }}
      />
    </div>
  );
}

export function DualGraphView({ graphState, highlightQuantum, actionPulse = 0 }) {
  if (!graphState?.fixed && !graphState?.quantum) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm rounded-xl border border-dashed border-white/20">
        Start the backend API to load the road network
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-slate-400 justify-center text-center max-w-2xl mx-auto">
        <span>
          <strong className="text-slate-300">Street</strong> = polyline (broken line)
        </span>
        <span>
          <strong className="text-slate-300">Node</strong> = intersection + traffic light
        </span>
        <span>Ambulances never wait on red</span>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <QuantumGraphCanvas
          title="Classical — fixed signals"
          state={graphState.fixed}
          flash={false}
          pulseKey={actionPulse}
        />
        <QuantumGraphCanvas
          title="Quantum Orbit"
          state={graphState.quantum}
          flash={highlightQuantum}
          pulseKey={actionPulse}
        />
      </div>
      {graphState.improvementPercent != null && (
        <p className="text-center text-sm text-violet-300">
          Quantum advantage: ~{graphState.improvementPercent}% less wait at intersections
        </p>
      )}
    </div>
  );
}
