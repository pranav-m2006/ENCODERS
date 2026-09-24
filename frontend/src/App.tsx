import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

// Public Pages
import { PublicLayout } from './pages/public/PublicLayout';
import { HomePage } from './pages/public/HomePage';
import { MapPage } from './pages/public/MapPage';
import { CampsPage } from './pages/public/CampsPage';
import { UpdatesPage } from './pages/public/UpdatesPage';
import { ForecastPage } from './pages/public/ForecastPage';
import { AskAiPage } from './pages/public/AskAiPage';
import { SafetyPage } from './pages/public/SafetyPage';
import { SettingsPage } from './pages/public/SettingsPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';

// Admin Authority Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { CampLiveBoardPage } from './pages/admin/CampLiveBoardPage';
import { SituationMapPage } from './pages/admin/SituationMapPage';
import { CampManagementPage } from './pages/admin/CampManagementPage';
import { ResourcesPage } from './pages/admin/ResourcesPage';
import { RescueOperationsPage } from './pages/admin/RescueOperationsPage';
import { EvacuationGroupsPage } from './pages/admin/EvacuationGroupsPage';
import { ApprovalsPage } from './pages/admin/ApprovalsPage';
import { AnnouncementsPage } from './pages/admin/AnnouncementsPage';
import { PredictionRiskPage } from './pages/admin/PredictionRiskPage';
import { AgentsAuditPage } from './pages/admin/AgentsAuditPage';
import { SimulationPage } from './pages/admin/SimulationPage';
import { DataInputsPage } from './pages/admin/DataInputsPage';
import { LimitationsPage } from './pages/admin/LimitationsPage';

// Camp Operator Portal Pages
import { CampOperatorLayout } from './pages/operator/CampOperatorLayout';
import { CampOperatorPage } from './pages/operator/CampOperatorPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

interface RouteGuardProps {
  children: React.ReactElement;
}

// Route Guard for Authenticated Users
function ProtectedRoute({ children }: RouteGuardProps) {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Route Guard specifically for Authority Role
function AuthorityRoute({ children }: RouteGuardProps) {
  const { user } = useAuthStore();
  if (!user || user.role !== 'authority') {
    return <Navigate to="/app" replace />;
  }
  return children;
}

// Route Guard specifically for Camp Operator Role (Authority also permitted)
function CampOperatorRoute({ children }: RouteGuardProps) {
  const { user } = useAuthStore();
  if (!user || (user.role !== 'camp_operator' && user.role !== 'authority')) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Login Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public Citizen Portal */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <PublicLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="camps" element={<CampsPage />} />
            <Route path="updates" element={<UpdatesPage />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="ask-ai" element={<AskAiPage />} />
            <Route path="safety" element={<SafetyPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* District Authority Portal */}
          <Route
            path="/admin"
            element={
              <AuthorityRoute>
                <AdminLayout />
              </AuthorityRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="camps/live" element={<CampLiveBoardPage />} />
            <Route path="map" element={<SituationMapPage />} />
            <Route path="camps" element={<CampManagementPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="rescue" element={<RescueOperationsPage />} />
            <Route path="groups" element={<EvacuationGroupsPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="predictions" element={<PredictionRiskPage />} />
            <Route path="agents" element={<AgentsAuditPage />} />
            <Route path="simulation" element={<SimulationPage />} />
            <Route path="inputs" element={<DataInputsPage />} />
            <Route path="limitations" element={<LimitationsPage />} />
          </Route>

          {/* Camp Operator Portal */}
          <Route
            path="/operator"
            element={
              <CampOperatorRoute>
                <CampOperatorLayout />
              </CampOperatorRoute>
            }
          >
            <Route index element={<CampOperatorPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
