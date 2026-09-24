import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { EvacuationGroup, PublicCamp, GroupType } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Users, Plus, ArrowRight, CheckCircle2, Clock, MapPin, Tent,
  Ship, Shield, Plane, Truck, Anchor
} from 'lucide-react';

const CHENNAI_ZONES_LIST = [
  { id: "velachery", name: "Velachery & Pallikaranai" },
  { id: "mudichur", name: "Mudichur & Varadharajapuram" },
  { id: "saidapet", name: "Saidapet (Adyar Basin)" },
  { id: "perumbakkam", name: "Perumbakkam & Medavakkam" },
  { id: "kolathur", name: "Kolathur & Villivakkam" },
  { id: "sholinganallur", name: "Sholinganallur / OMR" },
  { id: "tnagar", name: "T. Nagar / Mambalam" }
];

export const EvacuationGroupsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [name, setName] = useState('NDRF Boat Squad Charlie');
  const [sourceZone, setSourceZone] = useState('velachery');
  const [groupType, setGroupType] = useState<GroupType>('boat');
  const [boatsCount, setBoatsCount] = useState(2);
  const [personnelCount, setPersonnelCount] = useState(8);
  const [airDropKits, setAirDropKits] = useState(0);
  const [vehiclesCount, setVehiclesCount] = useState(1);
  const [population, setPopulation] = useState(80);
  const [filterType, setFilterType] = useState<string>('all');

  const { data: groups } = useQuery<EvacuationGroup[]>({
    queryKey: ['groups'],
    queryFn: () => api.get<EvacuationGroup[]>('/authority/groups')
  });

  const { data: camps } = useQuery<PublicCamp[]>({
    queryKey: ['camps'],
    queryFn: () => api.get<PublicCamp[]>('/public/camps')
  });

  const handleUpdateStatus = async (groupId: string, newStatus: 'waiting' | 'moving' | 'arrived') => {
    try {
      await api.patch(`/authority/groups/${groupId}/status`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['camps'] });
      queryClient.invalidateQueries({ queryKey: ['liveBoard'] });
      queryClient.invalidateQueries({ queryKey: ['authorityDashboard'] });
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleCreateGroup = async () => {
    try {
      await api.post('/authority/groups', {
        name,
        source_zone: sourceZone,
        group_type: groupType,
        boats_count: Number(boatsCount),
        personnel_count: Number(personnelCount),
        air_drop_kits: Number(airDropKits),
        vehicles_count: Number(vehiclesCount),
        population: Number(population)
      });
      setCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['liveBoard'] });
    } catch (err: any) {
      alert(err.message || 'Group creation failed');
    }
  };

  const filteredGroups = groups?.filter(g => filterType === 'all' || g.group_type === filterType) || [];
  const waitingGroups = filteredGroups.filter(g => g.status === 'waiting');
  const movingGroups = filteredGroups.filter(g => g.status === 'moving');
  const arrivedGroups = filteredGroups.filter(g => g.status === 'arrived');

  const getGroupIcon = (type?: string) => {
    switch (type) {
      case 'boat': return <Ship className="w-4 h-4 text-sky-600" />;
      case 'ground_team': return <Users className="w-4 h-4 text-emerald-600" />;
      case 'air_supply': return <Plane className="w-4 h-4 text-purple-600" />;
      case 'high_truck': return <Truck className="w-4 h-4 text-amber-600" />;
      default: return <Ship className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-ocean" />
            Evacuation & Tactical Rescue Asset Board
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Categorized multi-agency rescue units: Inflatable Boats, Ground Personnel (Men), Air Supply Drops, and High Trucks.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModal(true)}
          icon={<Plus className="w-4 h-4" />}
          className="self-start sm:self-auto"
        >
          Dispatch New Rescue Batch
        </Button>
      </div>

      {/* Asset Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 mr-1">Filter Asset:</span>
        {[
          { id: 'all', label: 'All Tactical Units', icon: null },
          { id: 'boat', label: 'Inflatable Boats (NDRF/SDRF)', icon: Ship },
          { id: 'ground_team', label: 'Rescue Men / Tactical Teams', icon: Users },
          { id: 'air_supply', label: 'Air Drop Kits (IAF Drones)', icon: Plane },
          { id: 'high_truck', label: 'Amphibious Trucks', icon: Truck }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              filterType === f.id
                ? 'bg-ocean text-white border-ocean shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.icon && <f.icon className="w-3.5 h-3.5" />}
            {f.label}
          </button>
        ))}
      </div>

      {/* 3 Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Waiting */}
        <div className="bg-slate-100/70 rounded-3xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              1. Staged / Ready ({waitingGroups.length})
            </span>
            <Badge variant="sun" size="sm">Staged</Badge>
          </div>

          <div className="space-y-3">
            {waitingGroups.map((g) => (
              <Card key={g.group_id} className="p-4 border border-slate-200 shadow-sm space-y-2 rounded-2xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                      {getGroupIcon(g.group_type)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{g.name || g.group_id}</h4>
                      <p className="text-[11px] text-slate-500 uppercase">{g.source_zone}</p>
                    </div>
                  </div>
                  <Badge variant="sun" size="sm">WAITING</Badge>
                </div>

                <div className="p-2 bg-slate-50 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span>Evacuees / Capacity:</span>
                    <strong>{g.population} persons</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Tactical Assets:</span>
                    <strong>
                      {g.boats_count ? `${g.boats_count} Boats, ` : ''}
                      {g.personnel_count ? `${g.personnel_count} Men` : ''}
                      {g.air_drop_kits ? `${g.air_drop_kits} Air Kits` : ''}
                      {g.vehicles_count && !g.boats_count ? `${g.vehicles_count} Trucks` : ''}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Assigned Shelter:</span>
                    <strong className="text-ocean truncate block max-w-[140px]">{g.destination_camp}</strong>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs py-1"
                  onClick={() => handleUpdateStatus(g.group_id, 'moving')}
                >
                  Dispatch Unit (En Route) →
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Column 2: Moving */}
        <div className="bg-sky-50/70 rounded-3xl p-4 border border-sky-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-sky-200">
            <span className="font-extrabold text-xs text-ocean uppercase tracking-wider">
              2. Moving in Transit ({movingGroups.length})
            </span>
            <Badge variant="ocean" size="sm">En Route</Badge>
          </div>

          <div className="space-y-3">
            {movingGroups.map((g) => (
              <Card key={g.group_id} className="p-4 border border-sky-200 bg-white shadow-sm space-y-2 rounded-2xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
                      {getGroupIcon(g.group_type)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{g.name || g.group_id}</h4>
                      <p className="text-[11px] text-slate-500 uppercase">{g.source_zone}</p>
                    </div>
                  </div>
                  <Badge variant="ocean" size="sm">ETA: {g.eta}</Badge>
                </div>

                <div className="p-2 bg-sky-50/50 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span>Payload:</span>
                    <strong>{g.population} citizens ({g.personnel_count || 6} rescuers)</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Destination:</span>
                    <strong className="text-ocean truncate block max-w-[140px]">{g.destination_camp}</strong>
                  </div>
                </div>

                <Button
                  variant="success"
                  size="sm"
                  className="w-full text-xs py-1"
                  onClick={() => handleUpdateStatus(g.group_id, 'arrived')}
                >
                  Confirm Camp Arrival ✓
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Column 3: Arrived */}
        <div className="bg-emerald-50/70 rounded-3xl p-4 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
            <span className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider">
              3. Sheltered & Checked-in ({arrivedGroups.length})
            </span>
            <Badge variant="mint" size="sm">Arrived</Badge>
          </div>

          <div className="space-y-3">
            {arrivedGroups.map((g) => (
              <Card key={g.group_id} className="p-4 border border-emerald-200 bg-white shadow-sm space-y-2 rounded-2xl opacity-90">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{g.name || g.group_id}</h4>
                      <p className="text-[11px] text-slate-500 uppercase">{g.source_zone}</p>
                    </div>
                  </div>
                  <Badge variant="mint" size="sm">COMPLETED</Badge>
                </div>

                <p className="text-[11px] text-emerald-800 font-semibold">
                  ✓ {g.population} citizens admitted to {g.destination_camp}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-base text-slate-900 font-heading">
              Dispatch New Evacuation / Rescue Batch
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Squad / Unit Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Asset Category:</label>
                <select
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value as GroupType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="boat">Inflatable & Motorized Boat (NDRF / SDRF)</option>
                  <option value="ground_team">Ground Tactical Rescue Men</option>
                  <option value="air_supply">Air Force Drone Supply Package</option>
                  <option value="high_truck">Amphibious High-Clearance Truck</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Boats Count:</label>
                  <input
                    type="number"
                    value={boatsCount}
                    onChange={(e) => setBoatsCount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Number of Men (Rescuers):</label>
                  <input
                    type="number"
                    value={personnelCount}
                    onChange={(e) => setPersonnelCount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Air Drop Supply Kits:</label>
                  <input
                    type="number"
                    value={airDropKits}
                    onChange={(e) => setAirDropKits(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Citizen Target Population:</label>
                  <input
                    type="number"
                    value={population}
                    onChange={(e) => setPopulation(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Source Neighborhood (Chennai):</label>
                <select
                  value={sourceZone}
                  onChange={(e) => setSourceZone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {CHENNAI_ZONES_LIST.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateGroup}>
                Create & Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
