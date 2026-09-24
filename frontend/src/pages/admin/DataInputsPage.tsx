import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Database, Plus, CheckCircle2, Activity, CloudRain, Satellite, Radio } from 'lucide-react';

export const DataInputsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [obsType, setObsType] = useState<'river' | 'rain' | 'flood_report'>('river');
  const [zoneId, setZoneId] = useState('zone_a');
  const [value, setValue] = useState(5.45);
  const [note, setNote] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/authority/observations', {
        type: obsType,
        zone_id: zoneId,
        value: Number(value),
        note
      });
      setSuccessMsg(`Observation recorded successfully. Triggered automatic Coordinator cycle.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(err.message || 'Observation submission failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-ocean" />
            Field Telemetry & Manual Hydrological Ingestion
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manual river gauge readings, rainfall accumulation reports, and field observer ground-truth data
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Source Freshness Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-sky-100 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-ocean flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">Pamba River Gauge</h4>
              <p className="text-[11px] text-emerald-600 font-semibold">Live (1m fresh)</p>
            </div>
          </div>
          <Badge variant="mint" size="sm">99.8% Conf</Badge>
        </Card>

        <Card className="p-4 border border-sky-100 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">Open-Meteo Radar</h4>
              <p className="text-[11px] text-emerald-600 font-semibold">Live (4m fresh)</p>
            </div>
          </div>
          <Badge variant="mint" size="sm">95% Conf</Badge>
        </Card>

        <Card className="p-4 border border-sky-100 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">Sentinel-1 SAR Radar</h4>
              <p className="text-[11px] text-slate-500 font-semibold">Pass: 12m ago</p>
            </div>
          </div>
          <Badge variant="mint" size="sm">92% Conf</Badge>
        </Card>
      </div>

      {/* Manual Data Entry Form */}
      <Card className="p-6 border border-sky-200 shadow-soft max-w-2xl space-y-4">
        <h3 className="font-bold text-base text-slate-900 font-heading">
          Manual Field Observation Ingestion
        </h3>

        <form onSubmit={handleCreateObservation} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Observation Type:</label>
            <select
              value={obsType}
              onChange={(e) => setObsType(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              <option value="river">River Gauge Level (Meters)</option>
              <option value="rain">Rainfall 3h Accumulation (mm)</option>
              <option value="flood_report">Citizen Ground Flood Report</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Target Zone / Sector:</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              <option value="zone_a">Zone A - Kuttanad Central</option>
              <option value="zone_b">Zone B - Edathua</option>
              <option value="zone_c">Zone C - Chennithala</option>
              <option value="zone_d">Zone D - Ramankary</option>
              <option value="zone_e">Zone E - Muttar</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Telemetry Value:</label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Observer Notes / Source Identification:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g., Telemetered sensor calibrated at Edathua bridge..."
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full justify-center"
          >
            Submit Observation to Pipeline
          </Button>
        </form>
      </Card>
    </div>
  );
};
