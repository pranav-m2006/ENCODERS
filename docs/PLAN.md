# FloodOps v2 Implementation Plan & Architecture Blueprint

## Executive Overview
FloodOps v2 is an offline-first flood-response decision support platform grounded in the shared contract at [`docs/CONTRACT.md`](file:///c:/Users/LENOVO/OneDrive/Desktop/ENCODERS/docs/CONTRACT.md).

---

## 1. Setup Status & Deliverables (Part A Completed)

- [x] **Shared Contract Written**: [`docs/CONTRACT.md`](file:///c:/Users/LENOVO/OneDrive/Desktop/ENCODERS/docs/CONTRACT.md)
  - Non-negotiable principles (single operational state, immutable append-only events, human-in-the-loop, anonymous by design).
  - Standard Data Envelope (`value`, `status`, `as_of`, `source`, `confidence`).
  - Freshness thresholds and fail-safe asymmetry for road reports.
  - Complete enum definitions, camp capacity projection math, and v7 UUID event envelopes.
  - Apply rules (pure functions, commutativity of deltas, conflict detection).
  - API surface with `/api/v1` routes (`/health`, `/bootstrap`, `/stream`, `/sync/*`, etc.).
  - Synthetic district definition ("Baran River Basin") and `RISING_RIVER` demo scenario.
- [x] **Shared Test Vectors Established**:
  - [`docs/vectors/occupancy.json`](file:///c:/Users/LENOVO/OneDrive/Desktop/ENCODERS/docs/vectors/occupancy.json)
  - [`docs/vectors/redirect.json`](file:///c:/Users/LENOVO/OneDrive/Desktop/ENCODERS/docs/vectors/redirect.json)
  - [`docs/vectors/routing.json`](file:///c:/Users/LENOVO/OneDrive/Desktop/ENCODERS/docs/vectors/routing.json)
  - [`docs/vectors/freshness.json`](file:///c:/Users/LENOVO/OneDrive/Desktop/ENCODERS/docs/vectors/freshness.json)
  - [`docs/vectors/merge.json`](file:///c:/Users/LENOVO/OneDrive/Desktop/ENCODERS/docs/vectors/merge.json)

---

## 2. Backend Implementation Phases (Part B)

### Phase B1 — Foundation & Contract Alignment
- Align SQLAlchemy models & Alembic migrations with v2 schema:
  - Tables: `users`, `roles`, `devices`, `places`, `camps`, `camp_state` (projection), `evacuation_groups`, `resources`, `rescue_missions`, `rescue_resources`, `roads`, `road_reports`, `flood_zones`, `flood_predictions`, `weather_observations`, `river_readings`, `recommendations`, `communications`, `authority_instructions`, `sync_events`, `sync_conflicts`, `audit_logs`, `agent_events`.
- Implement `GET /health` (unauthenticated ping) and `GET /bootstrap` (offline snapshot bundle).
- Standard response envelope `{ "data": ..., "meta": { "server_time", "as_of", "demo": true } }`.

### Phase B2 — Event & Sync Engine (Pure Functions & Projections)
- `app/core/events.py`: Pure event apply function implementing all contract apply rules without I/O.
- `app/core/hlc.py`: Hybrid Logical Clock timestamp generator & clock skew detector.
- `POST /sync/push` & `GET /sync/pull?since={cursor}` with conflict classification (`NEGATIVE_OCCUPANCY`, `DOUBLE_ARRIVAL`, `STOCKTAKE_MISMATCH`, `STALE_DECISION`, `UNAUTHORIZED_ORIGIN`, `CLOCK_SKEW`).
- Projection rebuilder CLI: `python -m app.cli rebuild-projections`.

### Phase B3 — Domain Services & Occupancy Logic
- Camp occupancy math: `occupied`, `reserved`, `projected`, `available`, `fill_band` (Green <70%, Amber 70-90%, Red ≥90%).
- Fact-based handling: over-capacity arrivals applied immediately + emit `OVERCAPACITY` alert.

### Phase B4 — Deterministic Agents & Routing
- Adapters (Live → Cached → Manual → Simulated) for Weather, River, Satellite.
- Transparent rule-based flood risk model:
  $$\text{risk} = \text{clamp}(0.40 \cdot \text{stage} + 0.25 \cdot \text{rise} + 0.20 \cdot \text{rain} + 0.15 \cdot (1 - \text{elevation}))$$
- Dijkstra/A* routing with multipliers (`SAFE` 1.0, `CAUTION` 2.5, `UNKNOWN` 4.0, `BLOCKED` excluded).
- Relief camp split algorithm (900/1000 + 180 → 100 to A, 80 to B).
- Rescue priority scoring & resource shortfall tracking.

### Phase B5 — Recommendations, Safety & Delivery Tracking
- Constraint validator (PASS / WARN / FAIL); FAIL blocks approval unless admin override recorded.
- Recommendation lifecycle (two axes: decision status + delivery status).
- Plain-language deterministic radio script generator & printable camp field sheet HTML.
- Optional LLM explanation endpoint `POST /ai/explain` (env-gated, read-only).

### Phase B6 — Security, Audit, Simulation & Seed
- Append-only hash-chained audit log with `GET /audit/verify`.
- Simulation engine: `RISING_RIVER` scenario and interactive failure toggles.

### Phase B7 — Test Suite
- Run all 14 specified scenario tests (`test_700_plus_100_is_800`, `test_900_plus_180_splits_100_80`, `test_offline_devices_100_and_50_merge_to_850_any_order`, etc.).

---

## 3. Frontend Implementation Phases (Part C)

### Phase F1 — Design System, Data Envelope & Global Chrome
- Global top bar: connection state chip, pending sync counter, last sync time, role badge, disaster phase selector (Before / During / After).
- Global footer: *"Decision support. Verify before acting."* + persistent `DEMO DATA` watermark.
- `<DataValue>` component: value + status chip (LIVE, STALE, FIELD_REPORT, ESTIMATED, UNAVAILABLE) + as-of timestamp + source.

### Phase F2 — Local-First Data Layer (Dexie.js & Pure Reducer)
- Dexie tables: `snapshot`, `events_applied`, `outbox`, `meta`.
- `applyEvent.ts` porting the pure contract reducer to TypeScript.
- Selectors in `selectors.ts` as the single source of truth for all components.
- Sync engine with real `/health` ping, simulated offline mode, and outbox file exporter.

### Phase F3 — Camp Console & Groups Board
- Camp tablet console (quick buttons +1, +5, +10, +50, 60s compensating undo, typo guard).
- Evacuation groups Kanban board (`IDENTIFIED` → `ASSIGNED` → `IN_TRANSIT` → `ARRIVED`).
- Shared-state proof verification (updating camp changes all displays instantly).

### Phase F4 — Live Map & Flood Prediction with Offline Fallback
- Leaflet map with vector-only fallback (GeoJSON zones, roads, camps) when raster tiles are unavailable.
- Interactive road status reporting directly on map segments.

### Phase F5 — Recommendation & Safety Cards
- Interactive decision card with constraint checks, score breakdown, approval actions, radio script copy, and delivery status progression.

### Phase F6 — Management, Simulation & Limitations View
- Conflict resolution console (side-by-side merge / pick).
- Simulation control panel for interactive demo toggles.
- Limitations page under Settings -> About detailing all 16 operational boundary conditions.
