import React from 'react';
import { LoopStage } from '../../lib/types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Eye, Activity, MapPin, Play, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface AgentLoopTimelineProps {
  loopData?: LoopStage;
  simplified?: boolean;
}

const STAGES = [
  { id: 'OBSERVE', label: '1. Observe', icon: Eye },
  { id: 'ANALYZE', label: '2. Analyze', icon: Activity },
  { id: 'PLAN', label: '3. Plan', icon: MapPin },
  { id: 'ACT', label: '4. Act', icon: Play },
  { id: 'MONITOR', label: '5. Monitor', icon: CheckCircle2 },
  { id: 'RE-PLAN', label: '6. Re-plan', icon: RotateCcw }
];

export const AgentLoopTimeline: React.FC<AgentLoopTimelineProps> = ({
  loopData,
  simplified = false
}) => {
  const currentStage = loopData?.stage || 'MONITOR';
  const currentMsg = loopData?.message || 'System is checking: rainfall, river gauges, Sentinel-1 satellite water extent';

  if (simplified) {
    return (
      <div className="bg-sky-50/80 rounded-2xl p-4 border border-sky-100 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div>
            <p className="text-xs font-bold text-deep uppercase tracking-wider">Multi-Agent Continuous Loop</p>
            <p className="text-xs text-slate-700 mt-0.5">{currentMsg}</p>
          </div>
        </div>
        <Badge variant="mint" size="sm" dot>Active</Badge>
      </div>
    );
  }

  return (
    <Card className="border border-sky-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-ocean animate-ping" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
            Autonomous Coordinator Closed-Loop
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Cycle: <strong className="text-slate-800">{loopData?.cycle_id || 'cycle_live_01'}</strong></span>
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STAGES.map((s) => {
          const Icon = s.icon;
          const isActive = currentStage === s.id;
          return (
            <div
              key={s.id}
              className={clsx(
                'flex flex-col items-center p-3 rounded-xl border transition-all text-center relative overflow-hidden',
                isActive
                  ? 'bg-sky-500 text-white border-sky-600 shadow-md scale-[1.02]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/80'
              )}
            >
              <Icon className={clsx('w-5 h-5 mb-1.5', isActive ? 'text-white' : 'text-slate-400')} />
              <span className="text-xs font-bold font-heading">{s.label}</span>
              {isActive && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* Active Message Callout */}
      <div className="mt-3.5 p-3 rounded-xl bg-sky-50 border border-sky-100 flex items-center gap-2 text-xs font-medium text-sky-900">
        <span className="font-bold text-ocean">Stage Output:</span>
        <span className="truncate">{currentMsg}</span>
      </div>

      {/* Recent Agent Events Log */}
      {loopData?.recent_events && loopData.recent_events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Recent Agent Actions</h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {loopData.recent_events.map((evt, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/60">
                <div className="flex items-center gap-2 truncate">
                  <Badge variant="ocean" size="sm">{evt.agent}</Badge>
                  <span className="text-slate-700 truncate">{evt.summary}</span>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 ml-2">{evt.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
