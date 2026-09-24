/**
 * Camp Redirect & Split Optimization in TypeScript.
 * Matches backend app/services/redirect.py for offline local suggestions.
 */

export interface CampCandidate {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  status: string;
  risk: string;
}

export function calculateSplitAllocation(
  camps: CampCandidate[],
  incomingGroup: { id: string; count: number; target_camp_id: string },
  roads?: Array<{ from: string; to: string; status: string }>
): {
  status: string;
  decision?: string;
  allocations?: Array<{ camp_id: string; count: number }>;
  resulting_occupancy?: Record<string, number>;
  fallback?: string;
  reason?: string;
} {
  const targetId = incomingGroup.target_camp_id;
  const groupCount = incomingGroup.count;

  const targetCamp = camps.find(c => c.id === targetId);
  if (!targetCamp) {
    return { status: 'ERROR', reason: 'Target camp not found' };
  }

  const targetAvail = Math.max(0, targetCamp.capacity - targetCamp.occupied);
  if (groupCount <= targetAvail) {
    return {
      status: 'SINGLE_ALLOCATION',
      decision: 'CAMP_ASSIGN',
      allocations: [{ camp_id: targetId, count: groupCount }]
    };
  }

  const overflow = groupCount - targetAvail;

  const unreachable = new Set<string>();
  if (roads) {
    for (const r of roads) {
      if (r.status === 'BLOCKED') {
        unreachable.add(r.to);
      }
    }
  }

  const candidates = camps.filter(
    c => c.id !== targetId &&
         c.status.toUpperCase() === 'OPEN' &&
         ['LOW', 'MODERATE'].includes(c.risk.toUpperCase()) &&
         !unreachable.has(c.id)
  );

  candidates.sort((a, b) => (b.capacity - b.occupied) - (a.capacity - a.occupied));

  if (candidates.length === 0) {
    return {
      status: 'NO_VIABLE_ALTERNATIVE',
      fallback: 'ARRIVE_WITH_OVERCAPACITY_ALERT',
      reason: 'All alternative camps full, high-risk, or blocked'
    };
  }

  const best = candidates[0];
  return {
    status: 'SPLIT_REQUIRED',
    decision: 'CAMP_REDIRECT',
    allocations: [
      { camp_id: targetId, count: targetAvail },
      { camp_id: best.id, count: overflow }
    ],
    resulting_occupancy: {
      [targetId]: targetCamp.occupied + targetAvail,
      [best.id]: best.occupied + overflow
    }
  };
}
