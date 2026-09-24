import React, { useState } from 'react';
import { Users, UserPlus, UserMinus, RotateCcw, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { useLocalOpsStore } from '../../store/localOpsStore';
import { DataValue } from '../common/DataValue';

interface CampConsoleProps {
  campId: string;
}

export const CampConsole: React.FC<CampConsoleProps> = ({ campId = 'camp_A' }) => {
  const { camps, recordArrival, recordDeparture, undoLastAction, canUndo } = useLocalOpsStore();
  const camp = camps[campId] || {
    camp_id: campId,
    capacity: 1000,
    occupied: 700,
    reserved: 0,
    projected: 700,
    available: 300,
    fill_band: 'AMBER',
    resources: { water_l: 15000, food_meals: 3000 },
    alerts: []
  };

  const [customCount, setCustomCount] = useState<string>('');
  const [typoWarning, setTypoWarning] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleQuickAdd = async (amount: number) => {
    // Typo guard: over 500 or over 25% of capacity
    if (amount > 500 || amount > camp.capacity * 0.25) {
      setTypoWarning(amount);
      return;
    }
    await executeArrival(amount);
  };

  const executeArrival = async (amount: number) => {
    setTypoWarning(null);
    await recordArrival(campId, amount);
    setFeedbackMsg({ text: `Recorded +${amount} arrivals at Camp ${campId}`, type: 'success' });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleCustomSubmit = async (isArrival: boolean) => {
    const num = parseInt(customCount, 10);
    if (isNaN(num) || num <= 0) return;

    if (isArrival) {
      if (num > 500 || num > camp.capacity * 0.25) {
        setTypoWarning(num);
        return;
      }
      await executeArrival(num);
    } else {
      const res = await recordDeparture(campId, num);
      if (!res.success) {
        setFeedbackMsg({ text: res.error || 'Departure rejected', type: 'error' });
      } else {
        setFeedbackMsg({ text: `Recorded -${num} departures`, type: 'success' });
      }
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
    setCustomCount('');
  };

  const fillBandColor = () => {
    if (camp.fill_band === 'RED') return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800';
    if (camp.fill_band === 'AMBER') return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800';
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Camp Check-in Console: {campId}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Offline tablet check-in ledger. Updates shared operational state immediately.
          </p>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${fillBandColor()}`}>
          {camp.fill_band} FILL ({Math.round((camp.occupied / camp.capacity) * 100)}%)
        </div>
      </div>

      {/* Primary KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 block mb-1">Occupied (Arrived)</span>
          <DataValue value={camp.occupied} status="LIVE" asOf={new Date().toISOString()} source="camp_device" />
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 block mb-1">Reserved (In Transit)</span>
          <span className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{camp.reserved}</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 block mb-1">Projected Total</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{camp.projected}</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 block mb-1">Available Capacity</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{camp.available}</span>
        </div>
      </div>

      {/* Typo Guard Alert Modal */}
      {typoWarning !== null && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>High Volume Entry Confirmation Guard</span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            You entered <span className="font-extrabold">{typoWarning}</span> evacuees for Camp {campId} (Capacity: {camp.capacity}). This represents over 25% of total capacity. Confirm this is not a typo.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => executeArrival(typoWarning)}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              Confirm {typoWarning} Arrivals
            </button>
            <button
              onClick={() => setTypoWarning(null)}
              className="px-4 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Feedback & Undo Message Bar */}
      {feedbackMsg && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
        }`}>
          <span>{feedbackMsg.text}</span>
          {canUndo && (
            <button
              onClick={undoLastAction}
              className="flex items-center gap-1 underline font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo (60s)
            </button>
          )}
        </div>
      )}

      {/* Quick 1-Tap Buttons (Tablet First) */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">
          Quick Arrival Check-in (1-Tap):
        </label>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {[1, 5, 10, 50].map((num) => (
            <button
              key={num}
              onClick={() => handleQuickAdd(num)}
              className="py-3.5 sm:py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-base sm:text-lg shadow-sm transition-all flex flex-col items-center justify-center gap-0.5"
            >
              <UserPlus className="w-4 h-4 opacity-80" />
              <span>+{num}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Count & Departure Pad */}
      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block">
          Custom Group Count or Departure:
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Enter count (e.g. 100)..."
            value={customCount}
            onChange={(e) => setCustomCount(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold"
          />
          <button
            onClick={() => handleCustomSubmit(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" /> Check In
          </button>
          <button
            onClick={() => handleCustomSubmit(false)}
            className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <UserMinus className="w-4 h-4" /> Depart
          </button>
        </div>
      </div>

      {/* Undo Action Bar */}
      {canUndo && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={undoLastAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Recent Action (Compensating Event)</span>
          </button>
        </div>
      )}
    </div>
  );
};
