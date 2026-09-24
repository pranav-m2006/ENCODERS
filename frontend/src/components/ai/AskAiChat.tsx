import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Send, Bot, User, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  usedFacts?: string[];
  time: string;
}

const SUGGESTIONS = [
  "Is my area safe?",
  "Which camp has space?",
  "What should I pack?",
  "Where is the nearest boat pickup?"
];

export const AskAiChat: React.FC = () => {
  const { language, user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'assistant',
      text: "Hello! I am the FloodOps AI Assistant. I can answer questions about camp availability, river levels, safety checklists, and evacuation staging in Alappuzha. How can I help you today?",
      usedFacts: ["District Emergency Camp Registry", "Live River Gauge Feeds"],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);

    try {
      const endpoint = user?.role === 'authority' ? '/authority/assistant' : '/public/assistant';
      const res = await api.post<{ answer: string; used_facts: string[] }>(endpoint, {
        question: textToSend,
        lang: language
      });

      const assistantMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        usedFacts: res.used_facts,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: "I am having trouble reaching the operational server. In an emergency, please call 112 immediately or check official broadcasts.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[650px] max-h-[85vh] p-0 overflow-hidden border border-sky-200 shadow-soft-lg">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-sky-500 to-ocean text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base font-heading leading-none">FloodOps AI Assistant</h3>
            <p className="text-xs text-sky-100 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Grounded in district verified data
            </p>
          </div>
        </div>
        <Badge variant="mint" size="sm" dot>Live Assistant</Badge>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-ocean/10 text-ocean flex items-center justify-center shrink-0 mt-0.5 border border-ocean/20">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm ${
              m.sender === 'user'
                ? 'bg-ocean text-white rounded-tr-none'
                : 'bg-white text-slate-800 border border-sky-100 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

              {m.usedFacts && m.usedFacts.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Based on: </span>
                  {m.usedFacts.join(' • ')}
                </div>
              )}

              <span className={`block text-[10px] mt-1 text-right ${
                m.sender === 'user' ? 'text-sky-100' : 'text-slate-400'
              }`}>
                {m.time}
              </span>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-deep text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-ocean/10 text-ocean flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-sky-100 rounded-2xl rounded-tl-none p-3 shadow-sm text-xs text-slate-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-ocean animate-bounce" />
              <span className="inline-block w-2 h-2 rounded-full bg-ocean animate-bounce [animation-delay:0.2s]" />
              <span className="inline-block w-2 h-2 rounded-full bg-ocean animate-bounce [animation-delay:0.4s]" />
              Consulting hydrological data...
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            className="text-xs px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-full border border-sky-200 shrink-0 transition-colors cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-white border-t border-sky-100 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about relief camps, road access, weather, or emergency tips..."
          className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ocean/40"
        />
        <Button
          variant="primary"
          size="md"
          icon={<Send className="w-4 h-4" />}
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
        >
          Send
        </Button>
      </div>
    </Card>
  );
};
