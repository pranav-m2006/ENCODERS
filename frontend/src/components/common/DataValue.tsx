import React from 'react';
import { Activity, Clock, FileText, HelpCircle, AlertTriangle } from 'lucide-react';

export type DataStatus = 'LIVE' | 'STALE' | 'FIELD_REPORT' | 'ESTIMATED' | 'UNAVAILABLE';

interface DataValueProps {
  value: React.ReactNode;
  status?: DataStatus;
  asOf?: string;
  source?: string;
  confidence?: number;
  min?: number;
  max?: number;
  className?: string;
  unit?: string;
}

export const DataValue: React.FC<DataValueProps> = ({
  value,
  status = 'LIVE',
  asOf,
  source,
  confidence,
  min,
  max,
  className = '',
  unit = ''
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700">
            <Activity className="w-3 h-3 text-emerald-600 animate-pulse" />
            LIVE
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700">
            <Clock className="w-3 h-3 text-amber-600" />
            STALE
          </span>
        );
      case 'FIELD_REPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700">
            <FileText className="w-3 h-3 text-blue-600" />
            FIELD REPORT
          </span>
        );
      case 'ESTIMATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700">
            <HelpCircle className="w-3 h-3 text-purple-600" />
            ESTIMATED
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
            <AlertTriangle className="w-3 h-3 text-zinc-500" />
            UNAVAILABLE
          </span>
        );
    }
  };

  const formatAge = (iso?: string) => {
    if (!iso) return '';
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    return `${diffH}h ago`;
  };

  return (
    <div className={`inline-flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {value}
          {unit && <span className="text-sm font-normal text-zinc-500 ml-1">{unit}</span>}
          {min !== undefined && max !== undefined && (
            <span className="text-xs text-zinc-500 font-normal ml-1.5">
              ({min}–{max})
            </span>
          )}
        </span>
        {getStatusBadge()}
      </div>

      {(asOf || source) && (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {asOf && <span>As of {formatAge(asOf)}</span>}
          {asOf && source && <span>•</span>}
          {source && <span className="truncate max-w-[120px]">{source}</span>}
          {confidence !== undefined && (
            <>
              <span>•</span>
              <span>{Math.round(confidence * 100)}% conf</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
