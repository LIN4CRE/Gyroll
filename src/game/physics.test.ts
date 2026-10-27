import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBallState,
  getGroundAt,
  handleRailCollisions,
  stepPhysics,
  calculateStars,
  GRAVITY,
} from './physics';
import { TrackDefinition } from './types';

const mockTrack: TrackDefinition = {
  id: 'test_track',
  name: 'Test Track',
  difficulty: 'Easy',
  description: 'Test',
  themeColor: '#00ffff',
  targetTimes: { gold: 20, silver: 30, bronze: 45 },
  rewardCoins: 100,
  spawnPoint: { x: 0, y: 0, z: 0 },
  finishZ: -100,
  segments: [
    {
      id: 'seg_1',
      startX: 0,
      startY: 0,
      startZ: 10,
      endX: 0,
      endY: 0,
      endZ: -50,
      width: 4,
      surface: 'normal',
      hasRails: true,
      railHeight: 1.0,
    },
    {
      id: 'seg_2',
      startX: 0,
      startY: 0,
      startZ: -50,
      endX: 0,
      endY: -5,
      endZ: -100,
      width: 3,
      surface: 'boost',
      hasRails: false,
    },
  ],
  obstacles: [
    {
      id: 'cp_1',
      type: 'checkpoint',
      index: 1,
      name: 'Midpoint',
      position: { x: 0, y: 0, z: -30 },
      size: { x: 4, y: 3, z: 1 },
    },
    {
      id: 'finish_1',
      type: 'finish_gate',
      position: { x: 0, y: -5, z: -100 },
      size: { x: 4, y: 4, z: 1 },
    },
  ],
};

test('initial ball state initializes on the ground with forward momentum', () => {
  const ball = createInitialBallState(mockTrack.spawnPoint);
  assert.equal(ball.position.x, 0);
  assert.ok(ball.position.y > 0, 'Ball should spawn above 0');
  assert.equal(ball.position.z, 0);
  assert.equal(ball.fallsCount, 0);
  assert.equal(ball.isRecovering, false);
});

test('getGroundAt detects ground collision inside track segment width', () => {
  const ground = getGroundAt({ x: 0, y: 0.5, z: -10 }, 0.5, mockTrack.segments);
  assert.ok(ground !== null, 'Ground should be detected');
  assert.equal(ground?.surface, 'normal');
  assert.equal(ground?.groundY, 0);

  // Outside width (width is 4, so half-width is 2)
  const offTrack = getGroundAt({ x: 5, y: 0.5, z: -10 }, 0.5, mockTrack.segments);
  assert.equal(offTrack, null, 'Should return null when ball is off track lateral edge');
});

test('handleRailCollisions bounces ball back when hitting side rails', () => {
  const ball = createInitialBallState(mockTrack.spawnPoint);
  ball.position = { x: -2.3, y: 0.5, z: -10 }; // Left of width 4 (half-width 2)
  ball.velocity = { x: -5, y: 0, z: -10 };

  const hit = handleRailCollisions(ball, mockTrack.segments);
  assert.equal(hit, true, 'Rail collision should register');
  assert.ok(ball.position.x >= -2.0, 'Ball should be pushed inside track');
  assert.ok(ball.velocity.x > 0, 'Velocity should invert to positive X');
});

test('stepPhysics advances forward and updates angular velocity', () => {
  const ball = createInitialBallState(mockTrack.spawnPoint);
  const initialZ = ball.position.z;

  const result = stepPhysics(
    ball,
    { steer: 0, throttle: 0, brake: false, resetRequested: false },
    mockTrack,
    0.016,
    0.016
  );

  assert.ok(result.state.position.z < initialZ, 'Ball should advance forward (-Z direction)');
  assert.ok(result.state.angularVelocity.x > 0, 'Angular velocity around X should match rolling forward');
});

test('stepPhysics steers ball when steer input is provided', () => {
  const ball = createInitialBallState(mockTrack.spawnPoint);
  const result = stepPhysics(
    ball,
    { steer: 1.0, throttle: 0, brake: false, resetRequested: false },
    mockTrack,
    0.05,
    0.05
  );

  assert.ok(result.state.velocity.x > 0, 'Positive steer should move ball to positive X');
});

