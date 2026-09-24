import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldAlert, CheckSquare, PhoneCall, Printer, LifeBuoy,
  FileText, Heart, AlertTriangle, CheckCircle2
} from 'lucide-react';

export const SafetyPage: React.FC = () => {
  const [checklist, setChecklist] = useState([
    { id: 1, text: "Government ID, Aadhaar, Land Deeds & Ration Card in waterproof sleeve", checked: true },
    { id: 2, text: "3-day supply of essential prescription medicines & basic first aid", checked: true },
    { id: 3, text: "High-power LED flashlight with extra dry batteries & power banks", checked: false },
    { id: 4, text: "Clean bottled drinking water (min. 3 liters per person per day)", checked: false },
    { id: 5, text: "Sturdy waterproof boots and dry change of warm clothing", checked: false },
    { id: 6, text: "Emergency cash in small denominations", checked: true },
    { id: 7, text: "Infant food and elderly care supplies if applicable", checked: false }
  ]);

  const toggleCheck = (id: number) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-coral" />
            Safety, Evacuation & Helplines
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official Kerala State Disaster Management Authority (KSDMA) safety guidelines & printable emergency card
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<Printer className="w-4 h-4" />}
          onClick={handlePrint}
        >
          Print Emergency Card
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Printable Emergency Card (1 col) */}
        <Card className="lg:col-span-1 p-6 border-2 border-ocean bg-gradient-to-br from-white to-sky-50 shadow-soft-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-sky-200">
              <span className="font-extrabold text-sm tracking-tight uppercase font-heading text-deep">
                FloodOps Emergency Card
              </span>
              <Badge variant="coral" size="sm">Emergency</Badge>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
              <PhoneCall className="w-8 h-8 text-rose-600 mx-auto animate-bounce mb-1" />
              <p className="text-xs font-bold uppercase text-rose-800 tracking-wider">Primary Emergency Helpline</p>
              <p className="text-3xl font-black text-rose-600 font-heading tracking-widest mt-1">112</p>
              <p className="text-[11px] text-rose-700 mt-1">24/7 Police, Fire, Ambulance & Rescue</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2 rounded-xl bg-white border border-slate-100">
                <span className="font-bold text-slate-700">District Collectorate:</span>
                <span className="font-semibold text-ocean">0477-2238630</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-white border border-slate-100">
                <span className="font-bold text-slate-700">Kuttanad Taluk Office:</span>
                <span className="font-semibold text-ocean">0477-2702221</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-white border border-slate-100">
                <span className="font-bold text-slate-700">NDRF Control Cell:</span>
                <span className="font-semibold text-ocean">1077 (Toll Free)</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-6 pt-3 border-t border-slate-200">
            Keep this card accessible during monsoons. Distributed by Alappuzha DDMA.
          </p>
        </Card>

        {/* Interactive Preparedness Checklist (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 border border-sky-100 shadow-soft">
            <h3 className="font-bold text-base text-slate-900 font-heading mb-3 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-ocean" />
              Pre-Evacuation Packing Checklist
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Check off items as you pack your waterproof go-bag before moving to your designated relief camp:
            </p>

            <div className="space-y-2.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    item.checked
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                    item.checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {item.checked && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className="text-xs md:text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Evacuation Rules Card */}
          <Card className="p-5 border border-sky-100 shadow-soft bg-sky-50/40">
            <h3 className="font-bold text-base text-slate-900 font-heading mb-3 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-ocean" />
              Critical Evacuation Instructions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 font-medium">
              <div className="p-3 bg-white rounded-xl border border-sky-100">
                <strong className="text-slate-900 block mb-1">1. Turn off Utilities</strong>
                Switch off the main electrical breaker and shut gas cylinder valves before leaving home.
              </div>
              <div className="p-3 bg-white rounded-xl border border-sky-100">
                <strong className="text-slate-900 block mb-1">2. Avoid Flooded Waterways</strong>
                Never walk or wade through water deeper than knee height. Water currents in Kuttanad bunds are rapid.
              </div>
              <div className="p-3 bg-white rounded-xl border border-sky-100">
                <strong className="text-slate-900 block mb-1">3. Use Official Boat Pickups</strong>
                Board only designated NDRF, Coast Guard, or Fire & Rescue boats with lifejackets.
              </div>
              <div className="p-3 bg-white rounded-xl border border-sky-100">
                <strong className="text-slate-900 block mb-1">4. Register at the Shelter</strong>
                Ensure your family is recorded in the relief camp registry for ration and medical supplies.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
