import React, { useState } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Radio, Printer, Copy,
  Send, Check, Clock, ChevronDown, ChevronUp, Lock
} from 'lucide-react';

export interface RecommendationProposal {
  group_id?: string;
  allocations?: Array<{ camp_id: string; count: number }>;
  avoid_road?: string;
  alternate_route?: string;
}

export interface RecommendationItem {
  id: string;
  kind: string;
  decision_status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'EXPIRED';
  delivery_status: 'NOT_SENT' | 'COMMUNICATED' | 'ACKNOWLEDGED' | 'CONFIRMED';
  proposal: RecommendationProposal;
  explanation: {
    summary: string;
    score_breakdown?: Array<{ factor: string; impact: string }>;
  };
  inputs?: Array<{ name: string; status: string; as_of: string }>;
  constraints?: Array<{ name: string; result: 'PASS' | 'WARN' | 'FAIL'; reason?: string }>;
  overall: 'PASS' | 'WARN' | 'FAIL';
  valid_until?: string;
  snapshot_hash?: string;
  radio_script?: string;
}

interface RecommendationCardProps {
  rec: RecommendationItem;
  userRole?: string;
  onDecide?: (recId: string, decision: 'APPROVED' | 'REJECTED', overrideReason?: string) => Promise<void>;
  onCommunicate?: (recId: string, channel: string, status: 'COMMUNICATED' | 'ACKNOWLEDGED' | 'CONFIRMED') => Promise<void>;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  rec,
  userRole = 'ADMIN',
  onDecide,
  onCommunicate
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [showOverrideInput, setShowOverrideInput] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isFailedConstraint = rec.overall === 'FAIL';
  const isAdmin = userRole.toUpperCase() === 'ADMIN';
  const canApproveDirectly = !isFailedConstraint || (isAdmin && overrideReason.trim().length > 5);

  const handleCopyScript = () => {
    if (rec.radio_script) {
      navigator.clipboard.writeText(rec.radio_script);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const handleApprove = async () => {
    if (isFailedConstraint && (!isAdmin || !overrideReason.trim())) {
      setShowOverrideInput(true);
      return;
    }
    setIsSubmitting(true);
    if (onDecide) {
      await onDecide(rec.id, 'APPROVED', overrideReason.trim() || undefined);
    }
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    if (onDecide) {
      await onDecide(rec.id, 'REJECTED');
    }
    setIsSubmitting(false);
  };

  const advanceDelivery = async (nextStep: 'COMMUNICATED' | 'ACKNOWLEDGED' | 'CONFIRMED') => {
    if (onCommunicate) {
      await onCommunicate(rec.id, 'RADIO', nextStep);
    }
  };

  return (
    <div className={`p-4 sm:p-5 rounded-xl border shadow-sm transition-all ${
      rec.decision_status === 'SUPERSEDED'
        ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 opacity-75'
        : rec.overall === 'FAIL'
        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
    }`}>
      {/* Top Header: Badge, Kind & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-zinc-500">{rec.id}</span>
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
            {rec.kind.replace('_', ' ')}
          </span>
          {rec.decision_status === 'SUPERSEDED' && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
              SUPERSEDED (Data Changed)
            </span>
          )}
        </div>

        {/* Constraint Result Chip */}
        <div className="flex items-center gap-1.5">
          {rec.overall === 'PASS' && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" /> Safety Check: PASS
            </span>
          )}
          {rec.overall === 'WARN' && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Safety Check: WARN
            </span>
          )}
          {rec.overall === 'FAIL' && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              <XCircle className="w-3.5 h-3.5" /> Safety Check: FAIL (Blocks Action)
            </span>
          )}
        </div>
      </div>

      {/* Main Proposal Summary */}
      <div className="my-2">
        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {rec.explanation?.summary || 'Proposed optimization'}
        </h4>

        {/* Specific Allocation Badges */}
        {rec.proposal?.allocations && (
          <div className="flex flex-wrap gap-2 mt-2">
            {rec.proposal.allocations.map((alloc, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                {alloc.count} evacuees → Camp {alloc.camp_id}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Explanations & Constraints */}
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showDetails ? 'Hide' : 'Show'} Rule Transparency & Constraints Breakdown</span>
        </button>

        {showDetails && (
          <div className="mt-2.5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {rec.explanation?.score_breakdown && (
              <div>
                <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">Score Breakdown:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {rec.explanation.score_breakdown.map((sb, i) => (
                    <li key={i}>
                      <span className="font-semibold">{sb.factor}:</span> {sb.impact}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {rec.constraints && (
              <div className="mt-2">
                <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">Evaluated Safety Constraints:</p>
                <div className="space-y-1">
                  {rec.constraints.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>{c.name.replace(/_/g, ' ')}</span>
                      <span className={`font-bold ${
                        c.result === 'PASS' ? 'text-emerald-600' : c.result === 'WARN' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {c.result} {c.reason ? `(${c.reason})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision Buttons & Override Area */}
      {rec.decision_status === 'PROPOSED' && (
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          {showOverrideInput && isFailedConstraint && (
            <div className="w-full p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Override Required to Approve Failed Safety Constraint</span>
              </div>
              <input
                type="text"
                placeholder="Enter formal justification for override (audited)..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-rose-300 dark:border-rose-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleApprove}
              disabled={isSubmitting || (isFailedConstraint && (!isAdmin || overrideReason.trim().length <= 5))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                canApproveDirectly
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
                  : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              Approve Action
            </button>

            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Reject
            </button>
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Expires in 30 min</span>
          </div>
        </div>
      )}

      {/* Approved State: Physical Channel Delivery Tracking */}
      {rec.decision_status === 'APPROVED' && (
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Action Approved by Authority
            </span>

            {/* Radio Script & Print Buttons */}
            <div className="flex items-center gap-2">
              {rec.radio_script && (
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedScript ? 'Copied Script!' : 'Copy Radio Script'}</span>
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sheet</span>
              </button>
            </div>
          </div>

          {/* Delivery Tracker Stepper */}
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Delivery / Dispatch Channel Tracking:
            </p>

            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              <div className={`p-1.5 rounded ${rec.delivery_status ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold' : ''}`}>
                1. NOT SENT
              </div>
              <div className={`p-1.5 rounded ${['COMMUNICATED', 'ACKNOWLEDGED', 'CONFIRMED'].includes(rec.delivery_status) ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold' : 'text-zinc-400'}`}>
                2. COMMUNICATED
              </div>
              <div className={`p-1.5 rounded ${['ACKNOWLEDGED', 'CONFIRMED'].includes(rec.delivery_status) ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold' : 'text-zinc-400'}`}>
                3. ACKNOWLEDGED
              </div>
              <div className={`p-1.5 rounded ${rec.delivery_status === 'CONFIRMED' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold' : 'text-zinc-400'}`}>
                4. CONFIRMED
              </div>
            </div>

            {/* Stepper advancement action buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {rec.delivery_status === 'NOT_SENT' && (
                <button
                  onClick={() => advanceDelivery('COMMUNICATED')}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Mark Radio Broadcast Sent
                </button>
              )}
              {rec.delivery_status === 'COMMUNICATED' && (
                <button
                  onClick={() => advanceDelivery('ACKNOWLEDGED')}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Confirm Camp / Field ACK
                </button>
              )}
              {rec.delivery_status === 'ACKNOWLEDGED' && (
                <button
                  onClick={() => advanceDelivery('CONFIRMED')}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Confirm Evacuees Arrived
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
