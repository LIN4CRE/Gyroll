import {
  BallPhysicsState,
  CollisionEvent,
  Obstacle,
  PlayerInput,
  TrackDefinition,
  TrackSegment,
  Vector3D,
} from './types';

export const GRAVITY = -18;
export const DEFAULT_BALL_RADIUS = 0.5;
export const DEFAULT_BALL_MASS = 1.0;
export const BASE_FORWARD_ACCEL = 10.5;
export const MAX_FORWARD_SPEED = 18.5;
export const STEER_FORCE = 26.0;
export const MAX_LATERAL_SPEED = 11.0;
export const ROLLING_FRICTION = 0.988;
export const ICE_FRICTION = 0.998;
export const AIR_DRAG = 0.994;
export const RESTITUTION = 0.35; // bounce factor

export function createInitialBallState(spawnPoint: Vector3D): BallPhysicsState {
  return {
    position: { x: spawnPoint.x, y: spawnPoint.y + DEFAULT_BALL_RADIUS, z: spawnPoint.z },
    velocity: { x: 0, y: 0, z: -3.5 },
    angularVelocity: { x: 3.5 / DEFAULT_BALL_RADIUS, y: 0, z: 0 },
    radius: DEFAULT_BALL_RADIUS,
    mass: DEFAULT_BALL_MASS,
    onGround: true,
    groundSurface: 'normal',
    lastCheckpointIndex: 0,
    fallsCount: 0,
    isRecovering: false,
    recoveryTimer: 0,
  };
}

export interface PhysicsStepResult {
  state: BallPhysicsState;
  events: CollisionEvent[];
}

/**
 * Precomputed spatial cache for track segments.
 * Eliminates repeated Math.min, Math.max, Math.hypot, and divisions per frame.
 */
interface SegmentSpatialCache {
  minZ: number;
  maxZ: number;
  startX: number;
  startY: number;
  startZ: number;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  invZRange: number;
  halfWidth: number;
  ny: number;
  nz: number;
  railH: number;
}

const segmentCacheMap = new WeakMap<TrackSegment, SegmentSpatialCache>();

function getSegmentCache(seg: TrackSegment): SegmentSpatialCache {
  let cached = segmentCacheMap.get(seg);
  if (!cached) {
    const minZ = Math.min(seg.startZ, seg.endZ) - 0.45;
    const maxZ = Math.max(seg.startZ, seg.endZ) + 0.45;
    const deltaX = seg.endX - seg.startX;
    const deltaY = seg.endY - seg.startY;
    const deltaZ = seg.endZ - seg.startZ;
    const invZRange = Math.abs(deltaZ) > 0.001 ? 1 / deltaZ : 0;
    const len = Math.hypot(deltaY, deltaZ);
    const ny = len > 0.001 ? Math.abs(deltaZ) / len : 1;
    const nz = len > 0.001 ? -deltaY / len : 0;

    cached = {
      minZ,
      maxZ,
      startX: seg.startX,
      startY: seg.startY,
      startZ: seg.startZ,
      deltaX,
      deltaY,
      deltaZ,
      invZRange,
      halfWidth: seg.width * 0.5,
      ny,
      nz,
      railH: seg.railHeight ?? 1.2,
    };
    segmentCacheMap.set(seg, cached);
  }
  return cached;
}

/**
 * Checks if the ball is touching or intersecting a track segment.
 * Includes deep penetration check (up to 3.0 units) to guarantee the ball NEVER tunnels through the floor.
 * Uses cached segment bounding boxes to skip non-candidate segments with single-instruction comparisons.
 */
