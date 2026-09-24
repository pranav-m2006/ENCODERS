import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Info } from 'lucide-react';

export const GlobalFooter: React.FC = () => {
  return (
    <footer className="w-full bg-zinc-950 border-t border-zinc-800 text-zinc-400 py-3 px-4 text-xs select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Verification Warning */}
        <div className="flex items-center gap-2 text-zinc-300 font-medium">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Decision support. Verify before acting.</span>
        </div>

        {/* Persistent DEMO DATA Watermark & Limitations Link */}
        <div className="flex items-center gap-4">
          <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 font-bold tracking-wider text-[10px]">
            DEMO DATA WATERMARK
          </span>

          <Link
            to="/app/settings"
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
          >
            <Info className="w-3.5 h-3.5 text-zinc-400" />
            <span>Operational Limitations</span>
          </Link>

          <span className="text-zinc-500">District: Baran River Basin</span>
        </div>
      </div>
    </footer>
  );
};
