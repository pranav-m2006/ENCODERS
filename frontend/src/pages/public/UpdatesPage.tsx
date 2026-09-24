import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Announcement } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Bell, ShieldCheck, Sparkles, Filter, Clock, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const UpdatesPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => api.get<Announcement[]>('/public/announcements')
  });

  const filteredAnnouncements = announcements?.filter(
    (a) => selectedLevel === 'all' || a.level === selectedLevel
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-ocean" />
            District Flood Bulletins & Alerts
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Realtime chronological feed combining official administration broadcasts and multi-agent updates
          </p>
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['all', 'Warning', 'Advisory', 'Info', 'Evacuate'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all border cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-ocean text-white border-ocean shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {filteredAnnouncements?.map((item, index) => {
          const isWarning = item.level === 'Warning' || item.level === 'Evacuate';
          return (
            <Card
              key={item.id}
              className={`border-l-4 p-5 shadow-soft transition-all bg-white ${
                isWarning ? 'border-l-rose-500' : 'border-l-ocean'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Badge variant={isWarning ? 'coral' : 'ocean'} size="sm">
                    {item.level.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official Verified Broadcast
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(item.published_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <h3 className="font-extrabold text-lg text-slate-900 font-heading">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                  {item.body}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Authority: <strong className="text-slate-700">{item.published_by}</strong></span>
                <span className="uppercase text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Lang: {item.language}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
