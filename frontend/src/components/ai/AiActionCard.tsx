import React from 'react';
import { RecommendedAction } from '../../lib/types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Check, X, Edit3, ShieldAlert, Navigation } from 'lucide-react';

interface AiActionCardProps {
  action: RecommendedAction;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onModify?: (id: string) => void;
  isProcessing?: boolean;
}

export const AiActionCard: React.FC<AiActionCardProps> = ({
  action,
  onApprove,
  onReject,
  onModify,
  isProcessing = false
}) => {
  return (
    <Card className="border border-sky-100 hover:border-ocean/40 transition-all p-4 bg-white shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Badge variant={action.type === 'camp_redirect' ? 'sun' : 'ocean'} size="sm">
            {action.type === 'camp_redirect' ? <Navigation className="w-3 h-3 inline mr-1" /> : <ShieldAlert className="w-3 h-3 inline mr-1" />}
            {action.type.replace('_', ' ').toUpperCase()}
          </Badge>
          <span className="text-xs text-slate-500 font-medium">Confidence: {Math.round(action.confidence * 100)}%</span>
        </div>
      </div>

      <div className="py-3">
        <p className="text-sm font-bold text-slate-900 leading-snug">{action.text}</p>
        <p className="text-xs text-slate-500 mt-1 italic">Reason: {action.reason}</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
        {onModify && (
          <Button
            variant="outline"
            size="sm"
            icon={<Edit3 className="w-3.5 h-3.5 text-slate-600" />}
            onClick={() => onModify(action.approval_id)}
            disabled={isProcessing}
          >
            Modify
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
          icon={<X className="w-3.5 h-3.5 text-rose-600" />}
          onClick={() => onReject(action.approval_id)}
          disabled={isProcessing}
        >
          Reject
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<Check className="w-3.5 h-3.5" />}
          onClick={() => onApprove(action.approval_id)}
          disabled={isProcessing}
        >
          Approve Proposal
        </Button>
      </div>
    </Card>
  );
};
