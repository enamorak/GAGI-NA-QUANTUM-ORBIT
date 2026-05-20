import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import { useWallet } from './hooks/useWallet';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { AppTabs } from './components/AppTabs';
import { DualGraphView } from './components/QuantumGraphCanvas';
import { ComparisonGraph, WaitTimeGraph } from './components/ComparisonGraph';
import { TestWalletPanel } from './components/TestWalletPanel';
import { Leaderboard } from './components/Leaderboard';
import { DemoControls } from './components/DemoControls';
import { MetricsBenchmarks } from './components/MetricsBenchmarks';
import { ToastNotification } from './components/ToastNotification';
import { QuantumExplain } from './components/QuantumExplain';

export default function App() {
  const wallet = useWallet();
  const [demoAddress, setDemoAddress] = useState(null);
  const activeWallet = wallet.address || demoAddress;

  const [activeTab, setActiveTab] = useState('simulation');
  const [mode, setMode] = useState('fixed');
  const [improvement, setImprovement] = useState(22);
  const [quantumNoise, setQuantumNoise] = useState(0.1);
  const [graphState, setGraphState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activity, setActivity] = useState([]);
  const [metricsHistory, setMetricsHistory] = useState({ fixed: [], quantum: [] });
  const [toasts, setToasts] = useState([]);
  const [simRunning, setSimRunning] = useState(false);
  const [loadingRoad, setLoadingRoad] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);
  const [quantumFlash, setQuantumFlash] = useState(false);
  const [actionPulse, setActionPulse] = useState(0);

  const simRef = useRef(null);
  const toastId = useRef(0);
  const syncInFlight = useRef(false);

  const showToast = useCallback((msg, type = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  }, []);

  const bumpPulse = () => setActionPulse((n) => n + 1);

  const applyGraph = (g) => {
    if (!g?.fixed) return;
    setGraphState(g);
    if (g.improvementPercent != null) setImprovement(g.improvementPercent);
  };

  const syncState = useCallback(async () => {
    if (syncInFlight.current) return false;
    syncInFlight.current = true;
    try {
      const data = await api.syncAll();
      setApiOnline(true);
      setMode(data.queueState.mode);
      setImprovement(data.queueState.improvementPercent || 22);
      if (data.queueState.quantumNoise != null) setQuantumNoise(data.queueState.quantumNoise);
      setLeaderboard(data.leaderboard.leaderboard || []);
      setMetricsHistory(data.metricsHistory);
      setActivity(data.activity.activity || []);
      applyGraph(data.graph);
      if (activeWallet) wallet.refreshBalance(activeWallet);
      return true;
    } catch {
      setApiOnline(false);
      return false;
    } finally {
      syncInFlight.current = false;
    }
  }, [activeWallet]);

  useEffect(() => {
    let cancelled = false;
    let tid;
    const loop = async () => {
      if (cancelled) return;
      const ok = await syncState();
      tid = setTimeout(loop, ok ? 25000 : 60000);
    };
    loop();
    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, [syncState]);

  useEffect(() => {
    if (!simRunning) {
      clearInterval(simRef.current);
      return;
    }
    simRef.current = setInterval(async () => {
      try {
        const res = await api.tick();
        applyGraph(res.graph);
        setMode(res.mode);
      } catch {
        try {
          applyGraph(await api.graphTick());
        } catch {
          /* offline */
        }
      }
    }, 450);
    return () => clearInterval(simRef.current);
  }, [simRunning]);

  const handleOnTheRoad = async (vehicleType = null) => {
    if (!activeWallet) {
      showToast('Connect or generate a test wallet first', 'info');
      return;
    }
    setLoadingRoad(true);
    try {
      const res = await api.joinOrbit({
        wallet: activeWallet,
        lat: 13.74 + Math.random() * 0.01,
        lng: 100.56 + Math.random() * 0.01,
        speed: 30,
        ...(vehicleType ? { type: vehicleType } : {}),
      });
      applyGraph(res.graph);
      bumpPulse();
      wallet.setBalance(String(res.totalTokens));
      const label =
        res.vehicleType === 'ambulance'
          ? 'Ambulance'
          : res.vehicleType === 'delivery'
            ? 'Delivery'
            : 'Duck';
      showToast(`${label} entered the road network +${res.tokensAwarded} ORBIT`, 'success');
    } catch {
      wallet.setBalance((b) => String(Number(b) + 5));
      showToast('Vehicle spawned on graph +5 ORBIT (demo)', 'success');
    }
    setLoadingRoad(false);
  };

  const handleRegenerateRoads = async () => {
    setRegenerating(true);
    try {
      const res = await api.regenerateRoads();
      applyGraph(res);
      bumpPulse();
      setSimRunning(true);
      showToast(
        `New road network: ${res.network?.edgeCount ?? '?'} streets (gen #${res.network?.generation ?? '?'})`,
        'success'
      );
    } catch {
      showToast('Regenerate failed — is the API running?', 'info');
    }
    setRegenerating(false);
  };

  const handleFeedFlock = async () => {
    if (!activeWallet) return showToast('Connect wallet first', 'info');
    if (Number(wallet.balance) < 10) return showToast('Need 10 ORBIT', 'info');
    try {
      const res = await api.feedFlock(activeWallet);
      wallet.setBalance(String(res.remainingTokens));
      showToast('Flock fed — vehicles speed up', 'success');
    } catch {
      wallet.setBalance((b) => String(Math.max(0, Number(b) - 10)));
      showToast('Flock fed (demo)', 'success');
    }
  };

  const scrollToSim = () => {
    setActiveTab('simulation');
    setTimeout(() => {
      document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth' });
      setSimRunning(true);
    }, 50);
  };

  const walletForHeader = {
    ...wallet,
    isConnected: !!activeWallet,
    shortAddress: wallet.isConnected
      ? wallet.shortAddress
      : demoAddress
        ? `${demoAddress.slice(0, 6)}...${demoAddress.slice(-4)}`
        : null,
    balance: wallet.balance,
  };

  return (
    <div className="min-h-screen flex flex-col bg-orbit-dark">
      <ToastNotification toasts={toasts} />
      <Header wallet={walletForHeader} onConnect={wallet.connect} />

      {apiOnline === false && (
        <div className="z-50 bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-center text-sm text-amber-100">
          API offline — run{' '}
          <code className="bg-black/30 px-1 rounded">cd backend && npm run dev</code>
        </div>
      )}

      <main className="flex-1">
        <Hero onJoin={wallet.connect} onSim={scrollToSim} />

        <section className="px-4 py-4 max-w-7xl mx-auto">
          <AppTabs active={activeTab} onChange={setActiveTab} />
        </section>

        {activeTab === 'simulation' && (
          <section id="simulator" className="px-4 py-4 max-w-7xl mx-auto space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-cyan-300">Road network simulation</h2>
                <p className="text-sm text-slate-400 max-w-2xl">
                  Polylines = streets · circles = intersections with traffic lights · ducks ride on
                  streets. Classical (left) vs Quantum Orbit (right). Ambulances never wait on red.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={regenerating}
                  onClick={handleRegenerateRoads}
                >
                  {regenerating ? '…' : '🔄 Regenerate roads'}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setSimRunning((r) => !r)}
                >
                  {simRunning ? 'Pause' : 'Run simulation'}
                </button>
              </div>
            </div>

            <DualGraphView
              graphState={graphState}
              highlightQuantum={quantumFlash}
              actionPulse={actionPulse}
            />

            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={loadingRoad}
                onClick={() => {
                  bumpPulse();
                  handleOnTheRoad();
                }}
              >
                I&apos;m on the road
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={loadingRoad}
                onClick={() => {
                  bumpPulse();
                  handleOnTheRoad('delivery');
                }}
              >
                Spawn delivery
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={loadingRoad}
                onClick={() => {
                  bumpPulse();
                  handleOnTheRoad('ambulance');
                }}
              >
                Spawn ambulance
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={handleFeedFlock}>
                Feed flock
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <TestWalletPanel
                  connectedAddress={activeWallet}
                  onConnect={(addr) => {
                    setDemoAddress(addr);
                    wallet.refreshBalance(addr);
                  }}
                  onFaucet={(t) => {
                    if (typeof t === 'number') wallet.setBalance(String(t));
                    else wallet.refreshBalance(activeWallet);
                  }}
                  showToast={showToast}
                />
                <QuantumExplain mode={mode} />
                <DemoControls
                  quantumNoise={quantumNoise}
                  onNoiseChange={setQuantumNoise}
                  metricsHistory={metricsHistory}
                  onStateChange={(p) => {
                    if (p?.graph) applyGraph(p.graph);
                    syncState();
                  }}
                  showToast={showToast}
                />
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <ComparisonGraph history={metricsHistory} mode="quantum" />
                  <WaitTimeGraph history={metricsHistory} mode="quantum" />
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'metrics' && (
          <section className="px-4 py-6 max-w-7xl mx-auto">
            <MetricsBenchmarks liveGraph={graphState} />
          </section>
        )}

        {activeTab === 'leaderboard' && (
          <section className="px-4 py-6 max-w-7xl mx-auto">
            <Leaderboard rows={leaderboard} activity={activity} highlightWallet={activeWallet} />
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
