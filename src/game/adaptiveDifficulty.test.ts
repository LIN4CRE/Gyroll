import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialAdaptiveState,
  recordAdaptiveRun,
  applyAdaptiveTrackModifications,
  DIFFICULTY_CONFIG,
} from './adaptiveDifficulty';
import { TrackDefinition } from './types';

const testTrack: TrackDefinition = {
  id: 'test',
  name: 'Test Course',
  difficulty: 'Easy',
  description: 'Test',
  themeColor: '#00ffff',
  targetTimes: { gold: 25, silver: 35, bronze: 50 },
  rewardCoins: 100,
  spawnPoint: { x: 0, y: 0, z: 0 },
  finishZ: -100,
  segments: [
    {
      id: 'beam',
      startX: 0,
      startY: 0,
      startZ: 0,
      endX: 0,
      endY: 0,
      endZ: -50,
      width: 2.0, // narrow balance beam
      surface: 'normal',
      hasRails: false,
    },
  ],
  obstacles: [
    {
      id: 'hammer_1',
      type: 'swinging_hammer',
      position: { x: 0, y: 0, z: -30 },
      size: { x: 2, y: 4, z: 1.5 },
      pivotHeight: 4,
      armLength: 3,
      headRadius: 0.5,
      speed: 2.0,
      phase: 0,
      maxAngle: 0.8,
    },
  ],
};

test('initial adaptive difficulty initializes in Standard tier 0', () => {
  const state = createInitialAdaptiveState();
  assert.equal(state.tier, 0);
  assert.equal(state.multiplier, 1.0);
  assert.equal(state.label, 'Standard');
  assert.equal(state.enabled, true);
});

test('repeated clean successes gradually scale up difficulty', () => {
  let state = createInitialAdaptiveState();
  const baseTime = 100000;

  // 3 consecutive strong runs
  for (let i = 0; i < DIFFICULTY_CONFIG.successStreakThreshold; i++) {
    const res = recordAdaptiveRun(
      state,
      {
        trackId: 'test',
        completed: true,
        clearTime: 22.0,
        targetTime: 25.0,
        falls: 0,
        restarts: 0,
      },
      baseTime + i * 25000 // spaced past cooldown
    );
    state = res.state;
  }

  assert.equal(state.tier, 1, 'Should upgrade to Demanding tier 1');
  assert.equal(state.label, 'Demanding');
  assert.ok(state.multiplier > 1.0, 'Multiplier should be > 1.0');
});

test('repeated struggle failures reduce difficulty for assistance', () => {
  let state = createInitialAdaptiveState();
  const baseTime = 100000;

  // 2 consecutive struggles
  for (let i = 0; i < DIFFICULTY_CONFIG.failureStreakThreshold; i++) {
    const res = recordAdaptiveRun(
      state,
      {
        trackId: 'test',
        completed: false,
        falls: 4,
        targetTime: 25.0,
        restarts: 2,
      },
      baseTime + i * 25000
    );
    state = res.state;
  }

  assert.equal(state.tier, -1, 'Should decrease to Comfort tier -1');
  assert.equal(state.label, 'Comfort');
  assert.ok(state.multiplier < 1.0, 'Multiplier should be < 1.0');
});

test('applyAdaptiveTrackModifications widens balance beams on forgiving tier', () => {
  let state = createInitialAdaptiveState();
  state.tier = -2;
  state.multiplier = 0.85;

  const modified = applyAdaptiveTrackModifications(testTrack, state);

  assert.ok(
    modified.segments[0].width > testTrack.segments[0].width,
    'Balance beam width should expand on forgiving tier'
  );

  const hammer = modified.obstacles[0] as any;
  assert.ok(
    hammer.speed < (testTrack.obstacles[0] as any).speed,
    'Hammer speed should be reduced on forgiving tier'
  );
});

test('disabling adaptive difficulty preserves exact original track parameters', () => {
  let state = createInitialAdaptiveState();
  state.enabled = false;
  state.tier = -2;

  const modified = applyAdaptiveTrackModifications(testTrack, state);
  assert.equal(modified.segments[0].width, testTrack.segments[0].width);
});
