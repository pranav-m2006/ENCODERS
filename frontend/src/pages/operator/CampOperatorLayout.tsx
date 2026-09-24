import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { OfflineStatusBanner } from '../../components/common/OfflineStatusBanner';
import { Tent, LogOut, Globe, PhoneCall, ShieldCheck, User } from 'lucide-react';
import { Language } from '../../lib/types';

export const CampOperatorLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, language, setLanguage } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Offline Status & Recovery DB Top Banner */}
      <OfflineStatusBanner />

      {/* Main Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md">
            <Tent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black font-heading text-slate-900 tracking-tight">
                Flood<span className="text-amber-600">Ops</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                Camp Operator Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Relief Shelter Operations, Rescue Directives & Realtime Evacuee Headcount
            </p>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['en', 'ta', 'ml', 'hi'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  language === lang
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* User Profile Chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
            <User className="w-4 h-4 text-amber-700" />
            <div className="text-left hidden md:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight">{user?.name || 'Camp In-Charge'}</span>
              <span className="text-[10px] text-slate-500 block">Operator ID: {user?.id || 'OP-01'}</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
        <p className="font-semibold">
          FloodOps Disaster Response System • District Administration & Camp Operator Mesh Network
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Emergency Command Line: 112 / 1913 • Local Offline Recovery DB IndexedDB Version 2.0
        </p>
      </footer>
    </div>
  );
};
