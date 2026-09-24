import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSSE } from '../../lib/useSSE';
import { StateConsistencyBadge } from '../../components/ui/StateConsistencyBadge';
import { DemoToolsDrawer } from '../../components/admin/DemoToolsDrawer';
import {
  LayoutDashboard, Map, Tent, Package, Ship, Users, CheckSquare,
  Megaphone, Activity, Cpu, Sparkles, Database, LogOut,
  ChevronLeft, ChevronRight, Shield, Waves, Eye
} from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Approval } from '../../lib/types';
import { GlobalTopBar } from '../../components/common/GlobalTopBar';
import { GlobalFooter } from '../../components/common/GlobalFooter';
import { OfflineStatusBanner } from '../../components/common/OfflineStatusBanner';

export function AdminLayout() {
  useSSE();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);

  const { data: approvals } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => api.get<Approval[]>('/authority/approvals'),
    refetchInterval: 10000
  });

  const pendingApprovalsCount = approvals?.filter(a => a.status === 'pending').length || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', label: 'Command Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/camps/live', label: 'Camp Live Board', icon: Activity, badge: 'Strongest View' },
    { to: '/admin/map', label: 'Situation Map', icon: Map },
    { to: '/admin/camps', label: 'Camp Management', icon: Tent },
    { to: '/admin/resources', label: 'Resources & Stocks', icon: Package },
    { to: '/admin/rescue', label: 'Rescue Operations', icon: Ship },
    { to: '/admin/groups', label: 'Evacuation Groups', icon: Users },
    { to: '/admin/approvals', label: 'Approvals Queue', icon: CheckSquare, count: pendingApprovalsCount },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/admin/predictions', label: 'Prediction & Risk', icon: Shield },
    { to: '/admin/agents', label: 'Agents & Audit Log', icon: Cpu },
    { to: '/admin/simulation', label: 'Simulation Benchmark', icon: Sparkles },
    { to: '/admin/inputs', label: 'Data Inputs', icon: Database },
    { to: '/admin/limitations', label: 'Operational Limitations', icon: Shield }
  ];

  return (
    <div className="min-h-screen flex bg-[#F0F9FF] text-slate-800">
      {/* Left Collapsible Sidebar */}
      <aside className={clsx(
        'bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 transition-all duration-300 z-30 sticky top-0 h-screen',
        collapsed ? 'w-20' : 'w-64'
      )}>
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
            {!collapsed && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-ocean to-aqua text-white flex items-center justify-center shadow-md">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-extrabold text-base font-heading leading-tight tracking-tight text-white">
                    Flood<span className="text-aqua">Ops</span>
                  </h1>
                  <p className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">Collector Portal</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mx-auto cursor-pointer"
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all',
                    isActive
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && item.count !== undefined && item.count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full animate-pulse">
                      {item.count}
                    </span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-aqua/20 text-aqua rounded border border-aqua/30">
                      LIVE
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer: User Profile & Public Switcher */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {!collapsed && (
            <NavLink
              to="/app"
              className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-200 flex items-center justify-center gap-2 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Switch to Public View
            </NavLink>
          )}

          <div className="flex items-center justify-between pt-1">
            {!collapsed && (
              <div className="truncate text-xs">
                <p className="font-bold text-white truncate">District Collector</p>
                <p className="text-[10px] text-slate-400 truncate">Alappuzha HQ</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Right Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineStatusBanner />
        <GlobalTopBar currentRole={user?.role === 'authority' ? 'ADMIN (District Authority)' : 'STAFF'} />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>

        <GlobalFooter />

        {/* Demo Tools Drawer */}
        <DemoToolsDrawer
          isOpen={demoDrawerOpen}
          onClose={() => setDemoDrawerOpen(false)}
        />

        {/* State Consistency Badge */}
        <StateConsistencyBadge />
      </div>
    </div>
  );
};
