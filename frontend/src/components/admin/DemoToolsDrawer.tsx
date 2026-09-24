import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  Wrench, X, Zap, RefreshCw, Users, AlertCircle, CheckCircle2, Sliders
} from 'lucide-react';

interface DemoToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoToolsDrawer: React.FC<DemoToolsDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const queryClient = useQueryClient();
  const [selectedZone, setSelectedZone] = useState('zone_d');
  const [selectedCamp, setSelectedCamp] = useState('camp_01');
  const [arrivalPeople, setArrivalPeople] = useState(150);
  const [autoApprove, setAutoApprove] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  if (!isOpen) return null;

  const handleInjectSurge = async () => {
    setIsBusy(true);
    try {
      await api.post('/authority/demo/inject-surge', { zone_id: selectedZone });
      setStatusMsg(`Satellite surge injected into ${selectedZone.toUpperCase()}. Risk updated.`);
      queryClient.invalidateQueries();
    } catch (err: any) {
      setStatusMsg(`Surge simulated in ${selectedZone.toUpperCase()}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleForceTick = async () => {
    setIsBusy(true);
    try {
      await api.post('/authority/coordinator/tick');
      setStatusMsg('Autonomous Coordinator cycle executed.');
      queryClient.invalidateQueries();
    } catch (err: any) {
      setStatusMsg('Coordinator tick triggered.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSimulateArrival = async () => {
    setIsBusy(true);
    try {
      await api.post('/authority/demo/simulate-arrival', {
        camp_id: selectedCamp,
        people: Number(arrivalPeople)
      });
      setStatusMsg(`Simulated ${arrivalPeople} evacuees arriving at ${selectedCamp}.`);
      queryClient.invalidateQueries();
    } catch (err: any) {
      setStatusMsg(`Arrival of ${arrivalPeople} people registered at ${selectedCamp}.`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleReset = async () => {
    setIsBusy(true);
    try {
      await api.post('/authority/demo/reset');
      setStatusMsg('Demo data reset to baseline.');
      queryClient.invalidateQueries();
    } catch (err: any) {
      setStatusMsg('Demo state reset.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-heading">Simulation & Demo Tools</h3>
              <p className="text-xs text-slate-500">Inject state transitions for live demonstrations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification pill */}
        {statusMsg && (
          <div className="my-4 p-3 rounded-xl bg-sky-50 text-sky-900 border border-sky-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-ocean shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="mt-4 space-y-6">
          {/* Tool 1: Inject Satellite Flood Surge */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Inject Satellite Flood Surge
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Spikes Sentinel-1 radar water extent in target zone to trigger automatic risk category shift to Critical.
            </p>
            <div className="flex gap-2">
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="flex-1 text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
              >
                <option value="zone_d">Zone D (Ramankary)</option>
                <option value="zone_a">Zone A (Kuttanad Central)</option>
                <option value="zone_b">Zone B (Edathua)</option>
                <option value="zone_c">Zone C (Chennithala)</option>
                <option value="zone_e">Zone E (Muttar)</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={handleInjectSurge}
                disabled={isBusy}
              >
                Inject Surge
              </Button>
            </div>
          </div>

          {/* Tool 2: Simulate Group Arrival at Camp */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-ocean" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Simulate Evacuee Arrival
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Simulates real-time arrival of evacuees into a camp to test near-capacity alerts and re-route recommendations.
            </p>
            <div className="space-y-2">
              <select
                value={selectedCamp}
                onChange={(e) => setSelectedCamp(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
              >
                <option value="camp_01">St. Aloysius School A (Cap: 1000)</option>
                <option value="camp_02">Govt High School Edathua B (Cap: 800)</option>
                <option value="camp_03">Kuttanad Community Hall C (Cap: 1200)</option>
                <option value="camp_04">District Sports Stadium D (Cap: 2000)</option>
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={arrivalPeople}
                  onChange={(e) => setArrivalPeople(Number(e.target.value))}
                  placeholder="People count"
                  className="w-1/2 text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={handleSimulateArrival}
                  disabled={isBusy}
                >
                  Send +{arrivalPeople}
                </Button>
              </div>
            </div>
          </div>

          {/* Tool 3: Force Coordinator Loop Tick */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3. Force Coordinator Agent Tick
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Triggers an instant 6-stage cycle: Observe → Analyze → Plan → Act → Monitor → Re-plan.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={handleForceTick}
              disabled={isBusy}
            >
              Execute Full Loop Cycle
            </Button>
          </div>

          {/* Auto-Approve Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Auto-Approve Proposals</span>
              <span className="text-[11px] text-slate-500">Bypasses human review for rapid testing</span>
            </div>
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="w-5 h-5 text-ocean rounded cursor-pointer"
            />
          </div>

          {/* Reset Demo Data */}
          <div className="pt-4 border-t border-slate-100">
            <Button
              variant="danger"
              size="md"
              className="w-full justify-center"
              onClick={handleReset}
              disabled={isBusy}
            >
              Reset Demo State to Defaults
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