export function getGroundAt(
  position: Vector3D,
  radius: number,
  segments: TrackSegment[]
): {
  groundY: number;
  normal: Vector3D;
  surface: TrackSegment['surface'];
  segment: TrackSegment;
  penetration: number;
} | null {
  let bestCandidate: {
    groundY: number;
    normal: Vector3D;
    surface: TrackSegment['surface'];
    segment: TrackSegment;
    penetration: number;
  } | null = null;
  let minAbsPenetration = Infinity;

  const pX = position.x;
  const pY = position.y;
  const pZ = position.z;
  const lateralTolerance = radius * 0.45;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const c = getSegmentCache(seg);

    // Fast bounding box reject on Z
    if (pZ < c.minZ || pZ > c.maxZ) {
      continue;
    }

    // Fraction along segment
    const t = (pZ - c.startZ) * c.invZRange;
    const clampedT = t <= 0 ? 0 : t >= 1 ? 1 : t;

    const segCenterX = c.startX + clampedT * c.deltaX;
    const distFromCenter = Math.abs(pX - segCenterX);

    // Lateral track bounds check
    if (distFromCenter <= c.halfWidth + lateralTolerance) {
      const surfaceY = c.startY + clampedT * c.deltaY;
      const targetBallY = surfaceY + radius;
      const penetration = targetBallY - pY;

      // Ground detection threshold:
      // Allow penetration up to 3.0 units to catch fast descents and prevent floor tunneling,
      // while allowing up to 0.35 units above surface to register smooth ground contact.
      if (penetration >= -0.35 && penetration <= 3.0) {
        const absPen = Math.abs(penetration);
        if (absPen < minAbsPenetration) {
          minAbsPenetration = absPen;
          bestCandidate = {
            groundY: surfaceY,
            normal: { x: 0, y: c.ny, z: c.nz },
            surface: seg.surface,
            segment: seg,
            penetration,
          };
        }
      }
    }
  }

  return bestCandidate;
}

/**
 * Handle side barrier / rail collisions with strict clamping and spatial culling
 */
export function handleRailCollisions(
  state: BallPhysicsState,
  segments: TrackSegment[]
): boolean {
  let hitRail = false;
  const pX = state.position.x;
  const pY = state.position.y;
  const pZ = state.position.z;
  const radius = state.radius;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.hasRails) continue;

    const c = getSegmentCache(seg);
    if (pZ < c.minZ || pZ > c.maxZ) continue;

    const t = (pZ - c.startZ) * c.invZRange;
    const clampedT = t <= 0 ? 0 : t >= 1 ? 1 : t;
    const segCenterX = c.startX + clampedT * c.deltaX;
    const segY = c.startY + clampedT * c.deltaY;

    // Ball height relative to segment
    if (pY >= segY - 0.5 && pY <= segY + c.railH + 0.6) {
      // Left rail
      const leftRailX = segCenterX - c.halfWidth;
      if (pX - radius < leftRailX) {
        state.position.x = leftRailX + radius;
        if (state.velocity.x < 0) {
          state.velocity.x = -state.velocity.x * RESTITUTION;
          hitRail = true;
        }
      }
      // Right rail
      const rightRailX = segCenterX + c.halfWidth;
      if (pX + radius > rightRailX) {
        state.position.x = rightRailX - radius;
        if (state.velocity.x > 0) {
          state.velocity.x = -state.velocity.x * RESTITUTION;
          hitRail = true;
        }
      }
    }
  }
  return hitRail;
}

/**
 * Evaluate obstacle collisions and movement with tight spatial culling
 */
