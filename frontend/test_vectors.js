import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import pure core logic
import { applyEventToCampState, computeFillBand } from './src/core/applyEvent.ts';
import { calculateSplitAllocation } from './src/core/redirect.ts';
import { computeStatus, computeEffectiveRoadStatus } from './src/core/freshness.ts';

const vectorsDir = path.resolve(__dirname, '..', 'docs', 'vectors');

function runOccupancyVectors() {
  console.log('Testing occupancy.json...');
  const data = JSON.parse(fs.readFileSync(path.join(vectorsDir, 'occupancy.json'), 'utf-8'));

  for (const testCase of data.tests) {
    let state = {
      camp_id: 'camp_A',
      capacity: testCase.capacity,
      occupied: testCase.initial_occupied,
      reserved: 0,
      projected: testCase.initial_occupied,
      available: testCase.capacity - testCase.initial_occupied,
      fill_band: computeFillBand(testCase.initial_occupied, testCase.capacity),
      resources: {},
      version: 1,
      alerts: [],
      arrived_groups: []
    };

    const appliedIds = new Set();
    const results = [];

    for (const evt of testCase.events) {
      const res = applyEventToCampState(state, evt, appliedIds);
      state = res.state;
      results.push(res);
      if (res.result === 'APPLIED') {
        appliedIds.add(evt.event_id);
      }
    }

    if (testCase.expected_occupied !== undefined && state.occupied !== testCase.expected_occupied) {
      throw new Error(`Failed ${testCase.id}: expected occupied ${testCase.expected_occupied}, got ${state.occupied}`);
    }
    if (testCase.expected_available !== undefined && state.available !== testCase.expected_available) {
      throw new Error(`Failed ${testCase.id}: expected available ${testCase.expected_available}, got ${state.available}`);
    }
    if (testCase.expected_fill_band !== undefined && state.fill_band !== testCase.expected_fill_band) {
      throw new Error(`Failed ${testCase.id}: expected fill band ${testCase.expected_fill_band}, got ${state.fill_band}`);
    }
    if (testCase.expected_result_second_event !== undefined && results[1].result !== testCase.expected_result_second_event) {
      throw new Error(`Failed ${testCase.id}: expected duplicate`);
    }
    if (testCase.expected_conflict_type !== undefined && results[0].conflictType !== testCase.expected_conflict_type) {
      throw new Error(`Failed ${testCase.id}: expected conflict type ${testCase.expected_conflict_type}`);
    }
    if (testCase.expected_alert !== undefined && !state.alerts.some(a => a.type === testCase.expected_alert)) {
      throw new Error(`Failed ${testCase.id}: expected alert ${testCase.expected_alert}`);
    }
    console.log(`  ✓ ${testCase.id}`);
  }
}

function runMergeVectors() {
  console.log('Testing merge.json...');
  const data = JSON.parse(fs.readFileSync(path.join(vectorsDir, 'merge.json'), 'utf-8'));

  const makeState = () => ({
    camp_id: data.initial_state.camp_id,
    capacity: data.initial_state.capacity,
    occupied: data.initial_state.occupied,
    reserved: 0,
    projected: data.initial_state.occupied,
    available: data.initial_state.capacity - data.initial_state.occupied,
    fill_band: computeFillBand(data.initial_state.occupied, data.initial_state.capacity),
    resources: {},
    version: 1,
    alerts: [],
    arrived_groups: []
  });

  let state1 = makeState();
  const set1 = new Set();
  for (const evt of [...data.device_1_events, ...data.device_2_events]) {
    const res = applyEventToCampState(state1, evt, set1);
    state1 = res.state;
    if (res.result === 'APPLIED') set1.add(evt.event_id);
  }

  let state2 = makeState();
  const set2 = new Set();
  for (const evt of [...data.device_2_events, ...data.device_1_events]) {
    const res = applyEventToCampState(state2, evt, set2);
    state2 = res.state;
    if (res.result === 'APPLIED') set2.add(evt.event_id);
  }

  if (state1.occupied !== data.expected_final_occupied || state2.occupied !== data.expected_final_occupied) {
    throw new Error('Merge calculation mismatch');
  }
  console.log('  ✓ test_commutative_merge_order_1_and_order_2');
}

function runRedirectVectors() {
  console.log('Testing redirect.json...');
  const data = JSON.parse(fs.readFileSync(path.join(vectorsDir, 'redirect.json'), 'utf-8'));

  for (const testCase of data.tests) {
    const res = calculateSplitAllocation(testCase.camps, testCase.incoming_group, testCase.roads);
    if (testCase.expected_decision && res.decision !== testCase.expected_decision) {
      throw new Error(`Failed ${testCase.id}: expected decision ${testCase.expected_decision}`);
    }
    if (testCase.expected_allocations) {
      if (JSON.stringify(res.allocations) !== JSON.stringify(testCase.expected_allocations)) {
        throw new Error(`Failed ${testCase.id}: allocations mismatch`);
      }
    }
    if (testCase.expected_resulting_occupancy) {
      for (const [cId, expOcc] of Object.entries(testCase.expected_resulting_occupancy)) {
        if (res.resulting_occupancy[cId] !== expOcc) {
          throw new Error(`Failed ${testCase.id}: resulting occupancy mismatch for ${cId}`);
        }
      }
    }
    if (testCase.expected_status && res.status !== testCase.expected_status) {
      throw new Error(`Failed ${testCase.id}: expected status ${testCase.expected_status}`);
    }
    console.log(`  ✓ ${testCase.id}`);
  }
}

function runFreshnessVectors() {
  console.log('Testing freshness.json...');
  const data = JSON.parse(fs.readFileSync(path.join(vectorsDir, 'freshness.json'), 'utf-8'));
  const refNow = data.reference_now;

  for (const testCase of data.tests) {
    if (testCase.expected_status) {
      const status = computeStatus(testCase.source_type, testCase.as_of, refNow);
      if (status !== testCase.expected_status) {
        throw new Error(`Failed freshness for ${testCase.source_type}: expected ${testCase.expected_status}, got ${status}`);
      }
    }
    if (testCase.expected_effective_status) {
      const eff = computeEffectiveRoadStatus(testCase.raw_status, testCase.as_of, refNow);
      if (eff !== testCase.expected_effective_status) {
        throw new Error(`Failed road asymmetry: expected ${testCase.expected_effective_status}, got ${eff}`);
      }
    }
  }
  console.log('  ✓ test_freshness_thresholds_and_road_asymmetry');
}

try {
  runOccupancyVectors();
  runMergeVectors();
  runRedirectVectors();
  runFreshnessVectors();
  console.log('\nAll 4 Frontend Test Vector Suites Passed Successfully! ✓');
} catch (e) {
  console.error('\nTest Vector Failure:', e.message);
  process.exit(1);
}
