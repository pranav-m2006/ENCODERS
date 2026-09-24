import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PublicCamp, RescueDirective, CampHeadcountReport, Announcement, OfflineRouteResult } from '../../lib/types';
import { useAuthStore } from '../../store/authStore';
import { offlineRecoveryService } from '../../core/offlineRecoveryDb';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Tent, Users, CheckCircle2, Clock, MapPin, Send,
  Navigation, HeartPulse, Radio, Sparkles, ShieldCheck
} from 'lucide-react';

export const CampOperatorPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedCampId, setSelectedCampId] = useState<string>('camp_guru_nanak');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Headcount state
  const [menCount, setMenCount] = useState<number>(380);
  const [womenCount, setWomenCount] = useState<number>(440);
  const [childrenCount, setChildrenCount] = useState<number>(180);
  const [seniorsCount, setSeniorsCount] = useState<number>(95);
  const [medicalPatientsCount, setMedicalPatientsCount] = useState<number>(25);

  // Supply state
  const [mealsRemaining, setMealsRemaining] = useState<number>(3200);
  const [waterLitersRemaining, setWaterLitersRemaining] = useState<number>(9500);
  const [blanketsRemaining, setBlanketsRemaining] = useState<number>(720);
  const [medicalKitsRemaining, setMedicalKitsRemaining] = useState<number>(110);
  const [urgentNeedInput, setUrgentNeedInput] = useState<string>('');
  const [urgentNeedsList, setUrgentNeedsList] = useState<string[]>([
    'Baby Food Formula', '100 Warm Blankets', 'Drinking Water Cans'
  ]);

  // Offline route calculation in operator page
  const [routeOrigin, setRouteOrigin] = useState<string>('Velachery Vijayanagar Junction');
  const [offlineRouteResult, setOfflineRouteResult] = useState<OfflineRouteResult | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Queries
  const { data: camps } = useQuery<PublicCamp[]>({
    queryKey: ['operatorCamps'],
    queryFn: () => api.get<PublicCamp[]>('/public/camps')
  });

  const { data: directives } = useQuery<RescueDirective[]>({
    queryKey: ['operatorDirectives'],
    queryFn: () => api.get<RescueDirective[]>('/operator/directives')
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ['operatorAnnouncements'],
    queryFn: () => api.get<Announcement[]>('/operator/announcements')
  });

  const currentCamp = camps?.find(c => c.camp_id === selectedCampId) || camps?.[0];

  useEffect(() => {
    if (currentCamp) {
      setMealsRemaining(currentCamp.meals_available || 3000);
      setWaterLitersRemaining(currentCamp.water_liters_available || 9000);
      setBlanketsRemaining(currentCamp.blankets_available || 700);
      setMedicalKitsRemaining(currentCamp.medical_kits_available || 100);
      if (currentCamp.urgent_needs && currentCamp.urgent_needs.length > 0) {
        setUrgentNeedsList(currentCamp.urgent_needs);
      }
    }
  }, [selectedCampId, currentCamp]);

  // Current calculated total from demographics
  const totalCalculatedOccupancy = menCount + womenCount + childrenCount + seniorsCount + medicalPatientsCount;

  // Directives for current camp or all
  const filteredDirectives = directives?.filter(
    d => !selectedCampId || d.assigned_camp_id === selectedCampId || d.assigned_camp_id === 'all'
  ) || [];

  // Update directive status mutation
  const updateDirectiveMutation = useMutation({
    mutationFn: async ({ id, status, notes, arrivedCount }: { id: string; status: string; notes?: string; arrivedCount?: number }) => {
      return api.patch<{ id: string; status: string }>(`/operator/directives/${id}/status`, { status, operator_notes: notes, arrived_count: arrivedCount });
    },
    onSuccess: (data: { id: string; status: string }) => {
      showToast(`Directive ${data.id} updated to status: ${data.status.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ['operatorDirectives'] });
      queryClient.invalidateQueries({ queryKey: ['rescueUnits'] });
      queryClient.invalidateQueries({ queryKey: ['liveBoard'] });
    }
  });

  // Submit Headcount Mutation (Operator -> Admin)
  const submitHeadcountMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<CampHeadcountReport> = {
        camp_id: selectedCampId,
        camp_name: currentCamp?.name || 'Relief Camp',
        operator_id: user?.id || 'u_operator_01',
        operator_name: user?.name || 'Camp In-Charge',
        total_occupancy: totalCalculatedOccupancy,
        capacity: currentCamp?.capacity || 1500,
        newly_arrived: Math.max(0, totalCalculatedOccupancy - (currentCamp?.current_occupancy || 0)),
        discharged: 0,
        breakdown: {
          men: menCount,
          women: womenCount,
          children: childrenCount,
          seniors: seniorsCount,
          medical_patients: medicalPatientsCount
        },
        supplies: {
          meals_remaining: mealsRemaining,
          water_liters_remaining: waterLitersRemaining,
          blankets: blanketsRemaining,
          medical_kits: medicalKitsRemaining
        },
        urgent_needs: urgentNeedsList
      };
      return api.post(`/operator/camps/${selectedCampId}/headcount`, payload);
    },
    onSuccess: () => {
      showToast(`Headcount (${totalCalculatedOccupancy} evacuees) officially submitted to District Administration Live Board!`);
      queryClient.invalidateQueries({ queryKey: ['operatorCamps'] });
      queryClient.invalidateQueries({ queryKey: ['camps'] });
      queryClient.invalidateQueries({ queryKey: ['liveBoard'] });
      queryClient.invalidateQueries({ queryKey: ['authorityDashboard'] });
    }
  });

  const handleQuickAdd = (delta: number) => {
    // Add proportionally
    const perGroup = Math.max(1, Math.round(delta / 3));
    setMenCount(prev => Math.max(0, prev + perGroup));
    setWomenCount(prev => Math.max(0, prev + perGroup));
    setChildrenCount(prev => Math.max(0, prev + (delta - (perGroup * 2))));
  };

  const handleAddUrgentNeed = () => {
    if (!urgentNeedInput.trim()) return;
    if (!urgentNeedsList.includes(urgentNeedInput.trim())) {
      setUrgentNeedsList([...urgentNeedsList, urgentNeedInput.trim()]);
    }
    setUrgentNeedInput('');
  };

  const handleRemoveUrgentNeed = (item: string) => {
    setUrgentNeedsList(urgentNeedsList.filter(n => n !== item));
  };

  const handleCalculateRescueRoute = async () => {
    setIsRouting(true);
    try {
      let lat = 12.9760;
      let lng = 80.2195;
      if (routeOrigin.includes('Mudichur')) {
        lat = 12.9120;
        lng = 80.0750;
      } else if (routeOrigin.includes('Saidapet')) {
        lat = 13.0180;
        lng = 80.2240;
      }
      const res = await offlineRecoveryService.calculateOfflineRoute(
        { name: routeOrigin, lat, lng },
        selectedCampId
      );
      setOfflineRouteResult(res);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Routing calculation failed');
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast message notification */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-2xl bg-slate-900 border border-amber-400 text-white text-xs shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Top Camp Scope Selector & Key Stat Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-white to-amber-50/50 border border-amber-200/80 shadow-soft space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-900 text-xs font-black tracking-wide border border-amber-500/20">
              <Tent className="w-3.5 h-3.5 text-amber-600" />
              CAMP OPERATOR ON DUTY
            </span>
            <h2 className="text-2xl font-black font-heading text-slate-900">
              {currentCamp?.name || 'Relief Shelter'}
            </h2>
            <p className="text-xs text-slate-600 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              District: Alappuzha/Chennai • Contact: {currentCamp?.contact}
            </p>
          </div>

          {/* Camp Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Switch Camp Station:</label>
            <select
              value={selectedCampId}
              onChange={(e) => setSelectedCampId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer shadow-xs"
            >
              {camps?.map((c) => (
                <option key={c.camp_id} value={c.camp_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shelter Occupancy Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">Current Sheltered</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-heading">
                {totalCalculatedOccupancy}
              </span>
              <span className="text-xs text-slate-500">/ {currentCamp?.capacity || 1500}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  totalCalculatedOccupancy / (currentCamp?.capacity || 1500) > 0.9
                    ? 'bg-rose-500'
                    : (totalCalculatedOccupancy / (currentCamp?.capacity || 1500) > 0.75 ? 'bg-amber-500' : 'bg-emerald-500')
                }`}
                style={{ width: `${Math.min(100, Math.round((totalCalculatedOccupancy / (currentCamp?.capacity || 1500)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">Available Beds Left</span>
            <span className="text-2xl font-black text-emerald-700 font-heading block mt-1">
              {Math.max(0, (currentCamp?.capacity || 1500) - totalCalculatedOccupancy)}
            </span>
            <span className="text-[11px] text-emerald-800 font-medium">Ready for admissions</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">Meal Portions</span>
            <span className="text-2xl font-black text-amber-700 font-heading block mt-1">
              {mealsRemaining}
            </span>
            <span className="text-[11px] text-slate-500">Hot meals in pantry</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">Drinking Water</span>
            <span className="text-2xl font-black text-sky-700 font-heading block mt-1">
              {waterLitersRemaining} L
            </span>
            <span className="text-[11px] text-slate-500">Purified chlorinated reserves</span>
          </div>
        </div>
      </div>

      {/* Grid: Admin Rescue Directives (HOW & WHERE to rescue) & Headcount Reporter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Admin Rescue Directives & Mission Instructions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-deep text-white flex items-center justify-center shadow-md">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black font-heading text-slate-900">
                  Admin Rescue Directives & Mission Orders
                </h3>
                <p className="text-xs text-slate-500">
                  Direct orders from District Administration on <span className="font-bold text-deep">HOW</span> and <span className="font-bold text-deep">WHERE</span> to rescue stranded people
                </p>
              </div>
            </div>
            <Badge variant="ocean" size="sm">
              {filteredDirectives.length} Active Directives
            </Badge>
          </div>

          {filteredDirectives.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-sm text-slate-800">No pending rescue directives</p>
              <p className="text-xs text-slate-500">All dispatched missions for this camp have been completed or en-route.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDirectives.map((d) => (
                <Card
                  key={d.id}
                  className={`p-5 border transition-all shadow-sm ${
                    d.status === 'dispatched'
                      ? 'border-amber-300 bg-amber-50/20'
                      : (d.status === 'completed' ? 'border-emerald-200 bg-emerald-50/10' : 'border-sky-200 bg-sky-50/20')
                  }`}
                >
                  {/* Directive Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                          {d.id}
                        </span>
                        <Badge
                          variant={d.urgency === 'Critical' ? 'rose' : (d.urgency === 'High' ? 'amber' : 'ocean')}
                          size="sm"
                        >
                          {d.urgency.toUpperCase()} PRIORITY
                        </Badge>
                        <Badge
                          variant={d.status === 'completed' ? 'mint' : (d.status === 'en_route' ? 'ocean' : 'sun')}
                          size="sm"
                        >
                          {d.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h4 className="font-black text-base text-slate-900 font-heading">
                        Rescue {d.people_count} Stranded People
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(d.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* WHERE SECTION */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                        <MapPin className="w-4 h-4 text-rose-600" />
                        WHERE TO RESCUE:
                      </span>
                      <p className="font-bold text-slate-800 text-xs">{d.location_name}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Coordinates: {d.lat.toFixed(4)}, {d.lng.toFixed(4)} • Zone: {d.target_zone.toUpperCase()}
                      </p>
                    </div>

                    {/* HOW SECTION */}
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                      <span className="font-extrabold text-deep flex items-center gap-1.5 text-xs mb-1">
                        <Navigation className="w-4 h-4 text-ocean" />
                        HOW TO RESCUE (Tactical Instructions from Admin):
                      </span>
                      <p className="text-slate-800 text-xs font-medium leading-relaxed">
                        {d.how_to_rescue}
                      </p>
                    </div>

                    {/* Stranded breakdown & equipment */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
                        <span className="font-bold block text-slate-600">Vulnerabilities:</span>
                        <span>Children: {d.vulnerabilities?.children || 0} • Elderly: {d.vulnerabilities?.elderly || 0} • Medical: {d.vulnerabilities?.medical || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
                        <span className="font-bold block text-slate-600">Equipment Needed:</span>
                        <span>{d.equipment_needed?.join(', ') || 'Inflatable Craft, Life Vests'}</span>
                      </div>
                    </div>

                    {d.operator_notes && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                        <span className="font-bold">Operator Dispatch Note: </span>
                        {d.operator_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar for Operator */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    {d.status === 'dispatched' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => updateDirectiveMutation.mutate({
                            id: d.id,
                            status: 'acknowledged',
                            notes: `Acknowledged by ${user?.name || 'Camp In-Charge'}. Preparing volunteer crew.`
                          })}
                          disabled={updateDirectiveMutation.isPending}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Acknowledge Order
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateDirectiveMutation.mutate({
                            id: d.id,
                            status: 'en_route',
                            notes: `Rescue boat deployed from ${currentCamp?.name || 'camp'} towards ${d.location_name}.`
                          })}
                          disabled={updateDirectiveMutation.isPending}
                          icon={<Send className="w-3.5 h-3.5" />}
                        >
                          Deploy Rescue Team
                        </Button>
                      </>
                    )}

                    {d.status === 'acknowledged' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateDirectiveMutation.mutate({
                          id: d.id,
                          status: 'en_route',
                          notes: `Team en-route to extraction point via safe corridor.`
                        })}
                        disabled={updateDirectiveMutation.isPending}
                        icon={<Navigation className="w-3.5 h-3.5" />}
                      >
                        Confirm Team En-Route
                      </Button>
                    )}

                    {d.status === 'en_route' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        onClick={() => {
                          const arrived = prompt(`Enter number of people safely rescued and admitted to ${currentCamp?.name}:`, String(d.people_count));
                          const count = arrived ? parseInt(arrived, 10) : d.people_count;
                          updateDirectiveMutation.mutate({
                            id: d.id,
                            status: 'completed',
                            notes: `Mission successful. ${count} evacuees safely sheltered at ${currentCamp?.name}.`,
                            arrivedCount: count
                          });
                          // Automatically suggest incrementing headcount
                          handleQuickAdd(count);
                        }}
                        disabled={updateDirectiveMutation.isPending}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Mark Rescued & Safely Arrived
                      </Button>
                    )}

                    {d.status === 'completed' && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Completed ({d.arrived_count || d.people_count} evacuees admitted)
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* District Admin Announcements & Broadcasts */}
          <div className="pt-4 space-y-3">
            <h3 className="text-base font-black font-heading text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Live Updates & Broadcasts from District Administration
            </h3>
            <div className="space-y-3">
              {announcements?.slice(0, 3).map((ann) => (
                <div key={ann.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">{ann.title}</span>
                    <Badge variant={ann.level === 'Evacuate' ? 'rose' : 'sun'} size="sm">
                      {ann.level}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{ann.body}</p>
                  <div className="text-[10px] text-slate-400 pt-1 flex justify-between">
                    <span>Source: {ann.published_by}</span>
                    <span>{new Date(ann.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Evacuee Headcount & Shelter Occupancy Reporter (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-2 border-amber-300 bg-white shadow-soft space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 font-heading">
                    Evacuee Headcount Reporter
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Submit verified count of people directly to District Admin
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Batch Increment Buttons */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Quick Influx Add (+People):</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 25].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAdd(amt)}
                    className="py-1.5 text-xs font-black rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 transition-all cursor-pointer shadow-xs"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Demographics Breakdown */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-black text-slate-900 block uppercase tracking-wider">
                Demographic Breakdown (Total: {totalCalculatedOccupancy})
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Adult Men</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMenCount(Math.max(0, menCount - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={menCount}
                      onChange={(e) => setMenCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1"
                    />
                    <button
                      type="button"
                      onClick={() => setMenCount(menCount + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Adult Women</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWomenCount(Math.max(0, womenCount - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={womenCount}
                      onChange={(e) => setWomenCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1"
                    />
                    <button
                      type="button"
                      onClick={() => setWomenCount(womenCount + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Children (&lt; 12 yrs)</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1"
                    />
                    <button
                      type="button"
                      onClick={() => setChildrenCount(childrenCount + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Senior Citizens (60+)</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSeniorsCount(Math.max(0, seniorsCount - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={seniorsCount}
                      onChange={(e) => setSeniorsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1"
                    />
                    <button
                      type="button"
                      onClick={() => setSeniorsCount(seniorsCount + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1 flex items-center justify-between text-xs">
                  <span>Bedridden / Medical Support Evacuees</span>
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                </label>
                <input
                  type="number"
                  value={medicalPatientsCount}
                  onChange={(e) => setMedicalPatientsCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-rose-900"
                />
              </div>
            </div>

            {/* Remaining Supplies Tally */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-black text-slate-900 block uppercase tracking-wider">
                Emergency Supplies Tally
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Meals Remaining</label>
                  <input
                    type="number"
                    value={mealsRemaining}
                    onChange={(e) => setMealsRemaining(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Water Liters</label>
                  <input
                    type="number"
                    value={waterLitersRemaining}
                    onChange={(e) => setWaterLitersRemaining(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Warm Blankets</label>
                  <input
                    type="number"
                    value={blanketsRemaining}
                    onChange={(e) => setBlanketsRemaining(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">First Aid Kits</label>
                  <input
                    type="number"
                    value={medicalKitsRemaining}
                    onChange={(e) => setMedicalKitsRemaining(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Urgent Needs & Requests */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">Urgent Needs for District Admin:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 50 Baby Diapers, Diesel Canisters..."
                  value={urgentNeedInput}
                  onChange={(e) => setUrgentNeedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrgentNeed())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddUrgentNeed}
                  className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {urgentNeedsList.map((need, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-900 border border-rose-200 text-[11px] font-bold"
                  >
                    {need}
                    <button
                      type="button"
                      onClick={() => handleRemoveUrgentNeed(need)}
                      className="text-rose-500 hover:text-rose-800 cursor-pointer font-black ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Submit Headcount Button */}
            <div className="pt-3 border-t border-slate-200">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white font-black text-sm shadow-md"
                onClick={() => submitHeadcountMutation.mutate()}
                disabled={submitHeadcountMutation.isPending}
                icon={<Send className="w-4 h-4" />}
              >
                {submitHeadcountMutation.isPending ? 'Syncing Headcount...' : 'Submit Headcount to District Admin'}
              </Button>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Works online & offline. Automatically persists to local recovery DB and queues sync if disconnected.
              </p>
            </div>
          </Card>

          {/* Quick Offline Safe Route Guide for Field Teams */}
          <Card className="p-5 border border-sky-200 bg-sky-50/30 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-ocean" />
              <h4 className="font-extrabold text-sm text-slate-900 font-heading">
                Guide Rescue Team (Offline Route Finder)
              </h4>
            </div>
            <p className="text-[11px] text-slate-600">
              Calculate safe approach corridors avoiding submerged streets to guide incoming boats and convoys:
            </p>

            <div className="space-y-2 text-xs">
              <select
                value={routeOrigin}
                onChange={(e) => setRouteOrigin(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
              >
                <option value="Velachery Vijayanagar Junction">Velachery (Vijayanagar 100ft)</option>
                <option value="Mudichur Rayappa Nagar">Mudichur (Rayappa Nagar / Bund)</option>
                <option value="Saidapet Jones Road Subway">Saidapet (Adyar Basin Subway)</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center font-bold"
                onClick={handleCalculateRescueRoute}
                disabled={isRouting}
                icon={<Navigation className="w-3.5 h-3.5" />}
              >
                {isRouting ? 'Calculating...' : 'Compute Safe Approach Corridor'}
              </Button>
            </div>

            {offlineRouteResult && (
              <div className="p-3 rounded-2xl bg-white border border-sky-200 text-xs space-y-2 mt-2">
                <div className="flex justify-between font-bold text-deep">
                  <span>Convoy Distance: {offlineRouteResult.totalDistanceKm} km</span>
                  <span>Est. Time: {offlineRouteResult.estimatedTravelMinutes} mins</span>
                </div>
                <p className="text-[11px] text-emerald-800 font-bold">
                  Recommended: {offlineRouteResult.recommendedCorridor}
                </p>
                <div className="text-[10px] text-rose-700 bg-rose-50 p-2 rounded-lg">
                  <span className="font-bold block">Avoided Hazards:</span>
                  {offlineRouteResult.hazardsAvoided.join(', ')}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
