# FloodOps — Shared Contract (v2, Practical Build)

> **The Single Source of Truth** for enums, event schemas, data envelopes, capacity rules, routing constraints, sync protocols, and shared test vectors.

---

## A1. Non-Negotiable Principles

1. **One Operational State**: Every page and service reads from the same projections. No page-specific or component-specific fake data.
2. **Events Are the Truth**: Changes are appended as immutable events. Current numbers are projections derived deterministically from the event log.
3. **Facts vs. Requests**:
   - An arrival, road report, hazard report, or rescue count is a **fact** and is never rejected.
   - Assignments, transfers, and redirects are **proposals** that require validation and human approval.
4. **Never Fake Liveness**: A value from a failed agent, stale sensor, or cached snapshot must explicitly show that status (`STALE`, `UNAVAILABLE`, etc.).
5. **Human-in-the-Loop**: All critical actions (evacuations, redirects, rescue dispatches) require human approval. Constraint validation failures block approval unless accompanied by an explicit, audited admin override.
6. **Anonymous by Design**: Groups and aggregated counts only. No personally identifiable information (PII), names, phone numbers, or individual citizen IDs.

---

## A2. Data Envelope & Freshness Thresholds

Every displayed value or API entity attribute that derives from sensors, field reports, or agent projections is wrapped in the standard data envelope:

```json
{
  "value": 850,
  "status": "LIVE",
  "as_of": "2026-09-24T10:15:00Z",
  "source": "camp_device:CAMP-A-TAB-1",
  "confidence": 0.9
}
```

### Status Enum
`status ∈ LIVE | STALE | FIELD_REPORT | ESTIMATED | UNAVAILABLE`

*Status is strictly computed on read from `as_of` and the freshness thresholds below. It is never trusted blindly from the writer.*

### Default Freshness Thresholds

| Source | LIVE while age ≤ | Then Status Becomes |
|---|---|---|
| River gauge | 30 min | `STALE` |
| Weather observation | 1 h | `STALE` |
| Weather forecast | 6 h | `STALE` |
| Satellite flood extent ("latest pass") | 24 h | `STALE` |
| Camp occupancy (last confirmed event or sync) | 3 h | `STALE` |
| Road field report | 6 h | `STALE` |
| Evacuation group last position | 2 h | `STALE` (`LOST_CONTACT` at 6 h) |

### Fail-Safe Asymmetry for Road Reports
- **Stale + BLOCKED**: Remains `BLOCKED`.
- **Stale + SAFE**: Demoted to `CAUTION`.

---

## A3. Enums

- **Role**: `ADMIN`, `STAFF` (scoped to `camp_ids` / `team_ids`), `PUBLIC` (unauthenticated).
- **Camp Status**: `OPEN`, `FULL`, `CLOSED`, `UNSAFE`, `UNKNOWN`.
- **Group State**: `IDENTIFIED` → `ASSIGNED` → `IN_TRANSIT` → `ARRIVED`, plus `SPLIT`, `CANCELLED`, `LOST_CONTACT`.
- **Road Status**: `SAFE`, `CAUTION`, `BLOCKED`, `UNKNOWN`.
- **Risk Band**: `LOW`, `MODERATE`, `HIGH`, `SEVERE`.
- **Mission Status**: `PENDING`, `ASSIGNED`, `EN_ROUTE`, `ON_SCENE`, `COMPLETED`, `ABORTED`.
- **Agent Status**: `HEALTHY`, `DEGRADED`, `UNAVAILABLE`, `RECOVERING`, `DISABLED` (for demo failure toggles).
- **Recommendation Decision Status**: `PROPOSED`, `APPROVED`, `REJECTED`, `SUPERSEDED`, `EXPIRED`.
- **Recommendation Delivery Status**: `NOT_SENT`, `COMMUNICATED`, `ACKNOWLEDGED`, `CONFIRMED`.
- **Recommendation Kind**: `CAMP_REDIRECT`, `ROUTE_CHANGE`, `RESCUE_ASSIGN`, `RESOURCE_TRANSFER`, `EVACUATE_ZONE`, `SAFETY_WARNING`.
- **Validator Result**: `PASS`, `WARN`, `FAIL`.
- **Connection State (Client)**: `ONLINE`, `DEGRADED`, `OFFLINE`, `SIMULATED_OFFLINE`.

