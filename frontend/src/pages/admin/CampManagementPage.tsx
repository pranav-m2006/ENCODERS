import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PublicCamp, AiCampCandidate } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Tent, Plus, Minus, Check, AlertCircle, Save, Phone,
  Droplets, HeartPulse, Zap, Bath, Utensils, ArrowLeftRight, CheckCircle2,
  Sparkles, Search, Building2, ShieldCheck, MapPin
} from 'lucide-react';

export const CampManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [overrideModal, setOverrideModal] = useState<{ open: boolean; campId: string; proposed: number; capacity: number } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [searchArea, setSearchArea] = useState('');

  const { data: camps, isLoading } = useQuery<PublicCamp[]>({
    queryKey: ['camps'],
    queryFn: () => api.get<PublicCamp[]>('/public/camps')
  });

  const { data: aiCandidates, refetch: refetchCandidates } = useQuery<AiCampCandidate[]>({
    queryKey: ['aiCampCandidates', searchArea],
    queryFn: () => api.get<AiCampCandidate[]>(`/authority/ai/camp-candidates?area=${encodeURIComponent(searchArea)}`)
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const designateCampMutation = useMutation({
    mutationFn: (cand: AiCampCandidate) =>
      api.post('/authority/camps', {
        camp_id: cand.candidate_id,
        name: cand.name,
        lat: cand.lat,
        lng: cand.lng,
        capacity: cand.suggested_capacity,
        current_occupancy: 0,
        notes: `AI designated shelter: ${cand.recommended_reason}`,
        contact_name: "Chennai Corp Camp In-charge",
        contact_phone: "+91 44 2561 9206"
      }),
    onSuccess: (data: any) => {
      showToast(`Designated ${data.name} as official relief camp!`);
      queryClient.invalidateQueries({ queryKey: ['camps'] });
      queryClient.invalidateQueries({ queryKey: ['liveBoard'] });
      queryClient.invalidateQueries({ queryKey: ['authorityDashboard'] });
    }
  });

  const handleOccupancyStepper = async (camp: PublicCamp, delta: number) => {
    const currentOcc = camp.capacity - camp.available;
    const newOcc = currentOcc + delta;

    if (newOcc > camp.capacity) {
      setOverrideModal({
        open: true,
        campId: camp.camp_id,
        proposed: newOcc,
        capacity: camp.capacity
      });
      return;
    }

    try {
      await api.patch(`/authority/camps/${camp.camp_id}`, {
        current_occupancy: Math.max(0, newOcc)
      });
      showToast(`Saved. Occupancy updated to ${newOcc}. Public view synced.`);
      queryClient.invalidateQueries({ queryKey: ['camps'] });
      queryClient.invalidateQueries({ queryKey: ['liveBoard'] });
      queryClient.invalidateQueries({ queryKey: ['authorityDashboard'] });
    } catch (err) {
      console.warn('Camp patch error:', err);
    }
  };

  const handleConfirmOverride = async () => {
    if (!overrideModal) return;
    try {
      await api.patch(`/authority/camps/${overrideModal.campId}`, {
        current_occupancy: overrideModal.proposed,
        notes: `Emergency Override: ${overrideReason || 'Surge influx admitted under collector directive'}`
      });
      showToast(`Emergency Override Saved (${overrideModal.proposed}/${overrideModal.capacity}). Public view updated.`);
      setOverrideModal(null);
      setOverrideReason('');
      queryClient.invalidateQueries();
    } catch (err) {
      console.warn('Override error:', err);
    }
  };

  const handleToggleFacility = async (camp: PublicCamp, key: string) => {
    const facilities = { ...(camp.facilities as any), [key]: !(camp.facilities as any)[key] };
    try {
      await api.patch(`/authority/camps/${camp.camp_id}`, {
        facilities
      });
      showToast(`Facility status updated. Public view refreshed.`);
      queryClient.invalidateQueries({ queryKey: ['camps'] });
    } catch (err) {
      console.warn('Facility toggle error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Tent className="w-6 h-6 text-ocean" />
            Relief Camp Operational Management & Capacity Control
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            District Authority authoritative master record. Direct occupancy modifications and AI-assisted shelter designation.
          </p>
        </div>

        <span className="text-xs bg-sky-50 text-ocean font-bold px-3 py-1.5 rounded-full border border-sky-200 flex items-center gap-1.5 self-start sm:self-auto">
          <Check className="w-4 h-4 text-emerald-500" />
          Single State Pipeline Active
        </span>
      </div>

      {/* Optimistic Update Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* AI Shelter Recommendation Tool (Fix / Select Camp for Specified Areas) */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-5 rounded-2xl shadow-soft">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 font-heading flex items-center gap-2">
                AI Relief Camp Finder & Recommender
                <Badge variant="blue" size="sm">Greater Chennai</Badge>
              </h3>
              <p className="text-xs text-slate-600">
                AI identifies and evaluates high-ground public infrastructure (colleges, auditoriums, stadiums) in specified Chennai areas for manual authority fixation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search area (e.g., Arumbakkam, Porur, Mylapore)"
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetchCandidates()}
              className="text-xs"
            >
              Scan Area
            </Button>
          </div>
        </div>

        {/* AI Recommendations Grid */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {aiCandidates?.map((cand) => (
            <div
              key={cand.candidate_id}
              className="p-3.5 bg-white/95 rounded-xl border border-indigo-100 flex flex-col justify-between hover:border-indigo-300 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 font-heading flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      {cand.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" /> {cand.area}
                    </p>
                  </div>
                  <Badge variant="mint" size="sm">
                    {Math.round(cand.suitability_score * 100)}% Match
                  </Badge>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] p-2 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-slate-500 block">Capacity:</span>
                    <strong className="text-slate-900">{cand.suggested_capacity} beds</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Elevation:</span>
                    <strong className="text-emerald-700">{cand.elevation_m}m MSL</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Type:</span>
                    <strong className="text-indigo-700 truncate block">{cand.building_type}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 italic bg-indigo-50/50 p-1.5 rounded">
                  "{cand.recommended_reason}"
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">{cand.proximity_to_flood}</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => designateCampMutation.mutate(cand)}
                  isLoading={designateCampMutation.isPending}
                  className="text-xs"
                >
                  Fix as Official Relief Camp
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Camps List with Inline Steppers and Controls */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-heading">
          Active Chennai Relief Shelters ({camps?.length || 6})
        </h3>

        {camps?.map((camp) => {
          const occupancy = camp.capacity - camp.available;
          const occPct = Math.round((occupancy / camp.capacity) * 100);

          return (
            <Card key={camp.camp_id} className="p-5 border border-sky-100 shadow-soft space-y-4 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-extrabold text-lg text-slate-900 font-heading">{camp.name}</h3>
                    <Badge variant={camp.status === 'open' ? 'mint' : (camp.status === 'near_capacity' ? 'sun' : 'coral')} size="sm">
                      {camp.status.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      ID: {camp.camp_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Coordinator: {camp.contact}
                  </p>
                </div>

                {/* Inline Stepper Controls */}
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-600 px-1">Occupancy:</span>
                  <button
                    onClick={() => handleOccupancyStepper(camp, -10)}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 font-bold flex items-center justify-center text-slate-700 shadow-sm cursor-pointer active:scale-95"
                  >
                    -10
                  </button>
                  <span className="font-extrabold text-base text-slate-900 w-16 text-center font-heading">
                    {occupancy}
                  </span>
                  <button
                    onClick={() => handleOccupancyStepper(camp, 10)}
                    className="w-8 h-8 rounded-xl bg-ocean hover:bg-ocean-hover font-bold flex items-center justify-center text-white shadow-sm cursor-pointer active:scale-95"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Progress and Live Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-slate-600 mb-1">
                    <span>Capacity Fill Level</span>
                    <span>{occupancy} / {camp.capacity} beds ({occPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occPct >= 90 ? 'bg-rose-500' : (occPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500')
                      }`}
                      style={{ width: `${Math.min(100, occPct)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Meals: <strong>{camp.meals_available || 2000}</strong> | Water: <strong>{camp.water_liters_available || 6000}L</strong>
                  </p>
                </div>

                {/* Facility Toggles */}
                <div className="md:col-span-2">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-2 text-[11px]">
                    Interactive Facility Status Toggles (Click to switch)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'water', label: 'Water', icon: Droplets, val: camp.facilities?.water },
                      { key: 'medical', label: 'Medical Staff', icon: HeartPulse, val: camp.facilities?.medical },
                      { key: 'power', label: 'Generator', icon: Zap, val: camp.facilities?.power },
                      { key: 'toilets', label: 'Sanitation', icon: Bath, val: camp.facilities?.toilets },
                      { key: 'food', label: 'Hot Food', icon: Utensils, val: camp.facilities?.food }
                    ].map((f) => {
                      const Icon = f.icon;
                      return (
                        <button
                          key={f.key}
                          onClick={() => handleToggleFacility(camp, f.key)}
                          className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
                            f.val
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Override Confirmation Modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-extrabold text-base font-heading text-slate-900">
                Capacity Limit Exceeded Warning
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Proposed occupancy ({overrideModal.proposed}) exceeds shelter structural capacity ({overrideModal.capacity}).
              To admit excess evacuees under emergency override, please enter a required justification for the audit log.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Override Reason / Directive:</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="E.g., Surge rescue group admitted temporarily in auditorium..."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean/40"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverrideModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmOverride}
              >
                Confirm Emergency Override
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
