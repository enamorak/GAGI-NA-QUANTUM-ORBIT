# Quick start (Windows)

## 1. Backend (API)

```powershell
cd backend
npm install
npm run dev
```

Wait for: `GAGI NA QUANTUM ORBIT API on http://localhost:3001`

Check: http://localhost:3001/health → `{"status":"ok",...}`

The terminal should stay open (do not return to `PS>` immediately).

## 2. Frontend

Second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Use the top navigation: **Simulation** | **Metrics & benchmarks** | **Leaderboard**

## 3. Features

- **Regenerate roads** — new random polyline street network
- **Metrics tab** — classical vs quantum comparison table across cases
- **Ambulances** — never wait on red lights (both algorithms)

## API offline

```powershell
cd backend
npm run dev
```

`npm run dev` frees ports 3001–3010 before starting. Restart frontend after backend if the proxy was stale.