---

## A4. Camp Capacity Math

Projections are computed strictly from events and group state:
```
occupied  = Σ CAMP_ARRIVAL.count − Σ CAMP_DEPARTURE.count      (applied events only)
reserved  = Σ count of groups in ASSIGNED or IN_TRANSIT to this camp
projected = occupied + reserved
available = capacity − projected
fill_band:
  GREEN < 70% of capacity
  AMBER 70% – 90% of capacity
  RED   ≥ 90% of capacity
safe_fill_limit = 90% of capacity (0.90 * capacity, used by redirect recommendations)
```

**Rule**: Group assignment or transit never changes `occupied`. Only a confirmed `CAMP_ARRIVAL` or `CAMP_DEPARTURE` event mutates `occupied`.

---

## A5. Event Envelope & Sync Engine

### Event Schema
```json
{
  "event_id": "uuid-v7 (client generated)",
  "device_id": "CAMP-A-TAB-1",
  "user_id": "u_123",
  "seq": 42,
  "type": "CAMP_ARRIVAL",
  "entity_id": "camp_A",
  "payload": {
    "count": 100,
    "vulnerability": { "elderly": 8, "children": 20, "disabled": 2, "medical": 3 },
    "group_id": "grp_17"
  },
  "occurred_at": "2026-09-24T10:15:00Z",
  "recorded_at": "2026-09-24T10:17:00Z",
  "hlc": "2026-09-24T10:17:00.000Z-0003-CAMP-A-TAB-1",
  "base_version": null
}
```

### Server Augmented Metadata
The server appends:
- `received_at`: Server timestamp
- `server_seq`: Monotonically increasing integer (the pull cursor)
- `origin_node`: Node identifier (`central` or edge ID)
- `result`: `APPLIED` | `DUPLICATE` | `CONFLICT` | `REJECTED`
- `conflict_id`: ID if a conflict was recorded

### Event Types (MVP)
`GROUP_CREATED`, `GROUP_ASSIGNED`, `GROUP_IN_TRANSIT`, `GROUP_ARRIVED`, `GROUP_SPLIT`, `GROUP_CANCELLED`, `CAMP_ARRIVAL`, `CAMP_DEPARTURE`, `RESOURCE_ADJUST` (delta), `RESOURCE_STOCKTAKE` (absolute, requires `base_version`), `ROAD_REPORT`, `HAZARD_REPORT`, `RESCUE_COUNT` (delta), `MISSION_STATUS`, `RECOMMENDATION_DECISION`, `COMMUNICATION_LOG`, `INSTRUCTION_PUBLISHED`, `CONFLICT_RESOLUTION`, `CAMP_STATUS`.

### Apply Rules (Pure Functions, Shared Client & Server)
1. **Idempotency**: Checked by `event_id`. Duplicate returns `DUPLICATE` without state modification.
2. **Commutativity of Deltas**: Delta events (`CAMP_ARRIVAL`, `CAMP_DEPARTURE`, `RESOURCE_ADJUST`, `RESCUE_COUNT`) commute. `+100` and `+50` from different offline devices in any sequence yield `+150`.
3. **Absolute Updates**: `RESOURCE_STOCKTAKE` compares `base_version`. Version mismatch creates `STOCKTAKE_MISMATCH` conflict.
4. **Overcapacity Arrivals**: Arrivals exceeding camp capacity are `APPLIED` (facts cannot be rejected) and emit an `OVERCAPACITY` alert and trigger rebalancing.
5. **Negative Occupancy**: A departure event that would drive occupancy `< 0` produces a `NEGATIVE_OCCUPANCY` conflict and is **not** applied.
6. **Double Arrival**: `GROUP_ARRIVED` for a group already marked arrived elsewhere produces a `DOUBLE_ARRIVAL` conflict.
7. **Stale Decision**: `RECOMMENDATION_DECISION` whose `based_on_snapshot_hash` does not match current state or whose recommendation is `SUPERSEDED` produces `STALE_DECISION` conflict.
8. **Revoked Access**: Events from a revoked user or device are recorded as `UNAUTHORIZED_ORIGIN` conflict for manual review.
9. **Clock Skew**: Skew `> 10 min` between `recorded_at` and `received_at` flags `CLOCK_SKEW` but applies the event.
10. **Compensating Events**: Events are never edited or deleted. UI undo generates a compensating counter-event.

