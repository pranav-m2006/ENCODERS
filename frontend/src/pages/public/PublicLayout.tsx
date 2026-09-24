import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSSE } from '../../lib/useSSE';
import { StateConsistencyBadge } from '../../components/ui/StateConsistencyBadge';
import {
  Waves, Home, Map, Tent, Bell, MessageSquareQuote, ShieldAlert,
  Settings, LogOut, PhoneCall, Globe, LifeBuoy, TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { Language } from '../../lib/types';
import { OfflineStatusBanner } from '../../components/common/OfflineStatusBanner';

export const PublicLayout: React.FC = () => {
  useSSE();
  const { t, i18n } = useTranslation();
  const { user, logout, setLanguage, language } = useAuthStore();
  const navigate = useNavigate();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/app', label: t('home'), icon: Home, end: true },
    { to: '/app/map', label: t('map'), icon: Map },
    { to: '/app/camps', label: t('camps'), icon: Tent },
    { to: '/app/updates', label: t('updates'), icon: Bell },
    { to: '/app/forecast', label: t('forecast'), icon: TrendingUp },
    { to: '/app/ask-ai', label: t('askAi'), icon: MessageSquareQuote },
    { to: '/app/safety', label: t('safety'), icon: ShieldAlert },
    { to: '/app/settings', label: t('settings'), icon: Settings }
  ];

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'hi', label: 'हिन्दी' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5FBFF] text-slate-800 pb-20 md:pb-6">
      {/* Top Emergency 112 Slim Strip */}
      <div className="bg-gradient-to-r from-rose-600 via-coral-dark to-rose-700 text-white text-xs py-2 px-4 flex items-center justify-between font-bold shadow-sm z-30 sticky top-0">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 animate-bounce shrink-0" />
            <span className="tracking-wide">{t('emergencyStrip')}</span>
          </div>
          <span className="text-[11px] font-medium bg-white/20 px-2.5 py-0.5 rounded-full hidden sm:inline-block">
            24/7 Disaster Control Room Active
          </span>
        </div>
      </div>

      {/* Offline Status & Recovery DB Banner */}
      <OfflineStatusBanner />

      {/* Main Top Header */}
      <header className="glass-header sticky top-8 z-20 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Live Pulse */}
          <div className="flex items-center gap-3">
            <NavLink to="/app" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-ocean to-aqua text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Waves className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight font-heading text-slate-900">
                    Flood<span className="text-ocean">Ops</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Kuttanad & Alappuzha District Flood Response
                </p>
              </div>
            </NavLink>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
            {navItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                    isActive
                      ? 'bg-white text-ocean shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Header Actions: Language, User Role Badge & Logout */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-ocean/40 shadow-sm text-slate-700 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-ocean" />
                <span className="uppercase">{language}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code as Language);
                        setLangMenuOpen(false);
                      }}
                      className={clsx(
                        'w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-sky-50 transition-colors',
                        language === l.code ? 'text-ocean font-bold bg-sky-50/60' : 'text-slate-700'
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Authority Link if authority */}
            {user?.role === 'authority' && (
              <NavLink
                to="/admin"
                className="text-xs font-bold bg-deep text-white px-3 py-1.5 rounded-xl shadow-sm hover:bg-deep-darker transition-colors hidden sm:inline-flex items-center gap-1.5"
              >
                <LifeBuoy className="w-3.5 h-3.5 text-aqua" />
                Command Admin
              </NavLink>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => clsx(
                'flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all',
                isActive
                  ? 'text-ocean font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Dev-only State Consistency Validation Badge */}
      <StateConsistencyBadge />
    </div>
  );
};
