import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Settings, Globe, MapPin, Bell, Eye, LogOut, CheckCircle2 } from 'lucide-react';
import { Language } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [selectedZone, setSelectedZone] = useState('zone_a');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-ocean" />
          Preferences & Portal Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Customize language, primary zone alerts, accessibility and emergency notifications
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Settings saved successfully!
        </div>
      )}

      {/* Language Preferences */}
      <Card className="p-5 border border-sky-100 shadow-soft space-y-4">
        <h3 className="font-bold text-sm text-slate-900 font-heading flex items-center gap-2">
          <Globe className="w-4 h-4 text-ocean" />
          Portal Language / மொழி / ഭാഷ / भाषा
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { code: 'en', label: 'English' },
            { code: 'ta', label: 'தமிழ் (Tamil)' },
            { code: 'ml', label: 'മലയാളം (Malayalam)' },
            { code: 'hi', label: 'हिन्दी (Hindi)' }
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code as Language)}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                language === l.code
                  ? 'bg-ocean text-white border-ocean shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Primary Ward / Zone Selection */}
      <Card className="p-5 border border-sky-100 shadow-soft space-y-4">
        <h3 className="font-bold text-sm text-slate-900 font-heading flex items-center gap-2">
          <MapPin className="w-4 h-4 text-ocean" />
          My Primary Residential Zone (Kuttanad)
        </h3>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ocean/40"
        >
          <option value="zone_a">Zone A - Kuttanad Central</option>
          <option value="zone_b">Zone B - Edathua Ward</option>
          <option value="zone_c">Zone C - Chennithala</option>
          <option value="zone_d">Zone D - Ramankary Canal Ward</option>
          <option value="zone_e">Zone E - Muttar</option>
        </select>
        <p className="text-xs text-slate-500">
          The public portal highlights real-time flood probability and boat dispatches for this chosen zone.
        </p>
      </Card>

      {/* Accessibility and Alerts */}
      <Card className="p-5 border border-sky-100 shadow-soft space-y-4">
        <h3 className="font-bold text-sm text-slate-900 font-heading flex items-center gap-2">
          <Eye className="w-4 h-4 text-ocean" />
          Accessibility & Notifications
        </h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Critical Flash Notifications</span>
              <span className="text-[11px] text-slate-500">Browser alerts when river level crosses 5.50m alert threshold</span>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="w-4 h-4 text-ocean rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-slate-900 block">High Contrast Mode</span>
              <span className="text-[11px] text-slate-500">Enhance text and marker visibility under direct sunlight</span>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="w-4 h-4 text-ocean rounded"
            />
          </label>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="danger"
          size="md"
          icon={<LogOut className="w-4 h-4" />}
          onClick={handleLogout}
        >
          Sign Out of Account
        </Button>

        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
};