export function checkObstacleCollisions(
  state: BallPhysicsState,
  obstacles: Obstacle[],
  elapsedTime: number
): CollisionEvent[] {
  const events: CollisionEvent[] = [];
  const pX = state.position.x;
  const pY = state.position.y;
  const pZ = state.position.z;
  const radius = state.radius;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const dZ = Math.abs(pZ - obs.position.z);

    if (obs.type === 'checkpoint') {
      if (dZ > 1.5) continue;
      const distX = Math.abs(pX - obs.position.x);
      const distY = Math.abs(pY - obs.position.y);
      if (dZ < 1.2 && distX < obs.size.x * 0.5 + 0.5 && distY < obs.size.y + 0.5) {
        if (state.lastCheckpointIndex < obs.index) {
          state.lastCheckpointIndex = obs.index;
          events.push({
            type: 'checkpoint',
            position: { ...obs.position },
            obstacleId: obs.id,
          });
        }
      }
      continue;
    }

    if (obs.type === 'finish_gate') {
      if (dZ > 1.5) continue;
      const distX = Math.abs(pX - obs.position.x);
      if (dZ < 1.0 && distX < obs.size.x * 0.5 + 0.8) {
        events.push({
          type: 'finish',
          position: { ...obs.position },
          obstacleId: obs.id,
        });
      }
      continue;
    }

    if (obs.type === 'swinging_hammer') {
      // Early cull: hammer head only extends by headRadius along Z; arm swings in X/Y plane
      const maxReachZ = obs.headRadius + radius + 0.4;
      if (dZ > maxReachZ) continue;

      const maxReachX = obs.armLength + obs.headRadius + radius + 0.4;
      if (Math.abs(pX - obs.position.x) > maxReachX) continue;

      // Calculate current head position
      const theta = Math.sin(elapsedTime * obs.speed + obs.phase) * obs.maxAngle;
      const pivotY = obs.position.y + obs.pivotHeight;
      const headX = obs.position.x + Math.sin(theta) * obs.armLength;
      const headY = pivotY - Math.cos(theta) * obs.armLength;
      const headZ = obs.position.z;

      const dx = pX - headX;
      const dy = pY - headY;
      const dz = pZ - headZ;
      const dist = Math.hypot(dx, dy, dz);
      const combinedRadius = radius + obs.headRadius;

      if (dist < combinedRadius) {
        // Tangential hammer velocity for kinetic push
        const angVel = Math.cos(elapsedTime * obs.speed + obs.phase) * obs.maxAngle * obs.speed;
        const hammerVx = angVel * obs.armLength * Math.cos(theta);

        // Repel ball away
        const nx = dist > 0.001 ? dx / dist : 1;
        const ny = dist > 0.001 ? dy / dist : 0.5;
        const nz = dist > 0.001 ? dz / dist : 0;

        const impulse = 12;
        state.velocity.x += nx * impulse + hammerVx * 0.8;
        state.velocity.y += Math.max(4, ny * impulse);
        state.velocity.z += nz * impulse;

        events.push({
          type: 'obstacle',
          position: { x: headX, y: headY, z: headZ },
          obstacleId: obs.id,
          intensity: 1.0,
        });
      }
      continue;
    }

    if (obs.type === 'rotating_bar') {
      const halfLen = obs.length * 0.5;
      const maxReach = halfLen + radius + obs.thickness * 0.5 + 0.2;
      if (dZ > maxReach) continue;
      if (Math.abs(pX - obs.position.x) > maxReach) continue;

      const currentAngle = obs.initialAngle + elapsedTime * obs.speed;
      const cosA = Math.cos(currentAngle);
      const sinA = Math.sin(currentAngle);

      let barStartX: number, barStartY: number, barStartZ: number;
      let barEndX: number, barEndY: number, barEndZ: number;

      if (obs.axis === 'y') {
        barStartX = obs.position.x - cosA * halfLen;
        barStartY = obs.position.y;
        barStartZ = obs.position.z - sinA * halfLen;
        barEndX = obs.position.x + cosA * halfLen;
        barEndY = obs.position.y;
        barEndZ = obs.position.z + sinA * halfLen;
      } else {
        barStartX = obs.position.x - cosA * halfLen;
        barStartY = obs.position.y - sinA * halfLen;
        barStartZ = obs.position.z;
        barEndX = obs.position.x + cosA * halfLen;
        barEndY = obs.position.y + sinA * halfLen;
        barEndZ = obs.position.z;
      }

      // Distance from ball center to line segment
      const segDx = barEndX - barStartX;
      const segDy = barEndY - barStartY;
      const segDz = barEndZ - barStartZ;
      const segLenSq = segDx * segDx + segDy * segDy + segDz * segDz;

      const px = pX - barStartX;
      const py = pY - barStartY;
      const pz = pZ - barStartZ;

      const proj = segLenSq > 0 ? (px * segDx + py * segDy + pz * segDz) / segLenSq : 0;
      const clampedProj = proj <= 0 ? 0 : proj >= 1 ? 1 : proj;

      const closestX = barStartX + clampedProj * segDx;
      const closestY = barStartY + clampedProj * segDy;
      const closestZ = barStartZ + clampedProj * segDz;

      const dist = Math.hypot(pX - closestX, pY - closestY, pZ - closestZ);

      if (dist < radius + obs.thickness * 0.5) {
        // Tangential kick
        const pushDirX = -sinA * Math.sign(obs.speed);
        const pushDirZ = cosA * Math.sign(obs.speed);

        state.velocity.x += pushDirX * 10;
        state.velocity.y += 5;
        state.velocity.z += pushDirZ * 6;

        events.push({
          type: 'obstacle',
          position: { x: closestX, y: closestY, z: closestZ },
          obstacleId: obs.id,
          intensity: 0.8,
        });
      }
      continue;
    }

    if (obs.type === 'rolling_boulder') {
      const maxZReach = obs.radius + radius + 0.5;
      if (dZ > maxZReach) continue;

      const patrolRange = obs.patrolMaxX - obs.patrolMinX;
      const cycle = Math.sin(elapsedTime * obs.speed);
      const boulderX = obs.patrolMinX + ((cycle + 1) * 0.5) * patrolRange;
      const boulderY = obs.position.y + obs.radius;
      const boulderZ = obs.position.z;

      const dist = Math.hypot(pX - boulderX, pY - boulderY, pZ - boulderZ);

      if (dist < radius + obs.radius) {
        const dx = pX - boulderX;
        const dy = pY - boulderY;
        const dz = pZ - boulderZ;
        const d = Math.max(0.001, dist);

        state.velocity.x = (dx / d) * 12;
        state.velocity.y = Math.max(3, (dy / d) * 10);
        state.velocity.z = (dz / d) * 10;

        events.push({
          type: 'obstacle',
          position: { x: boulderX, y: boulderY, z: boulderZ },
          obstacleId: obs.id,
          intensity: 0.9,
        });
      }
      continue;
    }

    if (obs.type === 'slalom_gate') {
      if (dZ > obs.poleRadius + radius + 0.5) continue;

      const halfW = obs.size.x * 0.5;
      const leftPoleX = obs.position.x - halfW;
      const rightPoleX = obs.position.x + halfW;

      for (const poleX of [leftPoleX, rightPoleX]) {
        const dx = pX - poleX;
        const dz = pZ - obs.position.z;
        const dist2D = Math.hypot(dx, dz);

        if (
          dist2D < radius + obs.poleRadius &&
          pY >= obs.position.y &&
          pY <= obs.position.y + obs.poleHeight
        ) {
          const d = Math.max(0.001, dist2D);
          state.velocity.x = (dx / d) * 8;
          state.velocity.z = (dz / d) * 8;

          events.push({
            type: 'obstacle',
            position: { x: poleX, y: pY, z: obs.position.z },
            obstacleId: obs.id,
            intensity: 0.6,
          });
        }
      }
    }
  }

  return events;
}

