import React from 'react';
import { AlertTriangle, ShieldCheck, Database, Radio, HardDrive, Cpu, Clock, HelpCircle } from 'lucide-react';

export interface LimitationItem {
  id: number;
  limitation: string;
  handling: string;
  layer: 'Both' | 'Backend + FE' | 'FE' | 'Backend';
  icon: React.ComponentType<{ className?: string }>;
}

const LIMITATIONS: LimitationItem[] = [
  {
    id: 1,
    limitation: 'No Internet → No new remote data',
    handling: 'Persistent connection banner, external adapters paused, every value shows its age and status (LIVE/STALE), edge-node LAN sync works over local Wi-Fi.',
    layer: 'Both',
    icon: AlertTriangle
  },
  {
    id: 2,
    limitation: 'No device at all in the field',
    handling: 'Printable emergency camp field sheet with physical ledger table; staff back-enters paper counts once reconnected with separate occurred_at and recorded_at.',
    layer: 'Both',
    icon: HardDrive
  },
  {
    id: 3,
    limitation: 'No communication channel → automatic redirection impossible',
    handling: 'UI never marks "redirected" until delivery is COMMUNICATED and then ACKNOWLEDGED. Deterministic HF/VHF radio script and loudspeaker script generated for every approved action.',
    layer: 'Both',
    icon: Radio
  },
  {
    id: 4,
    limitation: 'Satellite passes are periodic, not continuous',
    handling: 'Labelled as "latest pass" with pass timestamp. Automatically demoted to STALE after 24 hours with decaying confidence.',
    layer: 'Backend + FE',
    icon: Clock
  },
  {
    id: 5,
    limitation: 'GPS signals may be jammed or unavailable',
    handling: 'Manual gazetteer selector by village, school, or landmark as first-class input; tracks location_source = GPS / MANUAL_ZONE / LAST_KNOWN.',
    layer: 'Both',
    icon: HelpCircle
  },
  {
    id: 6,
    limitation: 'River & weather sensors stale or missing',
    handling: 'Per-source freshness thresholds; fallback to manual gauge reports; confidence score visibly reduced.',
    layer: 'Backend',
    icon: Database
  },
  {
    id: 7,
    limitation: 'Population counts are estimates',
    handling: 'Stored and displayed as range {min, likely, max}, labelled ESTIMATED; replaced only by confirmed camp arrivals.',
    layer: 'Both',
    icon: ShieldCheck
  },
  {
    id: 8,
    limitation: 'AI predictions can be inaccurate',
    handling: '100% transparent rule-based score equation with visible score breakdown; no black-box LLM in the control loop; auto-superseded when sensor inputs change.',
    layer: 'Backend',
    icon: Cpu
  },
  {
    id: 9,
    limitation: 'Critical decisions need human authorization',
    handling: 'No agent can execute a critical evacuation or dispatch autonomously. A FAIL constraint strictly blocks approval unless an ADMIN provides an audited written override.',
    layer: 'Both',
    icon: ShieldCheck
  },
  {
    id: 10,
    limitation: 'Concurrent offline sync conflicts',
    handling: 'Typed conflict queue (NEGATIVE_OCCUPANCY, DOUBLE_ARRIVAL, STOCKTAKE_MISMATCH, STALE_DECISION); side-by-side conflict resolution screen; nothing overwritten blindly.',
    layer: 'Both',
    icon: Database
  },
  {
    id: 11,
    limitation: 'Device clock wrong or drifted',
    handling: 'Hybrid Logical Clock (HLC) causal order; occurred_at and recorded_at separated; skew > 10 min flagged for review.',
    layer: 'Both',
    icon: Clock
  },
  {
    id: 12,
    limitation: 'Device power loss during disaster',
    handling: 'PWA low-power mode with reduced polling; minimal animations; power bank / UPS deployment requirement checklist.',
    layer: 'FE',
    icon: AlertTriangle
  },
  {
    id: 13,
    limitation: 'Browser IndexedDB storage evicted under storage pressure',
    handling: 'Requests navigator.storage.persist(); displays remaining storage quota; provides emergency "Export outbox to JSON file" backup.',
    layer: 'FE',
    icon: HardDrive
  },
  {
    id: 14,
    limitation: 'Background Sync API missing on iOS / Firefox',
    handling: 'Sync automatically triggers on network reconnect, tab focus, periodic timer with backoff, plus manual "Sync Now" button.',
    layer: 'FE',
    icon: Radio
  },
  {
    id: 15,
    limitation: 'navigator.onLine is notoriously unreliable',
    handling: 'Real end-to-end HTTP heartbeat check against /api/v1/health with timeout; never trusts navigator.onLine alone.',
    layer: 'FE',
    icon: AlertTriangle
  },
  {
    id: 16,
    limitation: 'Software prototype is not officially certified',
    handling: 'Persistent footer watermark: "Decision support. Verify before acting." and red DEMO DATA watermark on synthetic data.',
    layer: 'Both',
    icon: ShieldCheck
  }
];

export function LimitationsPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          Operational Limitations & Fail-Safes
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Honest disclosure of system boundaries and active mitigations implemented across the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LIMITATIONS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-zinc-400">#{item.id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {item.layer}
                  </span>
                </div>

                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-1.5">
                  {item.limitation}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.handling}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Mitigation verified</span>
                <span>Active in Contract v2</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
