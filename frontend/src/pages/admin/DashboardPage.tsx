import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AuthorityDashboard, AuthorityAiBrief, LoopStage, Approval } from '../../lib/types';
import { AiBriefCard } from '../../components/ai/AiBriefCard';
import { AiActionCard } from '../../components/ai/AiActionCard';
import { AgentLoopTimeline } from '../../components/ai/AgentLoopTimeline';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Users, Waves, Ship, Tent, RotateCcw, AlertTriangle, ShieldCheck,
  TrendingUp, CheckCircle2, ArrowUpRight, Activity, Bell, ShieldAlert,
  Droplets, CloudRain, Compass, Navigation
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: dashboard } = useQuery<AuthorityDashboard>({
    queryKey: ['authorityDashboard'],
    queryFn: () => api.get<AuthorityDashboard>('/authority/dashboard'),
    refetchInterval: 10000
  });

  const { data: aiBrief, refetch: refetchBrief, isFetching: isBriefFetching } = useQuery<AuthorityAiBrief>({
    queryKey: ['aiBrief'],
    queryFn: () => api.get<AuthorityAiBrief>('/authority/ai-brief')
  });

  const { data: loopStage } = useQuery<LoopStage>({
    queryKey: ['loop'],
    queryFn: () => api.get<LoopStage>('/authority/loop'),
    refetchInterval: 15000
  });

  const { data: approvals } = useQuery<Approval[]>({
    queryKey: ['approvals'],
    queryFn: () => api.get<Approval[]>('/authority/approvals')
  });

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/authority/approvals/${id}/decision`, {
        decision: 'approve',
        note: 'Approved from Command Dashboard'
      });
      queryClient.invalidateQueries();
    } catch (err) {
      console.warn('Approval failed:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/authority/approvals/${id}/decision`, {
        decision: 'reject',
        note: 'Rejected from Command Dashboard'
      });
      queryClient.invalidateQueries();
    } catch (err) {
      console.warn('Rejection failed:', err);
    }
  };

  const pendingApprovals = approvals?.filter(a => a.status === 'pending') || [];

  return (
    <div className="space-y-6">
      {/* 1. Visible Autonomous Agent Loop */}
      <AgentLoopTimeline loopData={loopStage} />

      {/* 2. AI Operational Brief Card */}
      <AiBriefCard
        variant="authority"
        authorityData={aiBrief}
        onRefresh={() => {
          refetchBrief();
          queryClient.invalidateQueries({ queryKey: ['authorityDashboard'] });
        }}
        isLoading={isBriefFetching}
      />

      {/* 3. Pending AI Recommended Actions Section */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-heading">
              <ShieldAlert className="w-4 h-4 text-ocean" />
              Pending AI Automated Authorizations ({pendingApprovals.length})
            </h3>
            <NavLink to="/admin/approvals" className="text-xs font-bold text-ocean hover:underline">
              View full approval queue →
            </NavLink>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.slice(0, 2).map((app) => (
              <AiActionCard
                key={app.id}
                action={{
                  approval_id: app.id,
                  type: app.type,
                  text: app.reason,
                  reason: `Automated by ${app.type.replace('_', ' ').toUpperCase()} Agent`,
                  confidence: app.confidence
                }}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. High-Level Understandable KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* KPI 1: Sheltered */}
        <Card className="p-3.5 border-sky-100 shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sheltered</span>
          <p className="text-2xl font-black font-heading text-slate-900 mt-1">
            {dashboard?.people_sheltered?.toLocaleString() ?? '6,250'}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold">In 6 Centers</span>
        </Card>

        {/* KPI 2: Flooded Area */}
        <Card className="p-3.5 border-sky-100 shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flooded km²</span>
          <p className="text-2xl font-black font-heading text-slate-900 mt-1">{dashboard?.flooded_km2 ?? 48.5}</p>
          <span className="text-[10px] text-rose-600 font-bold">Chennai Basin</span>
        </Card>

        {/* KPI 3: Active Boats & Air Units */}
        <Card className="p-3.5 border-sky-100 shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rescue Units</span>
          <p className="text-2xl font-black font-heading text-slate-900 mt-1">{dashboard?.active_units ?? 6}</p>
          <span className="text-[10px] text-emerald-600 font-bold">NDRF/SDRF/CoastGuard</span>
        </Card>

        {/* KPI 4: Camps Active */}
        <Card className="p-3.5 border-sky-100 shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Camps</span>
          <p className="text-2xl font-black font-heading text-slate-900 mt-1">
            {dashboard?.camps_open ?? 6}/{dashboard?.camps_total ?? 6}
          </p>
          <span className="text-[10px] text-ocean font-bold">14,300 Total Cap</span>
        </Card>

        {/* KPI 5: Vulnerable Pop */}
        <Card className="p-3.5 border-sky-100 shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Awaiting Evac</span>
          <p className="text-2xl font-black font-heading text-slate-900 mt-1">
            {dashboard?.unserved?.toLocaleString() ?? '3,650'}
          </p>
          <span className="text-[10px] text-amber-600 font-bold">Velachery/Mudichur</span>
        </Card>

        {/* KPI 6: Near Capacity Warnings */}
        <Card className="p-3.5 border-sky-100 shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Near Capacity</span>
          <p className="text-2xl font-black font-heading text-slate-900 mt-1">
            {dashboard?.over_capacity_events ?? 2}
          </p>
          <span className="text-[10px] text-rose-500 font-bold">Divert Queued</span>
        </Card>

        {/* KPI 7: AI Re-plans */}
        <Card className="p-3.5 border-sky-100 shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Cycles</span>
          <p className="text-2xl font-black font-heading text-slate-900 mt-1">
            {dashboard?.replans ?? 14}
          </p>
          <span className="text-[10px] text-purple-600 font-bold">Closed Loop</span>
        </Card>

        {/* KPI 8: Adyar Gauge */}
        <Card className="p-3.5 border-sky-100 shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adyar River</span>
          <p className="text-2xl font-black font-heading text-slate-900 mt-1">4.65m</p>
          <span className="text-[10px] text-rose-600 font-bold">Alert: 4.80m</span>
        </Card>
      </div>

      {/* 5. Quick Command Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <NavLink
          to="/admin/camps/live"
          className="p-4 rounded-2xl bg-white border border-sky-200 hover:border-ocean transition-all shadow-soft group flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-ocean uppercase tracking-wider block">Live Topology</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">Camp Live Board & Diversions</p>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-ocean transition-transform group-hover:translate-x-1" />
        </NavLink>

        <NavLink
          to="/admin/map"
          className="p-4 rounded-2xl bg-white border border-sky-200 hover:border-ocean transition-all shadow-soft group flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-ocean uppercase tracking-wider block">Inundation GIS</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">Situation Map & Flooded Roads</p>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-ocean transition-transform group-hover:translate-x-1" />
        </NavLink>

        <NavLink
          to="/admin/announcements"
          className="p-4 rounded-2xl bg-white border border-sky-200 hover:border-ocean transition-all shadow-soft group flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-ocean uppercase tracking-wider block">AI Broadcasts</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">Generate & Confirm Advisories</p>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-ocean transition-transform group-hover:translate-x-1" />
        </NavLink>
      </div>
    </div>
  );
};
