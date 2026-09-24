import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export function useSSE() {
  const queryClient = useQueryClient();
  const { user, token } = useAuthStore();
  const isAuthority = user?.role === 'authority';

  useEffect(() => {
    const streamUrl = isAuthority
      ? `${API_BASE}/stream/authority?token=${token || ''}`
      : `${API_BASE}/stream/public`;

    let eventSource: EventSource | null = null;
    let mockInterval: number | null = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('connected', () => {
        console.log(`[SSE] Connected to ${isAuthority ? 'authority' : 'public'} stream`);
      });

      eventSource.addEventListener('camp_updated', (e) => {
        const data = JSON.parse(e.data);
        queryClient.invalidateQueries({ queryKey: ['camps'] });
        queryClient.invalidateQueries({ queryKey: ['publicSummary'] });
        queryClient.invalidateQueries({ queryKey: ['authorityDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['liveBoard'] });
      });

      eventSource.addEventListener('group_status_changed', () => {
        queryClient.invalidateQueries({ queryKey: ['groups'] });
        queryClient.invalidateQueries({ queryKey: ['camps'] });
        queryClient.invalidateQueries({ queryKey: ['liveBoard'] });
        queryClient.invalidateQueries({ queryKey: ['authorityDashboard'] });
      });

      eventSource.addEventListener('zone_risk_changed', () => {
        queryClient.invalidateQueries({ queryKey: ['zones'] });
        queryClient.invalidateQueries({ queryKey: ['predictions'] });
        queryClient.invalidateQueries({ queryKey: ['publicSummary'] });
      });

      eventSource.addEventListener('loop_stage', () => {
        queryClient.invalidateQueries({ queryKey: ['loop'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      });

      eventSource.addEventListener('announcement_published', () => {
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      });

      eventSource.addEventListener('approval_created', () => {
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
      });

      eventSource.addEventListener('ai_brief_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['aiBrief'] });
      });

      eventSource.addEventListener('ai_update_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['publicAiUpdate'] });
      });

      eventSource.onerror = () => {
        // Fallback ticker to keep UI lively while reconnecting
        if (!mockInterval) {
          mockInterval = window.setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ['loop'] });
          }, 15000);
        }
      };
    } catch (err) {
      console.warn('[SSE] Could not establish EventSource:', err);
    }

    return () => {
      eventSource?.close();
      if (mockInterval) clearInterval(mockInterval);
    };
  }, [isAuthority, token, queryClient]);
}
