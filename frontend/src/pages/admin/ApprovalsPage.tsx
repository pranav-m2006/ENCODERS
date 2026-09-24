import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Approval } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CheckSquare, Check, X, Edit3, ShieldAlert, History, Clock } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const { data: approvals } = useQuery<Approval[]>({
    queryKey: ['approvals'],
    queryFn: () => api.get<Approval[]>('/authority/approvals')
  });

  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    try {
      await api.post(`/authority/approvals/${id}/decision`, {
        decision,
        note: `Decided by District Collector in Approvals Manager`
      });
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const pendingList = approvals?.filter(a => a.status === 'pending') || [];
  const historyList = approvals?.filter(a => a.status !== 'pending') || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-ocean" />
            AI Recommendation & Action Authorizations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Human-in-the-loop review queue for autonomous multi-agent proposals (boat dispatches, camp re-routes, emergency supplies)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('pending')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'pending' ? 'bg-white text-ocean shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingList.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit History ({historyList.length})
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div className="space-y-4">
          {pendingList.length > 0 ? (
            pendingList.map((app) => (
              <Card key={app.id} className="p-5 border border-sky-200 shadow-soft space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Badge variant="sun" size="sm">{app.type.replace('_', ' ').toUpperCase()}</Badge>
                    <span className="text-xs font-bold text-slate-500">Confidence: {Math.round(app.confidence * 100)}%</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">ID: {app.id}</span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-base text-slate-900 leading-snug">{app.reason}</h3>
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-950 font-medium">
                    <strong className="text-ocean block mb-0.5">Automated Optimization Rationale:</strong>
                    Continuous scoring algorithm identified capacity bottleneck or urgent rescue demand.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-rose-50 hover:text-rose-700"
                    icon={<X className="w-4 h-4 text-rose-600" />}
                    onClick={() => handleDecision(app.id, 'reject')}
                  >
                    Reject Proposal
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Check className="w-4 h-4" />}
                    onClick={() => handleDecision(app.id, 'approve')}
                  >
                    Authorize & Apply State
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center border border-slate-200 text-slate-500 text-xs">
              No pending proposals awaiting decision. All agent recommendations authorized.
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {historyList.map((app) => (
            <Card key={app.id} className="p-4 border border-slate-200 shadow-sm flex items-center justify-between text-xs">
              <div className="space-y-0.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 uppercase">{app.type}</span>
                  <Badge variant={app.status === 'approved' ? 'mint' : 'coral'} size="sm">
                    {app.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-slate-600 truncate">{app.reason}</p>
                <p className="text-[10px] text-slate-400">Decided by: {app.decided_by || 'District Collector'}</p>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">
                {new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
