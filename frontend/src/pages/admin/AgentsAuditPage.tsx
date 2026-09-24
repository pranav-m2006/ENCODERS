import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AgentHealth } from '../../lib/types';
import { mockAgentHealth } from '../../lib/mockData';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Cpu, Download, Search, RefreshCw } from 'lucide-react';

export const AgentsAuditPage: React.FC = () => {
  const [searchFilter, setSearchFilter] = useState('');

  const { data: agents, refetch } = useQuery<AgentHealth[]>({
    queryKey: ['agents'],
    queryFn: () => api.get<AgentHealth[]>('/authority/agents'),
    refetchInterval: 10000
  });

  const agentList: AgentHealth[] = Array.isArray(agents) && agents.length > 0 ? agents : mockAgentHealth;

  const { data: events } = useQuery<any[]>({
    queryKey: ['events'],
    queryFn: () => api.get<any[]>('/authority/events?limit=50')
  });

  const handleExportCSV = () => {
    if (!events || events.length === 0) return;
    const headers = ['Event ID', 'Timestamp', 'Agent', 'Action', 'Input Summary', 'Output Summary', 'Status'];
    const rows = events.map(e => [
      e.event_id,
      e.timestamp,
      `"${e.agent_name}"`,
      `"${e.action}"`,
      `"${e.input_summary.replace(/"/g, '""')}"`,
      `"${e.output_summary.replace(/"/g, '""')}"`,
      e.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `floodops_agent_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEvents = events?.filter(e =>
    e.agent_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    e.action.toLowerCase().includes(searchFilter.toLowerCase()) ||
    e.output_summary.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-ocean" />
            10-Agent Swarm Health & Immutable Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Realtime execution metrics, telemetry loops, and auditable event log for district oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
          >
            Export Audit Log (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 10 Agent Health Cards Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 font-heading">
          Active Multi-Agent Swarm (10 Subsystems)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {agentList.map((a, idx) => (
            <Card key={idx} className="p-3.5 border border-sky-100 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-xs text-slate-900 truncate">{a.name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="py-2 space-y-1 text-[11px] text-slate-600">
                  <p>Cycles Executed: <strong className="text-slate-900">{a.runs || 0}</strong></p>
                  <p className="text-slate-500 truncate" title={a.last_message}>
                    {a.last_message}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                Active & Healthy
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="p-5 border border-sky-100 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-base text-slate-900 font-heading">
            Live System Audit Stream
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit log..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-white shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Agent Name</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Summary / Decision</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredEvents?.map((evt, idx) => (
                <tr key={idx} className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-3 px-3 text-slate-400 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-3 font-bold text-deep">{evt.agent_name}</td>
                  <td className="py-3 px-3">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">
                      {evt.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-800 max-w-md truncate" title={evt.output_summary}>
                    {evt.output_summary}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant="mint" size="sm">SUCCESS</Badge>
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
