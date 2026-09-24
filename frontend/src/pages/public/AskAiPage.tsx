import React from 'react';
import { AskAiChat } from '../../components/ai/AskAiChat';

export const AskAiPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="p-4 bg-white rounded-2xl border border-sky-100 shadow-soft">
        <h2 className="text-xl font-extrabold font-heading text-slate-900">
          Citizen Flood Advisory Assistant
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Ask questions in English, Tamil, Malayalam, or Hindi. Verified by district relief camp telemetry and official advisories.
        </p>
      </div>

      <AskAiChat />
    </div>
  );
};
