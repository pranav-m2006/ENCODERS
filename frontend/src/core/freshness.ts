/**
 * Freshness Thresholds & Fail-Safe Asymmetry in TypeScript.
 * Matches backend app/core/freshness.py and contract freshness.json.
 */

export const DEFAULT_THRESHOLDS: Record<string, number> = {
  river_gauge: 1800,           // 30 min
  weather_observation: 3600,   // 1 hour
  weather_forecast: 21600,     // 6 hours
  satellite_pass: 86400,       // 24 hours
  camp_occupancy: 10800,       // 3 hours
  road_report: 21600,          // 6 hours
  evacuation_group: 7200       // 2 hours
};

export function computeStatus(
  sourceType: string,
  asOfIso: string,
  nowIso?: string
): string {
  if (!asOfIso) return 'UNAVAILABLE';
  const now = nowIso ? new Date(nowIso).getTime() : Date.now();
  const asOf = new Date(asOfIso).getTime();
  const ageSec = Math.max(0, (now - asOf) / 1000);

  const thresh = DEFAULT_THRESHOLDS[sourceType] || 3600;

  if (sourceType === 'evacuation_group') {
    if (ageSec > 21600) return 'LOST_CONTACT';
    if (ageSec > thresh) return 'STALE';
    return 'LIVE';
  }

  if (ageSec <= thresh) return 'LIVE';
  return 'STALE';
}

export function computeEffectiveRoadStatus(
  rawStatus: string,
  asOfIso: string,
  nowIso?: string
): string {
  const upper = rawStatus.toUpperCase();
  const status = computeStatus('road_report', asOfIso, nowIso);
  const isStale = status === 'STALE';

  if (!isStale) return upper;

  // Fail-safe asymmetry
  if (upper === 'BLOCKED') return 'BLOCKED';
  if (upper === 'SAFE') return 'CAUTION';
  return upper;
}