### Client Projection Derivation
`Local State = Last Server-Confirmed Projection + Pending Outbox Events applied in HLC order`

---

## A6. Recommendation Object & Safety

```json
{
  "id": "rec_9",
  "kind": "CAMP_REDIRECT",
  "decision_status": "PROPOSED",
  "delivery_status": "NOT_SENT",
  "created_at": "2026-09-24T10:15:00Z",
  "valid_until": "2026-09-24T10:45:00Z",
  "snapshot_hash": "sha256:...",
  "proposal": {
    "group_id": "grp_17",
    "allocations": [
      { "camp_id": "camp_A", "count": 100 },
      { "camp_id": "camp_B", "count": 80 }
    ]
  },
  "explanation": {
    "summary": "Camp A would reach 108%. Splitting keeps A at 100% and puts 80 in B.",
    "score_breakdown": [
      { "factor": "Camp A Capacity Limit", "impact": "Prevents overcrowding" },
      { "factor": "Route Safety to Camp B", "impact": "Road R12 is safe" }
    ]
  },
  "inputs": [
    { "name": "camp_A.occupancy", "status": "LIVE", "as_of": "2026-09-24T10:14:00Z" },
    { "name": "road_R12", "status": "FIELD_REPORT", "as_of": "2026-09-24T09:30:00Z" }
  ],
  "constraints": [
    { "name": "capacity_ok", "result": "PASS" },
    { "name": "route_not_blocked", "result": "PASS" },
    { "name": "critical_inputs_fresh", "result": "WARN" }
  ],
  "overall": "WARN",
  "delivery": {
    "channel": "RADIO",
    "by": "u_5",
    "at": "2026-09-24T10:16:00Z",
    "ack_by": null
  },
  "radio_script": "Control to Camp B: expect 80 evacuees, route via Road R12..."
}
```

*Note*: Any `FAIL` in constraints blocks `APPROVED` unless overridden by an `ADMIN` with a recorded rationale.

---

## A7. REST API Surface (`/api/v1`)

Response envelope:
```json
{
  "data": {},
  "meta": {
    "server_time": "2026-09-24T10:15:00Z",
    "as_of": "2026-09-24T10:15:00Z",
    "demo": true
  }
}
```

### Endpoints
- **Auth**:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `GET /auth/me`
  - `POST /auth/devices/enroll`
- **Core Sync & System**:
  - `GET /health` (lightweight, unauthenticated connectivity check)
  - `GET /bootstrap` (camps, road graph, zones, places, predictions, instructions, thresholds, cursor)
  - `GET /stream` (Server-Sent Events)
  - `POST /sync/push`
  - `GET /sync/pull?since={cursor}`
  - `GET /sync/status`
  - `GET /sync/conflicts`
  - `POST /sync/conflicts/{id}/resolve`
- **Camps & Capacity**:
  - `GET /camps`
  - `GET /camps/{id}`
  - `POST /camps/{id}/occupancy` (creates arrival / departure events)
  - `GET /camps/{id}/resources`
  - `GET /camps/{id}/field-sheet` (printable camp sheet HTML)
- **Evacuation Groups**:
  - `GET /evacuation-groups`
  - `POST /evacuation-groups`
  - `POST /evacuation-groups/{id}/assign`
  - `POST /evacuation-groups/{id}/arrive`
  - `POST /evacuation-groups/{id}/transfer`
  - `POST /evacuation-groups/{id}/split`
- **Rescue**:
  - `GET /rescue`
  - `GET /rescue/missions`
  - `POST /rescue/missions`
  - `POST /rescue/assign`
- **Resources**:
  - `GET /resources`
  - `POST /resources/allocate`
