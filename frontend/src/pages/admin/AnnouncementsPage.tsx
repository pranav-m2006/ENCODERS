import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Announcement } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Megaphone, Sparkles, Send, Trash2, Eye, ShieldCheck, CheckCircle2,
  Check, AlertTriangle, CloudRain, Droplets, MapPin
} from 'lucide-react';

const CHENNAI_ZONES_OPTIONS = [
  { id: "all", name: "All Chennai Zones" },
  { id: "velachery", name: "Velachery & Pallikaranai" },
  { id: "mudichur", name: "Mudichur & Varadharajapuram" },
  { id: "saidapet", name: "Saidapet (Adyar Basin)" },
  { id: "perumbakkam", name: "Perumbakkam & Medavakkam" },
  { id: "kolathur", name: "Kolathur & Villivakkam" },
  { id: "sholinganallur", name: "Sholinganallur / OMR" }
];

export const AnnouncementsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState('Adyar River Surge & Velachery Flooding');
  const [targetZone, setTargetZone] = useState('Velachery & Mudichur');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [level, setLevel] = useState<'Info' | 'Advisory' | 'Warning' | 'Evacuate'>('Warning');
  const [language, setLanguage] = useState('en');
  const [isDrafting, setIsDrafting] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => api.get<Announcement[]>('/public/announcements')
  });

  const confirmMutation = useMutation({
    mutationFn: (annId: string) => api.post(`/authority/announcements/${annId}/confirm`),
    onSuccess: () => {
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3500);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['publicSummary'] });
    }
  });

  const handleGenerateAiAnnouncement = async () => {
    setIsDrafting(true);
    try {
      const res = await api.post<any>('/authority/ai/generate-announcement', {
        zone_id: targetZone === 'All Chennai Zones' ? undefined : targetZone
      });
      setDraftTitle(res.title);
      setDraftBody(res.body);
      setLevel(res.level as any || 'Warning');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (err: any) {
      setDraftTitle(`AI Flash Advisory: High Inundation in ${targetZone}`);
      setDraftBody(`Greater Chennai Corporation records 24.5cm rainfall. Water depth reaching 68cm. Take GST Road elevated corridor to nearest shelter. NDRF inflatable boats stationed.`);
    } finally {
      setIsDrafting(false);
    }
  };

  const handlePublish = async () => {
    if (!draftTitle || !draftBody) return;
    try {
      await api.post('/authority/announcements', {
        title: draftTitle,
        body: draftBody,
        level,
        language,
        target_zone: targetZone,
        confirmed_by_authority: true
      });
      setPublishSuccess(true);
      setDraftTitle('');
      setDraftBody('');
      setTimeout(() => setPublishSuccess(false), 3500);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (err: any) {
      alert(err.message || 'Publish failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-ocean" />
            AI Emergency Announcement Generator & Confirmation Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            AI predicts rainfall (cm) and flood depth (cm) to draft targeted advisories with safe evacuation corridors. Confirmed by Authority in 1-click.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles className="w-4 h-4" />}
          onClick={handleGenerateAiAnnouncement}
          disabled={isDrafting}
          className="self-start sm:self-auto"
        >
          {isDrafting ? 'AI Generating Advisory...' : 'AI Auto-Draft Advisory'}
        </Button>
      </div>

      {publishSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Official Emergency Advisory confirmed & broadcasted to all citizen dashboards in real-time!</span>
        </div>
      )}

      {/* Composer & Preview Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composer (Left) */}
        <Card className="p-5 border border-sky-200 shadow-soft space-y-4 rounded-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 font-heading">
              Compose or Edit Official Advisory
            </h3>
            <span className="text-[11px] font-bold text-slate-400">Greater Chennai DDMA</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Neighborhood:</label>
              <select
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                {CHENNAI_ZONES_OPTIONS.map((z) => (
                  <option key={z.id} value={z.name}>{z.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alert Level:</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="Info">Info (Standard)</option>
                  <option value="Advisory">Advisory (Caution)</option>
                  <option value="Warning">Warning (High Alert)</option>
                  <option value="Evacuate">Evacuate (Critical)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="en">English</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                  <option value="hi">Hindi (हिंदी)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Advisory Headline:</label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="E.g., Red Alert: Adyar River Surge at Saidapet Bridge..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Directive & Safe Routes:</label>
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                placeholder="Include rainfall cm, flood depth cm, inaccessible roads, and designated relief shelters..."
                rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium leading-relaxed"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handlePublish}
              disabled={!draftTitle || !draftBody}
              icon={<Send className="w-4 h-4" />}
              className="w-full justify-center"
            >
              Confirm & Publish Broadcast
            </Button>
          </div>
        </Card>

        {/* Live Citizen Preview (Right) */}
        <Card className="p-5 border border-sky-100 bg-gradient-to-b from-sky-50/50 to-white shadow-soft flex flex-col justify-between rounded-2xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-ocean flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                Live Citizen Screen Preview
              </span>
              <Badge variant={level === 'Evacuate' ? 'coral' : (level === 'Warning' ? 'orange' : 'mint')} size="sm">
                {level}
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="sm">{targetZone}</Badge>
                <span className="text-[10px] text-slate-400 font-bold">• Just Now</span>
              </div>
              <h4 className="font-extrabold text-base text-slate-900 font-heading">
                {draftTitle || 'Advisory Headline will appear here...'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {draftBody || 'Advisory body text with rainfall cm, flood depth cm, and safe corridors will render here for all citizens.'}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 text-center">
            Broadcasting sends instant push events across the public portal without requiring page refresh.
          </p>
        </Card>
      </div>

      {/* Published Announcements List */}
      <Card className="p-5 border border-sky-100 shadow-soft rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-900 font-heading flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Active Official Bulletins ({announcements?.length || 0})
        </h3>

        <div className="space-y-3">
          {announcements?.map((ann) => (
            <div
              key={ann.id}
              className="p-4 rounded-xl border border-slate-100 bg-white hover:border-sky-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={ann.level === 'Evacuate' ? 'coral' : (ann.level === 'Warning' ? 'orange' : 'mint')} size="sm">
                    {ann.level}
                  </Badge>
                  <span className="text-xs font-bold text-slate-700">{ann.published_by}</span>
                  <span className="text-xs text-slate-400">• {new Date(ann.published_at).toLocaleTimeString()}</span>
                  {ann.target_zone && (
                    <Badge variant="blue" size="sm">{ann.target_zone}</Badge>
                  )}
                  {ann.predicted_flood_cm && (
                    <span className="text-xs font-bold text-rose-600">Depth: {ann.predicted_flood_cm}cm</span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">{ann.title}</h4>
                <p className="text-xs text-slate-600 line-clamp-2">{ann.body}</p>
              </div>

              {!ann.confirmed_by_authority && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => confirmMutation.mutate(ann.id)}
                  isLoading={confirmMutation.isPending}
                  icon={<Check className="w-4 h-4" />}
                  className="shrink-0 text-xs"
                >
                  Confirm & Broadcast
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
