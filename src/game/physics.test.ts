import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBallState,
  getGroundAt,
  handleRailCollisions,
  stepPhysics,
  calculateStars,
  GRAVITY,
  MAX_FORWARD_SPEED,
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

  // Ball forward velocity must be clamped to dynamic max forward speed
  const expectedMax = MAX_FORWARD_SPEED * 1.25;
  assert.ok(
    result.state.velocity.z >= -expectedMax,
    `Forward velocity (${result.state.velocity.z}) must not exceed dynamic limit (-${expectedMax})`
  );
});

test('getGroundAt accurately tracks angled chicane centerline', () => {
  const angledTrack: TrackDefinition = {
    ...mockTrack,
    segments: [
      {
        id: 'chicane',
        startX: 0,
        startY: 0,
        startZ: 0,
        endX: -4,
        endY: 0,
        endZ: -40,
        width: 4,
        surface: 'normal',
        hasRails: false,
      },
    ],
  };

  // At z = -20 (halfway), center X is -2. Ball at x = -2 must be on ground
  const groundCenter = getGroundAt({ x: -2, y: 0.5, z: -20 }, 0.5, angledTrack.segments);
  assert.ok(groundCenter !== null, 'Center of angled segment must register ground');

  // Ball at x = 0 at z = -20 is 2 units away from centerline (edge of width 4)
  const groundEdge = getGroundAt({ x: 0, y: 0.5, z: -20 }, 0.5, angledTrack.segments);
  assert.ok(groundEdge !== null, 'Near edge of angled segment must register ground');

  // Ball at x = 3 at z = -20 is 5 units away, off-track
  const groundOff = getGroundAt({ x: 3, y: 0.5, z: -20 }, 0.5, angledTrack.segments);
  assert.equal(groundOff, null, 'Beyond width of angled segment must be null');
});

test('Round 2 (Neon Citadel) initializes cleanly on ground and rolls forward without freezing', async () => {
  const { TRACKS } = await import('./tracks');
  const track2 = TRACKS[1];
  assert.equal(track2.id, 'neon_citadel');

  const ball = createInitialBallState(track2.spawnPoint);
  assert.equal(ball.onGround, true);
  assert.equal(ball.position.x, track2.spawnPoint.x);
  assert.equal(ball.position.z, track2.spawnPoint.z);

  // Advance several physics steps on Track 2
  let current = ball;
  for (let i = 0; i < 30; i++) {
    const res = stepPhysics(
      current,
      { steer: 0, throttle: 0, brake: false, resetRequested: false },
      track2,
      0.016,
      i * 0.016
    );
    current = res.state;
  }

  // Ensure ball has progressed forward in negative Z and is not frozen
  assert.ok(
    current.position.z < track2.spawnPoint.z - 1.0,
    `Ball must advance forward along track 2 (current Z: ${current.position.z}, spawn Z: ${track2.spawnPoint.z})`
  );
  assert.ok(current.velocity.z < -2.0, 'Ball must maintain forward velocity');
  assert.equal(current.onGround, true, 'Ball must maintain ground contact on track 2');
});

