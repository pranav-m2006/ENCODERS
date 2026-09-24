import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PublicCamp, AuthorityDashboard } from '../../lib/types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export const StateConsistencyBadge: React.FC = () => {
  const { data: camps } = useQuery<PublicCamp[]>({
    queryKey: ['camps'],
    queryFn: () => api.get<PublicCamp[]>('/public/camps')
  });

  const { data: dashboard } = useQuery<AuthorityDashboard>({
    queryKey: ['authorityDashboard'],
    queryFn: () => api.get<AuthorityDashboard>('/authority/dashboard'),
    retry: false
  });

  if (!camps) return null;

  // Calculate sum of occupancy from camp cards
  const sumFromCamps = camps.reduce((acc, c) => acc + (c.capacity - c.available), 0);
  const dashboardOccupancy = dashboard?.people_sheltered;

  const isConsistent = dashboardOccupancy === undefined || Math.abs(sumFromCamps - dashboardOccupancy) <= 100;

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md transition-all border select-none opacity-90 hover:opacity-100 bg-white/95 text-slate-700 border-slate-200">
      {isConsistent ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-emerald-700">State Synced ({sumFromCamps} sheltered)</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
          <span className="text-rose-700 font-bold">State Mismatch: Camps({sumFromCamps}) vs Dash({dashboardOccupancy})</span>
        </>
      )}
    </div>
  );
};