/**
 * Main physics step with adaptive sub-step integration and low-latency collision resolution
 */
export function stepPhysics(
  state: BallPhysicsState,
  input: PlayerInput,
  track: TrackDefinition,
  dt: number,
  elapsedTime: number
): PhysicsStepResult {
  const events: CollisionEvent[] = [];

  // If in recovery, decrement timer and freeze physics
  if (state.isRecovering) {
    state.recoveryTimer -= dt;
    if (state.recoveryTimer <= 0) {
      state.isRecovering = false;
      // Reset position to last checkpoint
      const checkpointObstacle = track.obstacles.find(
        (o) => o.type === 'checkpoint' && (o as any).index === state.lastCheckpointIndex
      );
      const respawnPos = checkpointObstacle ? checkpointObstacle.position : track.spawnPoint;

      state.position = {
        x: respawnPos.x,
        y: respawnPos.y + state.radius + 0.15,
        z: respawnPos.z,
      };
      state.velocity = { x: 0, y: 0, z: -3.5 };
      state.angularVelocity = { x: 3.5 / state.radius, y: 0, z: 0 };
      state.onGround = true;
    }
    return { state, events };
  }

  // Check fall into void
  if (state.position.y < -12) {
    state.fallsCount++;
    state.isRecovering = true;
    state.recoveryTimer = 0.8;
    events.push({
      type: 'fall',
      position: { ...state.position },
    });
    return { state, events };
  }

  // Clamp dt to avoid spiral of death on background tabs or system lag spikes
  const clampedDt = Math.min(dt, 0.05);

  // Adaptive sub-step integration:
  // At high/normal framerates (dt <= 0.018s, ~60-120fps), 1 step is fast, rock-solid, and halves CPU usage.
  // When frame time drops on lower-end devices (dt > 0.018s), 2 sub-steps maintain precision and prevent tunneling.
  const subSteps = clampedDt > 0.018 ? 2 : 1;
  const subDt = clampedDt / subSteps;

  // Initial ground check for the first sub-step
  let groundInfo = getGroundAt(state.position, state.radius, track.segments);

  for (let s = 0; s < subSteps; s++) {
    let friction = ROLLING_FRICTION;
    let surfaceType: TrackSegment['surface'] = 'normal';

    if (groundInfo) {
      state.onGround = true;
      surfaceType = groundInfo.surface;
      state.groundSurface = surfaceType;

      // Clean penetration resolution: snap ball firmly onto the track surface (no mushy sinking)
      if (groundInfo.penetration > 0) {
        state.position.y = groundInfo.groundY + state.radius;
        if (state.velocity.y < 0) {
          state.velocity.y = 0;
        }
      }

      // Slope force along normal (damped so ball does not wildly accelerate downhill)
      if (Math.abs(groundInfo.normal.z) > 0.01) {
        state.velocity.z += groundInfo.normal.z * (GRAVITY * 0.5) * subDt;
      }

      // Surface properties
      if (surfaceType === 'ice') {
        friction = ICE_FRICTION;
      } else if (surfaceType === 'boost') {
        state.velocity.z = Math.min(state.velocity.z, -MAX_FORWARD_SPEED * 1.35);
        events.push({
          type: 'boost',
          position: { ...state.position },
        });
      } else if (surfaceType === 'bouncy') {
        state.velocity.y = 7.0;
        state.onGround = false;
        events.push({
          type: 'bounce',
          position: { ...state.position },
        });
      }
    } else {
      state.onGround = false;
      friction = AIR_DRAG;
      state.groundSurface = undefined;
    }

    // 2. Apply Gravity
    if (!state.onGround) {
      state.velocity.y += GRAVITY * subDt;
    }

    // 3. Forward rolling propulsion
    let forwardAccel = BASE_FORWARD_ACCEL;
    if (input.brake) {
      forwardAccel = -BASE_FORWARD_ACCEL * 1.8;
    } else if (input.throttle > 0.05) {
      forwardAccel += input.throttle * 8;
    } else if (input.throttle < -0.05) {
      forwardAccel += input.throttle * 10;
    }

    // Only apply forward propulsion if on ground
    if (state.onGround) {
      state.velocity.z -= forwardAccel * subDt;
      // Cap max forward speed (negative Z direction)
      const dynamicMax = input.throttle > 0.1 ? MAX_FORWARD_SPEED * 1.2 : MAX_FORWARD_SPEED;
      if (state.velocity.z < -dynamicMax) {
        state.velocity.z = -dynamicMax;
      } else if (state.velocity.z > 2.0) {
        // Limit backward movement
        state.velocity.z = 2.0;
      }
    }

    // 4. Lateral Steering (Snappy and responsive on mobile and keyboard)
    const steerInput = Math.max(-1, Math.min(1, input.steer));
    let steerForce = steerInput * STEER_FORCE;

    // Counter-steer responsiveness boost: if player reverses steering direction, provide snappy recovery
    if (steerInput * state.velocity.x < -0.1) {
      steerForce *= 1.25;
    }

    if (state.onGround) {
      const tractionFactor = surfaceType === 'ice' ? 0.25 : 1.0;
      state.velocity.x += steerForce * tractionFactor * subDt;
    } else {
      // In air, subtle air control
      state.velocity.x += steerForce * 0.3 * subDt;
    }

    // Clamp lateral speed
    state.velocity.x = Math.max(
      -MAX_LATERAL_SPEED,
      Math.min(MAX_LATERAL_SPEED, state.velocity.x)
    );

    // Apply friction/drag
    const frictionFactorX = Math.pow(friction, subDt * 60);
    state.velocity.x *= frictionFactorX;

    // Extra center-stabilization when neutral steer on ground: prevents annoying slow drift
    if (state.onGround && Math.abs(steerInput) < 0.05 && surfaceType !== 'ice') {
      state.velocity.x *= 0.98;
    }

    if (state.onGround) {
      const frictionFactorZ = Math.pow(friction, subDt * 30);
      state.velocity.z *= frictionFactorZ;
    }

    // 5. Integrate Position
    state.position.x += state.velocity.x * subDt;
    state.position.y += state.velocity.y * subDt;
    state.position.z += state.velocity.z * subDt;

    // Continuous post-integration ground snap: guarantees ball never tunnels through floor
    const postGround = getGroundAt(state.position, state.radius, track.segments);
    if (postGround && postGround.penetration > 0 && state.velocity.y <= 0.1) {
      state.position.y = postGround.groundY + state.radius;
      state.velocity.y = 0;
      state.onGround = true;
      state.groundSurface = postGround.surface;
    }
    // Carry over resolved ground state to subsequent sub-step without redundant search
    groundInfo = postGround;

    // 6. Angular Velocity (Pure physical rolling rotation)
    state.angularVelocity.x = -state.velocity.z / state.radius;
    state.angularVelocity.z = state.velocity.x / state.radius;
    state.angularVelocity.y *= 0.95; // damp yaw

    // 7. Check Rails
    const hitRail = handleRailCollisions(state, track.segments);
    if (hitRail) {
      events.push({
        type: 'obstacle',
        position: { ...state.position },
        intensity: 0.4,
      });
    }

    // 8. Check Obstacle Collisions
    const obsEvents = checkObstacleCollisions(state, track.obstacles, elapsedTime);
    if (obsEvents.length > 0) {
      events.push(...obsEvents);
    }
  }

  return { state, events };
}

/**
 * Calculates Stars (1-3) based on completion time and falls
 */
export function calculateStars(
  clearTime: number,
  falls: number,
  targetTimes: TrackDefinition['targetTimes']
): { stars: number; isGold: boolean; isSilver: boolean; isBronze: boolean } {
  let stars = 1;
  const isGold = clearTime <= targetTimes.gold && falls === 0;
  const isSilver = clearTime <= targetTimes.silver && falls <= 1;
  const isBronze = clearTime <= targetTimes.bronze;

  if (isGold) {
    stars = 3;
  } else if (isSilver) {
    stars = 2;
  } else if (isBronze) {
    stars = 1;
  } else {
    stars = 1; // Base completion star
  }

  return { stars, isGold, isSilver, isBronze };
}
