import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import { syncEngine, ConnectionState } from '../../core/sync';
import { db } from '../../core/db';

export type DisasterPhase = 'Before' | 'During' | 'After';

export interface GlobalTopBarProps {
  currentRole?: string;
  phase?: DisasterPhase;
  onPhaseChange?: (phase: DisasterPhase) => void;
}

const PHASES: readonly DisasterPhase[] = ['Before', 'During', 'After'];

export function GlobalTopBar({
  currentRole = 'STAFF (Camp A)',
  phase = 'During',
  onPhaseChange
}: GlobalTopBarProps) {
  const [connState, setConnState] = useState<ConnectionState>(syncEngine.getConnectionState());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStats = async () => {
      setConnState(syncEngine.getConnectionState());
      const count = await db.outbox.count();
      setPendingCount(count);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await syncEngine.syncNow();
    const count = await db.outbox.count();
    setPendingCount(count);
    setIsSyncing(false);
  };

  const toggleSimulatedOffline = () => {
    const nextVal = !syncEngine.getSimulatedOffline();
    syncEngine.setSimulatedOffline(nextVal);
    setConnState(syncEngine.getConnectionState());
  };

  const getConnectionChip = () => {
    switch (connState) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ONLINE
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
            DEGRADED
          </span>
        );
      case 'SIMULATED_OFFLINE':
        return (
          <button
            onClick={toggleSimulatedOffline}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-colors"
          >
            <WifiOff className="w-3.5 h-3.5 text-purple-300" />
            SIMULATED OFFLINE (Tap to reconnect)
          </button>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <WifiOff className="w-3.5 h-3.5 text-rose-300" />
            OFFLINE (Local Mode Active)
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800 text-zinc-100 px-4 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Connection State */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow">
              FO
            </div>
            <span className="font-extrabold tracking-tight text-lg text-white">FloodOps</span>
          </div>

          <div className="hidden sm:block">{getConnectionChip()}</div>
        </div>

        {/* Phase Selector & Role & Sync Button */}
        <div className="flex items-center gap-3">
          {/* Phase Badge Switcher */}
          <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs font-medium">
            {PHASES.map((p) => (
              <button
                key={p}
                onClick={() => onPhaseChange && onPhaseChange(p)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  phase === p
                    ? 'bg-blue-600 text-white font-semibold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Sync Button & Pending Counter */}
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
            title="Force synchronization with upstream edge/server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-zinc-400'}`} />
            <span>Sync</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 font-bold text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Role Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold">{currentRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
