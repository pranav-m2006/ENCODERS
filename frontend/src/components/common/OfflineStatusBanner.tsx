import React, { useState, useEffect } from 'react';
import { offlineRecoveryService } from '../../core/offlineRecoveryDb';
import { Wifi, WifiOff, RefreshCw, Database, Navigation, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { PublicCamp, OfflineRouteResult } from '../../lib/types';

export const OfflineStatusBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(offlineRecoveryService.isEffectiveOffline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [stats, setStats] = useState({ campsCount: 6, roadsCount: 9, directivesCount: 3, pendingOutboxCount: 0 });
  const [routeModalOpen, setRouteModalOpen] = useState(false);

  // Offline route calculation state
  const [originName, setOriginName] = useState('Velachery Vijayanagar Junction');
  const [originLat, setOriginLat] = useState(12.9760);
  const [originLng, setOriginLng] = useState(80.2195);
  const [targetCampId, setTargetCampId] = useState('camp_guru_nanak');
  const [campsList, setCampsList] = useState<PublicCamp[]>([]);
  const [calculatedRoute, setCalculatedRoute] = useState<OfflineRouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const refreshStats = async () => {
    try {
      const s = await offlineRecoveryService.getOfflineStats();
      setStats(s);
      const camps = await offlineRecoveryService.getOfflineCamps();
      setCampsList(camps);
    } catch (e) {
      console.warn('Failed to refresh offline stats:', e);
    }
  };

  useEffect(() => {
    refreshStats();
    const unsub = offlineRecoveryService.subscribeStatus((offline) => {
      setIsOffline(offline);
      refreshStats();
    });

    const handleOnline = () => {
      if (!offlineRecoveryService.isEffectiveOffline()) {
        setIsOffline(false);
        refreshStats();
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      refreshStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(refreshStats, 8000);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleToggleOffline = () => {
    const nextVal = !isOffline;
    offlineRecoveryService.setSimulatedOffline(nextVal);
    setIsOffline(nextVal);
    refreshStats();
    setSyncToast(nextVal ? 'Simulated Offline Mode Enabled. IndexedDB Recovery DB Active.' : 'Online Mode Restored.');
    setTimeout(() => setSyncToast(null), 3500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await refreshStats();
      setSyncToast(`Sync completed. ${stats.campsCount} Camps & ${stats.roadsCount} Routes refreshed.`);
    } catch {
      setSyncToast('Sync error or offline.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  const handleRunOfflineRoute = async () => {
    setIsCalculatingRoute(true);
    try {
      const res = await offlineRecoveryService.calculateOfflineRoute(
        { name: originName, lat: originLat, lng: originLng },
        targetCampId
      );
      setCalculatedRoute(res);
    } catch (err: any) {
      alert(err.message || 'Failed to compute offline route');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  return (
    <>
      {/* Top Floating Emergency Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md relative z-40">
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
            isOffline
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          }`}>
            {isOffline ? (
              <>
                <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>OFFLINE (Recovery DB Active)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>ONLINE (Server Live)</span>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-sky-400" />
              <span>{stats.campsCount} Shelters</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>{stats.roadsCount} Safe Roads</span>
            <span className="text-slate-600">•</span>
            <span>{stats.directivesCount} Directives</span>
            {stats.pendingOutboxCount > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="bg-coral/20 text-coral px-1.5 py-0.2 rounded font-bold">
                  {stats.pendingOutboxCount} Outbox Pending
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRouteModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 font-bold text-[11px] transition-all cursor-pointer"
            title="Calculate safe route without internet"
          >
            <Navigation className="w-3 h-3" />
            <span className="hidden md:inline">Offline Safe Route Finder</span>
            <span className="md:hidden">Offline Route</span>
          </button>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-all cursor-pointer"
            title="Refresh local offline database"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
            <span className="hidden lg:inline">Sync DB</span>
          </button>

          <button
            onClick={handleToggleOffline}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              isOffline
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle simulated offline mode to test recovery DB"
          >
            {isOffline ? 'Disable Offline Mode' : 'Test Offline Mode'}
          </button>
        </div>
      </div>

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="fixed bottom-5 right-5 z-50 p-3 rounded-2xl bg-slate-900 border border-sky-400 text-white text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Offline Safe Route & Camp Finder Modal */}
      {routeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-sky-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-ocean">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 font-heading">
                    Offline Safe Route & Shelter Navigator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Runs 100% offline from IndexedDB Recovery DB. Evaluates flooded road hazards and elevated corridors.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRouteModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Starting Location / Zone</label>
                <select
                  value={originName}
                  onChange={(e) => {
                    setOriginName(e.target.value);
                    if (e.target.value.includes('Velachery')) {
                      setOriginLat(12.9760);
                      setOriginLng(80.2195);
                    } else if (e.target.value.includes('Mudichur')) {
                      setOriginLat(12.9120);
                      setOriginLng(80.0750);
                    } else if (e.target.value.includes('Saidapet')) {
                      setOriginLat(13.0180);
                      setOriginLng(80.2240);
                    } else {
                      setOriginLat(12.9480);
                      setOriginLng(80.1450);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900"
                >
                  <option value="Velachery Vijayanagar Junction">Velachery (Vijayanagar / 100ft Rd)</option>
                  <option value="Mudichur Rayappa Nagar">Mudichur (Rayappa Nagar / Canal Bund)</option>
                  <option value="Saidapet Jones Road Subway">Saidapet (Adyar River Basin)</option>
                  <option value="Pallavaram-Thoraipakkam Radial">Pallavaram / Tambaram Radial</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Relief Shelter</label>
                <select
                  value={targetCampId}
                  onChange={(e) => setTargetCampId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900"
                >
                  {campsList.map((c) => (
                    <option key={c.camp_id} value={c.camp_id}>
                      {c.name} ({c.available} beds left)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full justify-center font-bold"
              onClick={handleRunOfflineRoute}
              disabled={isCalculatingRoute}
              icon={<Navigation className="w-4 h-4" />}
            >
              {isCalculatingRoute ? 'Calculating Offline Safe Path...' : 'Calculate Safe Evacuation Route (Offline)'}
            </Button>

            {/* Route Result Display */}
            {calculatedRoute && (
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Distance</span>
                    <span className="text-base font-extrabold text-deep">{calculatedRoute.totalDistanceKm} km</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Est. Convoy Time</span>
                    <span className="text-base font-extrabold text-amber-700">{calculatedRoute.estimatedTravelMinutes} mins</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Safety Rating</span>
                    <span className="text-base font-extrabold text-emerald-700">{calculatedRoute.safetyScore}/100</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-emerald-950 block">Recommended Safe Corridor</span>
                    <span className="text-emerald-800 text-[11px]">{calculatedRoute.recommendedCorridor}</span>
                  </div>
                </div>

                {calculatedRoute.hazardsAvoided.length > 0 && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Submerged Hazards Automatically Avoided:</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-0.5">
                      {calculatedRoute.hazardsAvoided.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Step-by-Step Offline Turn Guidance:</h4>
                  <div className="space-y-2">
                    {calculatedRoute.steps.map((st, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                        <span className="w-5 h-5 rounded-full bg-deep text-white font-black flex items-center justify-center shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{st.instruction}</p>
                          <span className="text-slate-500 text-[10px]">Road: {st.road_name} ({st.distance_km} km)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