test('stepPhysics triggers checkpoint event when passing checkpoint', () => {
  const ball = createInitialBallState(mockTrack.spawnPoint);
  ball.position = { x: 0, y: 0.5, z: -29.5 };

  const result = stepPhysics(
    ball,
    { steer: 0, throttle: 0, brake: false, resetRequested: false },
    mockTrack,
    0.05,
    1.0
  );

  const hasCheckpointEvent = result.events.some((e) => e.type === 'checkpoint');
  assert.ok(hasCheckpointEvent, 'Should trigger checkpoint collision event');
  assert.equal(result.state.lastCheckpointIndex, 1);
});

test('stepPhysics handles falling off track and initiates recovery', () => {
  const ball = createInitialBallState(mockTrack.spawnPoint);
  ball.position = { x: 0, y: -13, z: -20 }; // in the void

  const result = stepPhysics(
    ball,
    { steer: 0, throttle: 0, brake: false, resetRequested: false },
    mockTrack,
    0.016,
    1.0
  );

  assert.equal(result.state.fallsCount, 1);
  assert.equal(result.state.isRecovering, true);
  const hasFallEvent = result.events.some((e) => e.type === 'fall');
  assert.ok(hasFallEvent, 'Should emit fall event');
});

test('calculateStars awards correct medals based on time and falls', () => {
  // Gold: <= 20s and 0 falls
  const gold = calculateStars(18.5, 0, mockTrack.targetTimes);
  assert.equal(gold.stars, 3);
  assert.equal(gold.isGold, true);

  // Silver: <= 30s and <= 1 fall, but missed gold
  const silver = calculateStars(25.0, 1, mockTrack.targetTimes);
  assert.equal(silver.stars, 2);
  assert.equal(silver.isSilver, true);

  // Bronze: <= 45s
  const bronze = calculateStars(38.0, 3, mockTrack.targetTimes);
  assert.equal(bronze.stars, 1);
  assert.equal(bronze.isBronze, true);
});

test('getGroundAt and stepPhysics prevent ball from rolling through track floor', () => {
  const ball = createInitialBallState(mockTrack.spawnPoint);
  // Simulate ball having dipped below ground surface (e.g. y = -0.5 on a surface at y = 0)
  ball.position = { x: 0, y: -0.5, z: -15 };
  ball.velocity = { x: 0, y: -8, z: -10 };

  const ground = getGroundAt(ball.position, ball.radius, mockTrack.segments);
  assert.ok(ground !== null, 'Ground must be detected even when ball has penetrated below surface');
  assert.ok(ground!.penetration > 0, 'Penetration should be positive');

  const result = stepPhysics(
    ball,
    { steer: 0, throttle: 0, brake: false, resetRequested: false },
    mockTrack,
    0.016,
    0.016
  );

  // Ball should be clamped cleanly onto track surface (y = groundY + radius = 0 + 0.5 = 0.5)
  assert.equal(result.state.position.y, 0.5, 'Ball position Y must be snapped cleanly to surface');
  assert.equal(result.state.velocity.y, 0, 'Downward Y velocity must be zeroed on surface');
  assert.equal(result.state.onGround, true, 'Ball must be on ground');
});

test('stepPhysics respects speed limits and prevents uncontrollable runaway speed', () => {
  const ball = createInitialBallState(mockTrack.spawnPoint);
  ball.position = { x: 0, y: 0.5, z: -10 };
  ball.velocity = { x: 0, y: 0, z: -50 }; // Excessive forward velocity

  const result = stepPhysics(
    ball,
    { steer: 0, throttle: 1.0, brake: false, resetRequested: false },
    mockTrack,
    0.016,
    0.016
  );

  // Ball forward velocity must be clamped to MAX_FORWARD_SPEED (-12.0)
  assert.ok(
    result.state.velocity.z >= -12.0,
    `Forward velocity (${result.state.velocity.z}) must not exceed MAX_FORWARD_SPEED (-12.0)`
  );
});

