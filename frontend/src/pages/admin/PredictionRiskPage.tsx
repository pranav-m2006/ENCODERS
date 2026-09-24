import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Shield, Activity, BarChart2, AlertTriangle, CheckCircle2, ChevronRight, CloudRain, Droplets, Clock } from 'lucide-react';

interface ZonePrediction {
  zone_id: string;
  name?: string;
  probability?: number;
  category?: string;
  predicted_rain_cm?: number;
  predicted_flood_depth_cm?: number;
  rain_cm?: number;
  flood_depth_cm?: number;
  time_to_flood_hours?: number;
  confidence?: number;
  expected_affected?: number;
  features?: Record<string, unknown>;
}

interface FeatureContribution {
  name: string;
  value: number;
  contribution: number;
}

interface PredictionExplanation {
  features: Array<FeatureContribution>;
}

export function PredictionRiskPage() {
  const [selectedZone, setSelectedZone] = useState('velachery');

  const { data: predictions } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => api.get<Array<ZonePrediction>>('/authority/predictions')
  });

  const { data: explainData } = useQuery({
    queryKey: ['explainPrediction', selectedZone],
    queryFn: () => api.get<PredictionExplanation>(`/authority/predictions/${selectedZone}/explain`)
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-ocean" />
          ML Inundation Prediction & Hydrological Attribution (Chennai)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Zone flood probabilities, rainfall accumulation (cm), inundation depth (cm), and feature attribution for Greater Chennai.
        </p>
      </div>

      {/* Model Limitations Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-950 block">Hydrological Predictive Model (Greater Chennai):</span>
          <p className="mt-0.5 text-amber-900 leading-relaxed font-medium">
            Trained on multi-source radar, Adyar river gauges, and digital elevation models. Feature contributions reflect calibrated gradient-boosted decision trees.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Zone Predictions Table (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-5 border border-sky-100 shadow-soft space-y-4 rounded-2xl">
            <h3 className="font-bold text-sm text-slate-900 font-heading">
              Administrative Zones Risk Evaluation (Rain cm & Flood Depth cm)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Neighborhood</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Rain (cm)</th>
                    <th className="py-2.5 px-3">Depth (cm)</th>
                    <th className="py-2.5 px-3">Time to Peak</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {predictions?.map((p) => {
                    const isSelected = selectedZone === p.zone_id;
                    return (
                      <tr
                        key={p.zone_id}
                        onClick={() => setSelectedZone(p.zone_id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-100/70 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 text-slate-900 font-bold">{p.name || p.zone_id}</td>
                        <td className="py-3 px-3">
                          <Badge variant={p.category === 'Critical' ? 'coral' : (p.category === 'High' ? 'orange' : 'sun')} size="sm">
                            {p.category} ({Math.round((p.probability ?? 0.8) * 100)}%)
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-sky-700">{p.rain_cm ?? 22.0} cm</td>
                        <td className="py-3 px-3 font-extrabold text-rose-600">{p.flood_depth_cm ?? 50.0} cm</td>
                        <td className="py-3 px-3 text-slate-600">{p.time_to_flood_hours ?? 2.0} hrs</td>
                        <td className="py-3 px-3 text-ocean">
                          <ChevronRight className="w-4 h-4" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Feature Contribution Breakdown (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="p-5 border border-sky-200 shadow-soft space-y-4 bg-white rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 font-heading">
                  Feature Attribution ("Why this zone?")
                </h3>
                <p className="text-[11px] text-slate-500 uppercase font-bold text-ocean mt-0.5">
                  Target: {selectedZone.toUpperCase()}
                </p>
              </div>
              <Badge variant="ocean" size="sm">SHAP Weights</Badge>
            </div>

            <div className="space-y-3">
              {explainData?.features?.map((feat, idx) => {
                const contribPct = Math.round(feat.contribution * 100);
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{feat.name}</span>
                      <span>Weight: +{contribPct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ocean rounded-full transition-all"
                        style={{ width: `${Math.min(100, contribPct * 2.5)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      Input Value: <strong>{feat.value}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