- **Flood & Hazards**:
  - `GET /flood/predictions`
  - `GET /flood/zones`
- **Routing**:
  - `POST /routes` (origin, destination, avoid)
  - `POST /routes/recalculate`
- **Agents**:
  - `GET /agents`
  - `GET /agents/status`
  - `POST /agents/{name}/disable`
  - `POST /agents/{name}/enable`
  - `POST /agents/{name}/restart`
- **Recommendations & Instructions**:
  - `GET /alerts`
  - `GET /authority-instructions`
  - `POST /authority-instructions`
  - `GET /authority-instructions/{id}/radio-script`
  - `GET /ai/recommendations`
  - `POST /ai/recommendations/{id}/decide`
  - `POST /ai/recommendations/{id}/communicate`
  - `POST /ai/explain` (optional LLM explanation)
- **Dashboard & Audit**:
  - `GET /dashboard`
  - `GET /audit`
  - `GET /audit/verify` (hash chain validation)
- **Simulation**:
  - `POST /simulation/scenario/{name}/start`
  - `POST /simulation/scenario/{name}/step`
  - `POST /simulation/scenario/{name}/reset`
  - `POST /simulation/toggle` (weather, river, gps, internet, road block, fill camp, incoming group)

---

## A8. Shared Test Vectors

Test vectors in `docs/vectors/*.json`:
1. `occupancy.json`:
   - `700 + 100 -> 800`
   - `700 + 100 + 50 -> 850`
   - Duplicate event ID returns duplicate, no state change
   - Departure causing negative occupancy -> conflict
2. `redirect.json`:
   - Camp A (capacity 1000, occupied 900), incoming group 180, Camp B viable (capacity 600, occupied 200). Split proposal: A receives 100 (caps at 1000), B receives 80.
   - If Camp B is unreachable or road blocked: `NO_VIABLE_ALLOCATION` with explicit reason.
3. `routing.json`:
   - `BLOCKED` edge strictly excluded.
   - `UNKNOWN` edge cost penalty multiplier: `4.0x`.
   - `CAUTION` edge cost penalty multiplier: `2.5x`.
   - No path -> `NO_SAFE_ROUTE`.
4. `freshness.json`:
   - Threshold evaluation table.
   - Road fail-safe asymmetry verification (`BLOCKED` stays `BLOCKED`, `SAFE` becomes `CAUTION`).
5. `merge.json`:
   - Two offline devices generate interleaved events. Applying in order (A then B) vs (B then A) produces identical final state.

---

## A9. Synthetic District & Demo Seed Data

- **District**: "Baran River Basin"
- **3 Gauges**: `GAUGE-1` (Upstream), `GAUGE-2` (Midstream), `GAUGE-3` (Delta).
- **8 Flood Zones**: `ZONE-1` through `ZONE-8` with elevation, population, and geometry.
- **12 Places**: Villages and landmarks for manual gazetteer lookup.
- **~40 Road Segments**: Network graph connecting zones, villages, and camps.
- **6 Relief Camps**:
  - `camp_A` (Central School): Capacity 1000, Occupied 700.
  - `camp_B` (Highland Community Center): Capacity 600, Occupied 200.
  - `camp_C` (Sports Complex): Capacity 800, Occupied 150.
  - `camp_D` (North Hills Academy): Capacity 500, Occupied 50.
  - `camp_E` (Riverside Shelter): Capacity 400, Occupied 380 (UNSAFE/HIGH risk).
  - `camp_F` (East Valley Base): Capacity 600, Occupied 100.
- **10 Rescue Teams**: `TEAM-1` to `TEAM-10` (with boat capability markers).
- **Scenario `RISING_RIVER`**:
  River stage surges -> Zones 2 & 3 enter `HIGH` risk -> Group 17 (180 evacuees) identified -> Camp A projected to 1080 (over capacity) -> Split recommendation (100 to A, 80 to B) -> Admin approves -> Radio script generated -> Ack received -> Arrival confirmed -> Road R12 blocked -> Route recalculated -> Weather agent toggled unavailable -> 2 devices offline record arrivals -> Reconnected -> Clean merge.
