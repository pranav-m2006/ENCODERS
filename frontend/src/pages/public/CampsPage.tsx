import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PublicCamp, AutoCheckinResponse } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Tent, Droplets, HeartPulse, Zap, Bath, Utensils, Phone,
  ExternalLink, Search, CheckCircle2, AlertCircle, Filter, Check,
  Package, ShieldAlert, Navigation, Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const CampsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMedical, setOnlyMedical] = useState(false);
  const [onlyWater, setOnlyWater] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);

  const { data: camps, isLoading, refetch } = useQuery<PublicCamp[]>({
    queryKey: ['camps'],
    queryFn: () => api.get<PublicCamp[]>('/public/camps')
  });

  const checkinMutation = useMutation({
    mutationFn: ({ campId, count }: { campId: string; count: number }) =>
      api.post<AutoCheckinResponse>(`/public/camps/${campId}/auto-checkin`, { people_count: count }),
    onSuccess: (data) => {
      setCheckinMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ['camps'] });
      queryClient.invalidateQueries({ queryKey: ['publicSummary'] });
      setCheckingInId(null);
      setTimeout(() => setCheckinMessage(null), 5000);
    },
    onError: (err: any) => {
      alert(`Check-in error: ${err.message || 'Failed to auto-checkin'}`);
      setCheckingInId(null);
    }
  });

  const handleAutoCheckin = (campId: string) => {
    setCheckingInId(campId);
    checkinMutation.mutate({ campId, count: 2 });
  };

  const filteredCamps = camps?.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesMedical = !onlyMedical || c.facilities?.medical;
    const matchesWater = !onlyWater || c.facilities?.water;
    return matchesSearch && matchesStatus && matchesMedical && matchesWater;
  });

  return (
    <div className="space-y-6">
      {/* Toast banner for auto-checkin */}
      {checkinMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 flex items-center justify-between shadow-soft animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Automated Geofence Tap-In Verified</p>
              <p className="text-sm font-semibold">{checkinMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setCheckinMessage(null)}
            className="text-xs font-bold text-emerald-700 hover:underline px-3 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
              <Tent className="w-6 h-6 text-ocean" />
              Chennai Relief Camps & Resource Inventory
            </h2>
            <Badge variant="blue" size="sm">Automated Geofence</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time occupancy, live food rations & potable water, urgent supply needs, and instant geofence check-in.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={t('searchCamps')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean/40 font-medium"
          />
        </div>
      </div>

      {/* Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-2">
        {['all', 'open', 'near_capacity', 'full'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border cursor-pointer ${
              filterStatus === st
                ? 'bg-ocean text-white border-ocean shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === 'all' ? 'All Shelters' : st.replace('_', ' ').toUpperCase()}
          </button>
        ))}

        <button
          onClick={() => setOnlyMedical(!onlyMedical)}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
            onlyMedical ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
          Has Medical Aid
        </button>

        <button
          onClick={() => setOnlyWater(!onlyWater)}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
            onlyWater ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-ocean" />
          Has Potable Water
        </button>
      </div>

      {/* Camps Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCamps?.map((camp) => {
          const occupancy = camp.capacity - camp.available;
          const occPct = Math.round((occupancy / camp.capacity) * 100);

          return (
            <Card key={camp.camp_id} hoverable className="flex flex-col justify-between border-sky-100 p-5 rounded-2xl shadow-soft">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-snug font-heading">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {camp.contact}
                    </p>
                  </div>
                  <Badge variant={camp.status === 'open' ? 'mint' : (camp.status === 'near_capacity' ? 'sun' : 'coral')} size="sm">
                    {camp.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                {/* Capacity Bar */}
                <div className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">Shelter Occupancy</span>
                    <span className={occPct >= 90 ? 'text-rose-600 font-extrabold' : 'text-slate-900'}>
                      {occupancy} / {camp.capacity} ({occPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occPct >= 90 ? 'bg-rose-500' : (occPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500')
                      }`}
                      style={{ width: `${Math.min(100, occPct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {camp.available} beds currently open
                  </p>
                </div>

                {/* Live Resource Allocations (Food, Water, Blankets) */}
                <div className="py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 mb-3 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Live Supplies Stock
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span><strong>{camp.meals_available || 2000}</strong> meals ready</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span><strong>{camp.water_liters_available || 6000}L</strong> water</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span><strong>{camp.blankets_available || 500}</strong> blankets</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <HeartPulse className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>{camp.medical_kits_available || 60}</strong> med kits</span>
                    </div>
                  </div>
                </div>

                {/* Urgent Needs Tag */}
                {camp.urgent_needs && camp.urgent_needs.length > 0 && (
                  <div className="mb-3 p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-600" /> Urgent Needs / Donations:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {camp.urgent_needs.map((need, idx) => (
                        <span key={idx} className="text-[10px] bg-white border border-amber-300 text-amber-900 font-semibold px-2 py-0.5 rounded-md">
                          {need}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facilities Badges */}
                <div className="py-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Facilities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {camp.facilities?.water && (
                      <span className="text-[11px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200 flex items-center gap-1 font-medium">
                        <Droplets className="w-3 h-3 text-ocean" /> Clean Water
                      </span>
                    )}
                    {camp.facilities?.medical && (
                      <span className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 font-medium">
                        <HeartPulse className="w-3 h-3 text-emerald-600" /> Medical Staff
                      </span>
                    )}
                    {camp.facilities?.power && (
                      <span className="text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 font-medium">
                        <Zap className="w-3 h-3 text-amber-600" /> Generator Backup
                      </span>
                    )}
                    {camp.facilities?.toilets && (
                      <span className="text-[11px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 font-medium">
                        <Bath className="w-3 h-3 text-slate-500" /> Sanitation
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoCheckin(camp.camp_id)}
                  isLoading={checkingInId === camp.camp_id}
                  className="flex items-center justify-center gap-1.5 border-ocean text-ocean hover:bg-sky-50 text-xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Enter Geofence (Tap-in)</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.open(`https://maps.google.com/?q=${camp.lat},${camp.lng}`, '_blank')}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  className="text-xs justify-center"
                >
                  Directions
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
