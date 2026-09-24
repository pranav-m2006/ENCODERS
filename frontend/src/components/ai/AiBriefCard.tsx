import React, { useState } from 'react';
import type { PublicAiUpdate, AuthorityAiBrief } from '../../lib/types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Sparkles, Volume2, VolumeX, RefreshCw, Clock, CheckCircle2,
  AlertCircle, ShieldCheck, ArrowRight, Bot, Cpu
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AiBriefCardProps {
  variant: 'public' | 'authority';
  publicData?: PublicAiUpdate;
  authorityData?: AuthorityAiBrief;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const AiBriefCard: React.FC<AiBriefCardProps> = ({
  variant,
  publicData,
  authorityData,
  onRefresh,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const textToRead = variant === 'public'
      ? `${publicData?.headline}. ${publicData?.summary}. Recommendations: ${publicData?.what_to_do?.join('. ')}`
      : `${authorityData?.headline}. ${authorityData?.summary}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  if (variant === 'public' && publicData) {
    return (
      <Card className="relative overflow-hidden border-2 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-sky-100/30 p-6 shadow-soft-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-sky-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-ocean/10 text-ocean flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-heading text-slate-900">{t('aiUpdateTitle')}</h2>
                <Badge variant={publicData.source === 'llm' ? 'ocean' : 'slate'} size="sm">
                  {publicData.source === 'llm' ? <Bot className="w-3 h-3 inline mr-1" /> : <Cpu className="w-3 h-3 inline mr-1" />}
                  {publicData.source === 'llm' ? 'LLM Synthesized' : 'Rule Engine'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Updated {publicData.data_freshness_minutes || 2}m ago</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Grounded in official data
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={isPlayingAudio ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-ocean" />}
              onClick={handleSpeak}
            >
              {isPlayingAudio ? 'Stop' : t('listenAudio')}
            </Button>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
                onClick={onRefresh}
              >
                {t('refresh')}
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 font-heading leading-snug">
              {publicData.headline}
            </h3>
            <p className="text-slate-700 text-sm md:text-base mt-2 leading-relaxed font-normal">
              {publicData.summary}
            </p>
          </div>

          {/* What Changed */}
          {publicData.what_changed && publicData.what_changed.length > 0 && (
            <div className="bg-white/80 rounded-xl p-3.5 border border-sky-100 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t('whatChanged')}</h4>
              <ul className="space-y-1.5">
                {publicData.what_changed.map((item, idx) => (
                  <li key={idx} className="text-xs md:text-sm text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ocean mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What To Do Checklist */}
          {publicData.what_to_do && publicData.what_to_do.length > 0 && (
            <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-100 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {t('whatToDo')}
              </h4>
              <ul className="space-y-1.5">
                {publicData.what_to_do.map((item, idx) => (
                  <li key={idx} className="text-xs md:text-sm text-emerald-900 flex items-start gap-2 font-medium">
                    <span className="w-5 h-5 rounded-full bg-emerald-200/80 text-emerald-800 text-xs flex items-center justify-center shrink-0 font-bold">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nearest Open Camps Bar */}
          {publicData.nearest_camps && publicData.nearest_camps.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t('nearestCamps')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {publicData.nearest_camps.slice(0, 4).map((c) => (
                  <div key={c.camp_id} className="bg-white rounded-xl p-3 border border-sky-100 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{c.name}</p>
                      <p className="text-xs text-emerald-600 font-semibold">{c.available} beds free</p>
                    </div>
                    <Badge variant={c.status === 'open' ? 'mint' : 'sun'} size="sm">
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="pt-2 border-t border-sky-100 text-center">
            <p className="text-[11px] text-slate-600 italic">
              {publicData.disclaimer || "AI-generated from official district telemetry. Follow official announcements."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Authority Variant
  if (variant === 'authority' && authorityData) {
    return (
      <Card className="relative overflow-hidden border-2 border-sky-300 bg-gradient-to-br from-slate-900 via-deep to-sky-950 text-white p-6 shadow-soft-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-sky-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-ocean/20 text-aqua flex items-center justify-center border border-aqua/30">
              <Sparkles className="w-5 h-5 text-aqua animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-heading text-white">{authorityData.headline}</h2>
                <Badge variant="ocean" size="sm">Operational Brief</Badge>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">Continuous multi-agent situation analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={isPlayingAudio ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-deep" />}
              onClick={handleSpeak}
            >
              {isPlayingAudio ? 'Stop' : 'Read Brief'}
            </Button>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                className="text-white border-sky-400/40 hover:bg-white/10"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
                onClick={onRefresh}
              >
                Refresh
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-4 text-sky-100">
          <p className="text-sm md:text-base leading-relaxed text-sky-50">
            {authorityData.summary}
          </p>

          {/* Key Risks & Priorities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-sky-500/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Priority Risks
              </h4>
              <ul className="space-y-1.5">
                {authorityData.risks?.map((risk, idx) => (
                  <li key={idx} className="text-xs text-sky-100 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-sky-500/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-aqua mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Zone Action Priorities
              </h4>
              <ul className="space-y-1.5">
                {authorityData.priorities?.map((p, idx) => (
                  <li key={idx} className="text-xs text-sky-100 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-aqua mt-1.5 shrink-0" />
                    <span><strong className="text-white uppercase">{p.zone_id}:</strong> {p.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return null;
};
