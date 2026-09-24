import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RescueUnit, RescueDirective, PublicCamp } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Ship, Send, Navigation, Clock, ShieldCheck, MapPin, Radio,
  Plus, CheckCircle2, AlertTriangle, Users, Tent, Sparkles
} from 'lucide-react';

export const RescueOperationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [dispatchModal, setDispatchModal] = useState<RescueUnit | null>(null);
  const [targetZone, setTargetZone] = useState('zone_d');

  // Directive modal state
  const [directiveModalOpen, setDirectiveModalOpen] = useState(false);
  const [targetZoneSelect, setTargetZoneSelect] = useState('velachery');
  const [locationName, setLocationName] = useState('Vijayanagar 100ft Junction & AGS Colony');
  const [lat, setLat] = useState(12.9760);
  const [lng, setLng] = useState(80.2195);
  const [peopleCount, setPeopleCount] = useState(25);
  const [urgency, setUrgency] = useState<'Critical' | 'High' | 'Medium'>('Critical');
  const [howToRescue, setHowToRescue] = useState(
    'Deploy shallow draft Gemini inflatable boat with 40HP motor. Approach from Velachery Bypass elevated ramp. Do not enter Jones Road Subway which is submerged by 95cm. Carry pediatric first aid kits and life vests.'
  );
  const [assignedCampId, setAssignedCampId] = useState('camp_guru_nanak');
  const [childrenCount, setChildrenCount] = useState(6);
  const [elderlyCount, setElderlyCount] = useState(5);
  const [medicalCount, setMedicalCount] = useState(2);
  const [equipmentInput, setEquipmentInput] = useState('Inflatable Gemini Boat, 30 Life Jackets, Stretcher Kit');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const { data: units } = useQuery<RescueUnit[]>({
    queryKey: ['rescueUnits'],
    queryFn: () => api.get<RescueUnit[]>('/authority/rescue-units')
  });

  const { data: camps } = useQuery<PublicCamp[]>({
    queryKey: ['camps'],
    queryFn: () => api.get<PublicCamp[]>('/public/camps')
  });

  const { data: directives } = useQuery<RescueDirective[]>({
    queryKey: ['operatorDirectives'],
    queryFn: () => api.get<RescueDirective[]>('/authority/rescue/directives')
  });

  const createDirectiveMutation = useMutation({
    mutationFn: async () => {
      const camp = camps?.find(c => c.camp_id === assignedCampId);
      const payload: Partial<RescueDirective> = {
        target_zone: targetZoneSelect,
        location_name: locationName,
        lat,
        lng,
        people_count: peopleCount,
        urgency,
        how_to_rescue: howToRescue,
        assigned_camp_id: assignedCampId,
        assigned_camp_name: camp?.name || 'Assigned Relief Camp',
        equipment_needed: equipmentInput.split(',').map(s => s.trim()).filter(Boolean),
        vulnerabilities: {
          children: childrenCount,
          elderly: elderlyCount,
          medical: medicalCount
        }
      };
      return api.post<RescueDirective>('/authority/rescue/directives', payload);
    },
    onSuccess: (data: RescueDirective) => {
      setSuccessToast(`Rescue Directive #${data.id} dispatched to ${data.assigned_camp_name} operators!`);
      setDirectiveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['operatorDirectives'] });
      setTimeout(() => setSuccessToast(null), 4000);
    }
  });

  const handleDispatch = async () => {
    if (!dispatchModal) return;
    try {
      await api.post('/authority/rescue/dispatch', {
        unit_id: dispatchModal.resource_id,
        zone_id: targetZone
      });
      setDispatchModal(null);
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(err.message || 'Dispatch failed');
    }
  };

  return (
    <div className="space-y-6">
      {successToast && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-2xl bg-slate-900 border border-emerald-400 text-white text-xs shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header with "Issue Directive to Camp Operators" CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Ship className="w-6 h-6 text-ocean" />
            Rescue Fleet & Water Extraction Operations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tracking NDRF Gemini crafts, Fire & Rescue boats, Navy amphibians, and issuing rescue directives to camp operators
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          className="bg-deep hover:bg-deep-darker font-bold text-xs"
          onClick={() => setDirectiveModalOpen(true)}
          icon={<Radio className="w-4 h-4 text-aqua animate-pulse" />}
        >
          Issue Rescue Directive to Camp Operators
        </Button>
      </div>

      {/* Dispatched Rescue Directives Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
            <Radio className="w-4 h-4 text-ocean" />
            Live Rescue Directives Dispatched to Camp Operators ({directives?.length || 0})
          </h3>
          <span className="text-xs text-slate-500">Synced to field operators in real-time & recovery DB</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {directives?.map((d) => (
            <Card key={d.id} className="p-4 border border-slate-200 bg-white shadow-soft space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {d.id}
                    </span>
                    <h4 className="font-black text-sm text-slate-900 mt-1">{d.location_name}</h4>
                  </div>
                  <Badge variant={d.urgency === 'Critical' ? 'rose' : (d.urgency === 'High' ? 'amber' : 'ocean')} size="sm">
                    {d.urgency}
                  </Badge>
                </div>

                <div className="text-xs space-y-1.5">
                  <div className="p-2 rounded-lg bg-sky-50 text-[11px] text-slate-700 font-medium leading-relaxed">
                    <span className="font-bold text-deep block">HOW TO RESCUE:</span>
                    {d.how_to_rescue}
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">People Stranded:</span>
                    <span className="font-bold text-slate-900">{d.people_count} persons</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Assigned Camp:</span>
                    <span className="font-bold text-amber-800">{d.assigned_camp_name}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Status:</span>
                <Badge variant={d.status === 'completed' ? 'mint' : (d.status === 'en_route' ? 'ocean' : 'sun')} size="sm">
                  {d.status.toUpperCase()}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Rescue Units Fleet Grid */}
      <div className="pt-4 space-y-3">
        <h3 className="text-base font-extrabold text-slate-900 font-heading">
          Water Extraction Fleet & NDRF Boats
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {units?.map((u) => (
            <Card key={u.resource_id} className="p-5 border border-sky-100 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 font-heading">{u.name}</h3>
                    <span className="text-xs text-slate-500">{u.type}</span>
                  </div>
                  <Badge variant={u.status === 'available' ? 'mint' : (u.status === 'in_transit' ? 'ocean' : 'sun')} size="sm">
                    {u.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="py-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Seating Capacity:</span>
                    <span className="font-bold text-slate-900">{u.capacity} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Zone:</span>
                    <span className="font-bold text-deep">{u.assigned_zone ? u.assigned_zone.toUpperCase() : 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated ETA:</span>
                    <span className="font-bold text-slate-700">{u.eta}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => setDispatchModal(u)}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Dispatch to Zone
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* MODAL: Issue Rescue Directive to Camp Operators */}
      {directiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 font-heading">
                    Issue Rescue Directive to Camp Operators
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Instruct field camp operators on <span className="font-bold text-deep">HOW</span> and <span className="font-bold text-deep">WHERE</span> to extract stranded residents
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* WHERE Section */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  1. WHERE TO RESCUE (Location & Zone)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Target Zone</label>
                    <select
                      value={targetZoneSelect}
                      onChange={(e) => {
                        setTargetZoneSelect(e.target.value);
                        if (e.target.value === 'velachery') {
                          setLocationName('Velachery 100ft Rd / Vijayanagar Jn');
                          setLat(12.9760);
                          setLng(80.2195);
                          setHowToRescue('Deploy shallow draft Gemini inflatable boat with 40HP motor. Approach from Velachery Bypass elevated ramp. Jones Road subway is impassable (95cm depth).');
                        } else if (e.target.value === 'mudichur') {
                          setLocationName('Mudichur Rayappa Nagar & Canal Bund');
                          setLat(12.9120);
                          setLng(80.0750);
                          setHowToRescue('Ashok Leyland 4x4 troop truck to Tambaram West bypass, then transfer to fiberglass rescue boat. Water level 75cm.');
                        } else {
                          setLocationName('Saidapet Adyar Riverbank Settlement');
                          setLat(13.0180);
                          setLng(80.2240);
                          setHowToRescue('Adyar stage is 4.65m. Guide families via footbridge walkway along Anna Salai elevated highway. Avoid lower bridge ramps.');
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold"
                    >
                      <option value="velachery">Velachery (68cm Flood Depth)</option>
                      <option value="mudichur">Mudichur (75cm Flood Depth)</option>
                      <option value="saidapet">Saidapet (Adyar Riverbank)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Target People Count</label>
                    <input
                      type="number"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Specific Landmark / Coordinates</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-semibold"
                  />
                </div>
              </div>

              {/* HOW Section */}
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
                <span className="font-black text-deep flex items-center gap-1.5 uppercase tracking-wide">
                  <Navigation className="w-3.5 h-3.5 text-ocean" />
                  2. HOW TO RESCUE (Tactical Method & Equipment)
                </span>
                <textarea
                  rows={3}
                  value={howToRescue}
                  onChange={(e) => setHowToRescue(e.target.value)}
                  className="w-full bg-white border border-sky-300 rounded-xl p-2.5 font-medium text-slate-900 text-xs"
                  placeholder="Specify craft type, safe corridor to take, road hazards to avoid..."
                />
              </div>

              {/* Assigned Camp & Vulnerabilities */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Assigned Relief Camp</label>
                  <select
                    value={assignedCampId}
                    onChange={(e) => setAssignedCampId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold"
                  >
                    {camps?.map((c) => (
                      <option key={c.camp_id} value={c.camp_id}>
                        {c.name} ({c.available} beds left)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Urgency Priority</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold"
                  >
                    <option value="Critical">Critical Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">Children</label>
                  <input
                    type="number"
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">Elderly (60+)</label>
                  <input
                    type="number"
                    value={elderlyCount}
                    onChange={(e) => setElderlyCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">Medical</label>
                  <input
                    type="number"
                    value={medicalCount}
                    onChange={(e) => setMedicalCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Equipment & Kits Required</label>
                <input
                  type="text"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDirectiveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-deep hover:bg-deep-darker font-bold"
                onClick={() => createDirectiveMutation.mutate()}
                disabled={createDirectiveMutation.isPending}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                {createDirectiveMutation.isPending ? 'Dispatching...' : 'Dispatch Order to Camp Operators'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Boat Dispatch Modal */}
      {dispatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-base text-slate-900 font-heading">
              Dispatch {dispatchModal.name}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Destination Evacuation Zone:</label>
                <select
                  value={targetZone}
                  onChange={(e) => setTargetZone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="zone_d">Velachery & Pallikaranai (Critical - 420 awaiting)</option>
                  <option value="zone_a">Mudichur & Varadharajapuram (Critical - 380 awaiting)</option>
                  <option value="zone_b">Saidapet Adyar Basin (High - 210 awaiting)</option>
                  <option value="zone_c">Perumbakkam & Medavakkam (High - 150 awaiting)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDispatchModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDispatch}
              >
                Execute Dispatch Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
