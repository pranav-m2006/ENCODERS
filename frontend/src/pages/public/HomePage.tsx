import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { PublicSummary, PublicAiUpdate, Announcement, LoopStage, MyLocationRiskResponse } from '../../lib/types';
import { AiBriefCard } from '../../components/ai/AiBriefCard';
import { AgentLoopTimeline } from '../../components/ai/AgentLoopTimeline';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ShieldAlert, Activity, Tent, Users, ArrowUpRight, ArrowDownRight,
  TrendingUp, Bell, CheckCircle2, AlertTriangle, Info, MapPin, Navigation,
  CloudRain, Droplets, Clock, Utensils, Compass, LifeBuoy
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

const CHENNAI_PRESETS = [
  { name: "Velachery (100ft Road)", lat: 12.9815, lng: 80.2180 },
  { name: "Mudichur (Adyar Basin)", lat: 12.9120, lng: 80.0710 },
  { name: "Saidapet (Bridge Area)", lat: 13.0200, lng: 80.2230 },
  { name: "Perumbakkam (Medavakkam)", lat: 12.8980, lng: 80.1910 },
  { name: "Kolathur (Otteri Nullah)", lat: 13.1180, lng: 80.2110 },
  { name: "T. Nagar (Mambalam)", lat: 13.0418, lng: 80.2341 }
];

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useAuthStore();

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9815, lng: 80.2180 });
  const [selectedPreset, setSelectedPreset] = useState("Velachery (100ft Road)");
  const [isLocating, setIsLocating] = useState(false);

  const { data: summary, refetch: refetchSummary } = useQuery<PublicSummary>({
    queryKey: ['publicSummary'],
    queryFn: () => api.get<PublicSummary>('/public/summary')
  });

  const { data: aiUpdate, refetch: refetchAi, isFetching: isAiFetching } = useQuery<PublicAiUpdate>({
    queryKey: ['publicAiUpdate', language],
    queryFn: () => api.get<PublicAiUpdate>(`/public/ai-update?lang=${language}`)
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => api.get<Announcement[]>('/public/announcements')
  });

  const { data: loopStage } = useQuery<LoopStage>({
    queryKey: ['loop'],
    queryFn: () => api.get<LoopStage>('/authority/loop'),
    refetchInterval: 15000
  });

  // Location Risk Query
  const { data: locationRisk, refetch: refetchLocationRisk, isFetching: isRiskFetching } = useQuery<MyLocationRiskResponse>({
    queryKey: ['myLocationRisk', userCoords.lat, userCoords.lng],
    queryFn: () => api.post<MyLocationRiskResponse>('/public/my-location-risk', { lat: userCoords.lat, lng: userCoords.lng })
  });

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedPreset("My Live GPS Coordinates");
        setIsLocating(false);
      },
      (err) => {
        console.warn("GPS lookup failed, using Velachery preset", err);
        setUserCoords({ lat: 12.9815, lng: 80.2180 });
        setSelectedPreset("Velachery (100ft Road)");
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSelectPreset = (preset: typeof CHENNAI_PRESETS[0]) => {
    setUserCoords({ lat: preset.lat, lng: preset.lng });
    setSelectedPreset(preset.name);
  };

  const latestAnnouncement = announcements && announcements.length > 0 ? announcements[0] : null;

  return (
    <div className="space-y-6">
      {/* 1. Visible Agent Loop Stepper Strip */}
      <AgentLoopTimeline loopData={loopStage} simplified />

      {/* 2. Interactive Live Location Flood & Rain Predictor Card */}
      <Card className="border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-white to-blue-50/50 p-5 shadow-soft rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-sky-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-ocean text-white flex items-center justify-center shadow-md">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 font-heading">
                  My Live Location Flood & Rain Predictor
                </h2>
                <Badge variant="blue" size="sm">Chennai Real-time</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Detect your GPS or choose your Chennai neighborhood to calculate flood probability, rainfall (cm), and waterlogging ETA.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDetectGPS}
              isLoading={isLocating}
              className="flex items-center gap-1.5"
            >
              <Navigation className="w-4 h-4" />
              <span>Detect My GPS</span>
            </Button>
          </div>
        </div>

        {/* Quick Chennai Neighborhood selector chips */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 shrink-0">Quick Localities:</span>
          {CHENNAI_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(p)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all shrink-0 ${
                selectedPreset === p.name
                  ? 'bg-ocean text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-ocean hover:text-ocean'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Location Evaluation Results Display */}
        {locationRisk && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Box 1: Zone Risk & Probability */}
            <div className="bg-white/90 backdrop-blur rounded-xl p-3 border border-sky-100 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Evaluated Zone</span>
              <div className="mt-1">
                <p className="text-sm font-extrabold text-slate-900">{locationRisk.matched_zone_name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant={
                      locationRisk.risk_level === 'Critical' ? 'coral' :
                      locationRisk.risk_level === 'High' ? 'orange' :
                      locationRisk.risk_level === 'Medium' ? 'yellow' : 'emerald'
                    }
                    size="md"
                    dot
                  >
                    {locationRisk.risk_level} Risk ({locationRisk.probability_pct}%)
                  </Badge>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">{locationRisk.time_to_flood_display}</p>
            </div>

            {/* Box 2: Predicted Rain & Flood Level in CM */}
            <div className="bg-white/90 backdrop-blur rounded-xl p-3 border border-sky-100 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Predicted Rainfall & Flood</span>
              <div className="mt-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-sky-600" /> Rain (24h):
                  </span>
                  <span className="text-sm font-extrabold text-sky-700">{locationRisk.predicted_rain_cm} cm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-rose-600" /> Flood Depth:
                  </span>
                  <span className="text-sm font-extrabold text-rose-600">{locationRisk.predicted_flood_depth_cm} cm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Peak Inundation:
                  </span>
                  <span className="text-xs font-bold text-amber-700">~{locationRisk.time_to_flood_hours} hrs</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Calibrated from CMWSSB Radar</p>
            </div>

            {/* Box 3: Flooded Roads vs Safe Corridors */}
            <div className="bg-white/90 backdrop-blur rounded-xl p-3 border border-sky-100 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Routes & Accessibility</span>
              <div className="mt-1 space-y-1.5 text-xs">
                <div>
                  <span className="font-bold text-rose-700 flex items-center gap-1 text-[11px]">
                    ⚠️ Inundated Roads:
                  </span>
                  <p className="text-slate-600 text-[11px] truncate">
                    {locationRisk.flooded_roads_nearby.slice(0, 2).join(', ')}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-emerald-700 flex items-center gap-1 text-[11px]">
                    ✅ Safe Corridor:
                  </span>
                  <p className="text-slate-800 font-medium text-[11px] truncate">
                    {locationRisk.safe_corridors[0] || 'Elevated Flyover'}
                  </p>
                </div>
              </div>
              <NavLink to="/app/map" className="text-[11px] font-bold text-ocean hover:underline mt-1">
                Open full navigation map →
              </NavLink>
            </div>

            {/* Box 4: Recommended Relief Camp & Supplies */}
            <div className="bg-white/90 backdrop-blur rounded-xl p-3 border border-emerald-200 flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Nearest Relief Shelter</span>
                <span className="text-xs font-extrabold text-emerald-700">{locationRisk.nearest_camp.distance_km || 1.2} km</span>
              </div>
              <div className="mt-1">
                <p className="text-xs font-extrabold text-slate-900 leading-tight">
                  {locationRisk.nearest_camp.name}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="font-bold text-emerald-700">
                    {locationRisk.nearest_camp.available || 680} free spots
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 flex items-center gap-0.5">
                    <Utensils className="w-3 h-3 text-amber-600" /> {locationRisk.nearest_camp.meals_available || 3200} meals
                  </span>
                </div>
              </div>
              <NavLink
                to="/app/camps"
                className="mt-2 text-xs font-bold text-ocean hover:text-ocean-dark flex items-center gap-1 group"
              >
                <span>Camp Details & Tap-in</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </NavLink>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Headline Star: Hero AI Update Card */}
      <AiBriefCard
        variant="public"
        publicData={aiUpdate}
        onRefresh={() => {
          refetchAi();
          refetchSummary();
          refetchLocationRisk();
        }}
        isLoading={isAiFetching}
      />

      {/* 4. District Risk Banner & Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Risk Badge Card */}
        <Card className="md:col-span-1 border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50/30 p-4 flex flex-col justify-between shadow-soft">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">District Risk</span>
              <Badge variant={summary?.overall_risk === 'Critical' ? 'coral' : 'orange'} size="md" dot>
                {summary?.overall_risk || 'High'}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-900 leading-tight">Chennai District</p>
                <p className="text-xs text-amber-800 font-semibold mt-0.5">Adyar Basin Inundation Watch</p>
              </div>
            </div>
          </div>
          <NavLink
            to="/app/map"
            className="mt-3 text-xs font-bold text-ocean hover:text-ocean-dark flex items-center gap-1 group"
          >
            <span>Inspect ward zones on map</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </NavLink>
        </Card>

        {/* Stat Tile 1: Adyar River Level */}
        <Card className="border border-sky-100 p-4 flex flex-col justify-between shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Adyar River Level</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-ocean flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-heading text-slate-900">
                {summary?.river.level_m ?? 4.65}
              </span>
              <span className="text-xs font-bold text-slate-500">meters</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1">
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span>{summary?.river.trend ?? '+0.12 m/hr (Rising)'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Alert Threshold: 4.80m (Saidapet)</p>
        </Card>

        {/* Stat Tile 2: Relief Camps Open */}
        <Card className="border border-sky-100 p-4 flex flex-col justify-between shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Relief Shelters</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Tent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-heading text-slate-900">
                {summary?.camps_open ?? 6}
              </span>
              <span className="text-xs font-bold text-slate-500">/ {summary?.camps_total ?? 6} active</span>
            </div>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Facilities Operational
            </p>
          </div>
          <NavLink to="/app/camps" className="text-xs font-bold text-ocean hover:underline mt-2">
            View all relief camps & supplies →
          </NavLink>
        </Card>

        {/* Stat Tile 3: People Sheltered */}
        <Card className="border border-sky-100 p-4 flex flex-col justify-between shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Citizens Sheltered</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-heading text-slate-900">
                {summary?.people_sheltered ? summary.people_sheltered.toLocaleString() : '6,250'}
              </span>
              <span className="text-xs font-bold text-slate-500">evacuated</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hot meals and emergency water supplies provided
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Updated {new Date(summary?.updated_at || Date.now()).toLocaleTimeString()}
          </p>
        </Card>
      </div>

      {/* 5. Official GCC Announcements Strip */}
      {latestAnnouncement && (
        <Card className="border-l-4 border-l-rose-500 bg-white p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="coral" size="sm">
                  {latestAnnouncement.level}
                </Badge>
                <span className="text-xs font-bold text-slate-500">
                  {latestAnnouncement.published_by}
                </span>
                <span className="text-xs text-slate-400">
                  • {new Date(latestAnnouncement.published_at).toLocaleTimeString()}
                </span>
                {latestAnnouncement.target_zone && (
                  <Badge variant="blue" size="sm">
                    Zone: {latestAnnouncement.target_zone}
                  </Badge>
                )}
                {latestAnnouncement.predicted_flood_cm && (
                  <span className="text-xs font-bold text-rose-600">
                    Depth: {latestAnnouncement.predicted_flood_cm}cm
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-900 mt-1">{latestAnnouncement.title}</h4>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{latestAnnouncement.body}</p>
            </div>
            <NavLink
              to="/app/updates"
              className="text-xs font-bold text-ocean hover:underline shrink-0 self-center hidden sm:block"
            >
              All announcements →
            </NavLink>
          </div>
        </Card>
      )}
    </div>
  );
};
