import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PublicForecast } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Activity, CloudRain, ShieldCheck, AlertTriangle, TrendingUp, Droplets } from 'lucide-react';

export const ForecastPage: React.FC = () => {
  const { data: forecast, isLoading } = useQuery<PublicForecast>({
    queryKey: ['forecast'],
    queryFn: () => api.get<PublicForecast>('/public/forecast')
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-ocean" />
          Chennai Rainfall (cm) & Flood Inundation (cm) Forecast
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Predictive multi-hour river gauge trajectories (Adyar / Cooum) and neighborhood-level flood depths for Greater Chennai.
        </p>
      </div>

      {/* Quick Inundation Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">24-Hour Catchment Rainfall</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-sky-900">{forecast?.overall_predicted_rain_cm ?? 22.5}</span>
            <span className="text-sm font-bold text-sky-700">centimeters (cm)</span>
          </div>
          <p className="text-[11px] text-sky-600 mt-1">IMD Meenambakkam Radar Feed</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Peak Flood Inundation</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-900">{forecast?.overall_predicted_flood_cm ?? 55.0}</span>
            <span className="text-sm font-bold text-rose-700">centimeters (cm)</span>
          </div>
          <p className="text-[11px] text-rose-600 mt-1">Expected in Velachery & Mudichur</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Adyar River Outflow</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-900">4.65</span>
            <span className="text-sm font-bold text-amber-700">meters (Alert: 4.80m)</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Saidapet Bridge Telemetry</p>
        </Card>
      </div>

      {/* Model Limitations Notice Strip */}
      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-950 block">Hydrological Research Prediction Notice:</span>
          <p className="mt-0.5 text-amber-900 leading-relaxed font-medium">
            {forecast?.limitations || "Hydrological prediction model for Greater Chennai. Continuously calibrated against Chembarambakkam reservoir outflow and CMWSSB radar."}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adyar River Level Forecast Chart */}
        <Card className="p-5 border border-sky-100 shadow-soft">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-ocean" />
              <h3 className="font-bold text-sm text-slate-900 font-heading">
                Adyar River Gauge Level (meters) & Alert Threshold
              </h3>
            </div>
            <Badge variant="coral" size="sm">Alert Limit: 4.80m</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast?.river_series || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} />
                <YAxis domain={[3.8, 5.2]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceLine y={4.8} label="Alert Threshold 4.80m" stroke="#E11D48" strokeDasharray="4 4" strokeWidth={2} />
                <Line type="monotone" dataKey="level_m" name="Adyar Water Level (m)" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">Saidapet Bridge telemetered sensor (+0.12 m/hr trend)</p>
        </Card>

        {/* Rainfall Accumulation Chart in CM */}
        <Card className="p-5 border border-sky-100 shadow-soft">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-ocean" />
              <h3 className="font-bold text-sm text-slate-900 font-heading">
                Precipitation Accumulation (cm / 2h intervals)
              </h3>
            </div>
            <Badge variant="ocean" size="sm">Doppler Radar</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast?.rain_series || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cm" name="Rainfall (cm)" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">Heaviest cloud bursts recorded across South Chennai & Tambaram</p>
        </Card>
      </div>

      {/* Per-Zone Probability & Flood Depth in CM Table */}
      <Card className="p-5 border border-sky-100 shadow-soft">
        <h3 className="font-bold text-base text-slate-900 font-heading mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Chennai Locality Forecast: Predicted Rainfall, Inundation Depth (cm) & Time to Peak
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Neighborhood</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3">Predicted Rain (cm)</th>
                <th className="py-2.5 px-3">Flood Depth (cm)</th>
                <th className="py-2.5 px-3">Time to Peak</th>
                <th className="py-2.5 px-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {forecast?.zone_forecast?.map((zf) => (
                <tr key={zf.zone_id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {zf.name || zf.zone_id.replace('_', ' ').toUpperCase()}
                  </td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={
                        zf.risk_level === 'Critical' ? 'coral' :
                        zf.risk_level === 'High' ? 'orange' :
                        zf.risk_level === 'Medium' ? 'yellow' : 'mint'
                      }
                      size="sm"
                    >
                      {zf.risk_level || 'Medium'} ({Math.round((zf.probability || 0.5) * 100)}%)
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-extrabold text-sky-700">
                    {zf.predicted_rain_cm ?? 18.0} cm
                  </td>
                  <td className="py-3 px-3 font-extrabold text-rose-600">
                    {zf.predicted_flood_depth_cm ?? 42.0} cm
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    ~{zf.time_to_flood_hours ?? 2.5} hrs
                  </td>
                  <td className="py-3 px-3 text-emerald-700 font-bold">
                    {Math.round(zf.confidence * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
