import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { LiveBoardData, LiveBoardGroup, LiveBoardCamp } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Activity, ArrowRight, Users, Tent, AlertTriangle, CheckCircle2,
  RefreshCw, Navigation, Send, Plus, ArrowLeftRight, Clock, ShieldCheck
} from 'lucide-react';

export const CampLiveBoardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<LiveBoardGroup | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [fromCamp, setFromCamp] = useState('camp_01');
  const [toCamp, setToCamp] = useState('camp_02');
  const [transferPeople, setTransferPeople] = useState(130);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [targetCampForReassign, setTargetCampForReassign] = useState('camp_02');

  const { data: liveBoard, isLoading, refetch } = useQuery<LiveBoardData>({
    queryKey: ['liveBoard'],
    queryFn: () => api.get<LiveBoardData>('/authority/camps/live'),
    refetchInterval: 8000
  });

  const handleExecuteTransfer = async () => {
    try {
      await api.post('/authority/camps/transfer', {
        from_camp: fromCamp,
        to_camp: toCamp,
        people: Number(transferPeople)
      });
      setTransferModalOpen(false);
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(err.message || 'Transfer failed');
    }
  };

  const handleExecuteReassign = async () => {
    if (!selectedGroup) return;
    try {
      await api.post(`/authority/groups/${selectedGroup.group_id}/assign`, {
        camp_id: targetCampForReassign
      });
      setReassignModalOpen(false);
      setSelectedGroup(null);
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(err.message || 'Reassignment failed');
    }
  };

  const handleSimulateArrival = async (campId: string, people: number = 100) => {
    try {
      await api.post('/authority/demo/simulate-arrival', {
        camp_id: campId,
        people
      });
      queryClient.invalidateQueries();
    } catch (err) {
      console.warn('Simulated arrival error:', err);
    }
  };

  const highProjectedCamps = liveBoard?.camps.filter(c => c.projected_pct >= 85) || [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Operational Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-ocean/10 text-ocean flex items-center justify-center">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold font-heading text-slate-900">
                Relief Camp Live Board & Evacuation Flow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Autonomous real-time flow management connecting affected zones, evacuation groups, and shelter capacities
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTransferModalOpen(true)}
            icon={<ArrowLeftRight className="w-4 h-4" />}
          >
            Camp-to-Camp Transfer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* 2. Capacity Warning Banner with 1-Click Action */}
      {highProjectedCamps.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-coral text-white shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-white shrink-0 mt-0.5 animate-bounce" />
            <div>
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                Capacity Warning Threshold Exceeded
              </span>
              <p className="text-sm font-bold">
                {highProjectedCamps[0].name} is projected at {highProjectedCamps[0].occupancy + highProjectedCamps[0].inbound} / {highProjectedCamps[0].capacity} ({highProjectedCamps[0].projected_pct}%).
              </p>
              <p className="text-xs text-sky-100 mt-0.5">
                Recommended Action: Divert approaching evacuee convoy of 150 people to Govt High School Edathua B (350 free beds).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-rose-800 hover:bg-slate-50 font-bold"
              onClick={() => {
                setFromCamp(highProjectedCamps[0].camp_id);
                setToCamp('camp_02');
                setTransferPeople(150);
                setTransferModalOpen(true);
              }}
            >
              Approve Divert Action
            </Button>
          </div>
        </div>
      )}

      {/* 3. Top Section: 3-Column Evacuation Flow View */}
      <Card className="p-6 border border-sky-200 bg-white shadow-soft">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ocean animate-ping" />
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider font-heading">
              Evacuation Flow Topology (Zones → En-Route Groups → Relief Camps)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Click any group to reassign destination shelter
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Affected Zones (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b">
              1. Source Flood Zones
            </h4>
            {liveBoard?.zones.map((z) => (
              <div
                key={z.zone_id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">{z.name}</span>
                  <span className="text-[11px] text-slate-500">{z.needing_evac} residents waiting</span>
                </div>
                <Badge variant={z.needing_evac > 300 ? 'coral' : 'sun'} size="sm">
                  {z.needing_evac > 300 ? 'Urgent' : 'Active'}
                </Badge>
              </div>
            ))}
          </div>

          {/* Column 2: Anonymous Evacuation Groups (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ocean pb-1 border-b">
              2. Evacuation Groups in Transit
            </h4>
            {liveBoard?.groups.map((g) => {
              const isMoving = g.status === 'moving';
              return (
                <div
                  key={g.group_id}
                  onClick={() => {
                    setSelectedGroup(g);
                    setReassignModalOpen(true);
                  }}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all shadow-sm hover:scale-[1.02] ${
                    isMoving
                      ? 'bg-sky-50 border-sky-300 text-sky-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isMoving ? 'bg-sky-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">
                        {g.size} People ({g.source_zone.toUpperCase()})
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> ETA: {g.eta} → {g.destination_camp}
                      </p>
                    </div>
                  </div>

                  <Badge variant={isMoving ? 'ocean' : 'sun'} size="sm">
                    {g.status.toUpperCase()}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Column 3: Destination Relief Camps (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 pb-1 border-b">
              3. Relief Camps (Live Inbound & Free Seats)
            </h4>
            {liveBoard?.camps.map((c) => {
              const occPct = Math.round((c.occupancy / c.capacity) * 100);
              const inboundPct = Math.round((c.inbound / c.capacity) * 100);
              const isHigh = c.projected_pct >= 90;

              return (
                <div
                  key={c.camp_id}
                  className={`p-3.5 rounded-2xl border transition-all shadow-sm ${
                    isHigh ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{c.name}</span>
                    <span className={`font-extrabold ${isHigh ? 'text-rose-600' : 'text-slate-700'}`}>
                      {c.occupancy + c.inbound} / {c.capacity} ({c.projected_pct}%)
                    </span>
                  </div>

                  {/* Multi-segment Occupancy Bar: Solid Current, Striped Inbound, Free */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex p-0.5 mb-1.5">
                    {/* Current Occupancy */}
                    <div
                      className="bg-sky-500 h-full rounded-l-full"
                      style={{ width: `${occPct}%` }}
                      title={`Current: ${c.occupancy}`}
                    />
                    {/* Inbound Occupancy (Striped) */}
                    {c.inbound > 0 && (
                      <div
                        className="bg-amber-400 h-full border-l border-white"
                        style={{
                          width: `${inboundPct}%`,
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 8px)'
                        }}
                        title={`Inbound: +${c.inbound}`}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="text-emerald-700">{c.free} free beds</span>
                    <span>{c.hours_of_cover}h Life-Support</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 4. Bottom Row: Camp Cards Row & Live Arrivals Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camp Cards Overview (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-heading">
              Shelter Occupancy & Stock Cover Metrics
            </h3>
            <span className="text-xs text-slate-500">Live Telemetry Synchronized</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {liveBoard?.camps.map((camp) => (
              <Card key={camp.camp_id} className="p-4 border border-sky-100 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug">{camp.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Capacity: {camp.capacity} beds</p>
                    </div>
                    <Badge variant={camp.status === 'open' ? 'mint' : (camp.status === 'near_capacity' ? 'sun' : 'coral')} size="sm">
                      {camp.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="py-3 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600">Current Occupancy</span>
                      <span className="text-slate-900">{camp.occupancy}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-amber-700">Approaching Inbound</span>
                      <span className="text-amber-700">+{camp.inbound}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-100">
                      <span className="text-emerald-700">Available Safe Beds</span>
                      <span className="text-emerald-700 font-black">{camp.free}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Supply Cover: <strong>{camp.hours_of_cover}h</strong></span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs py-1"
                    onClick={() => handleSimulateArrival(camp.camp_id, 50)}
                  >
                    +50 Arrived
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Live Arrivals Feed (1 col) */}
        <div className="lg:col-span-1">
          <Card className="p-5 border border-sky-100 shadow-soft h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-ocean" />
                <h3 className="font-extrabold text-sm text-slate-900 font-heading">
                  Live Arrivals Feed
                </h3>
              </div>
              <Badge variant="mint" size="sm" dot>Live Stream</Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px]">
              {liveBoard?.arrivals.map((arr, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1 hover:bg-sky-50/50 transition-colors animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-700">+{arr.size} People Arrived</span>
                    <span className="text-[11px] text-slate-400 font-medium">{arr.time}</span>
                  </div>
                  <p className="text-slate-700 font-medium">
                    {arr.source_zone} → <strong>{arr.camp}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400">Transport: {arr.transport}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Camp-to-Camp Transfer Dialog */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-lg text-slate-900 font-heading flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-ocean" />
              Inter-Camp Evacuee Transfer
            </h3>
            <p className="text-xs text-slate-500">
              Relocate citizens from overcrowded shelters to designated secondary facilities with available beds.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Source Camp (Diverting From):</label>
                <select
                  value={fromCamp}
                  onChange={(e) => setFromCamp(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  {liveBoard?.camps.map(c => (
                    <option key={c.camp_id} value={c.camp_id}>{c.name} ({c.occupancy} occ)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Camp (Receiving):</label>
                <select
                  value={toCamp}
                  onChange={(e) => setToCamp(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  {liveBoard?.camps.map(c => (
                    <option key={c.camp_id} value={c.camp_id}>{c.name} ({c.free} free beds)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Number of People to Transfer:</label>
                <input
                  type="number"
                  value={transferPeople}
                  onChange={(e) => setTransferPeople(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              {/* Projected Before and After Preview */}
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs space-y-1">
                <span className="font-bold text-deep block">Projected Transfer Impact:</span>
                <p className="text-slate-700">Source Camp: reduces by -{transferPeople} evacuees</p>
                <p className="text-slate-700">Destination Camp: receives +{transferPeople} evacuees</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteTransfer}
              >
                Confirm & Dispatch Buses
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
