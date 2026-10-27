import {
  BallPhysicsState,
  Obstacle,
  PlayerInput,
  TrackDefinition,
  TrackSegment,
  Vector3D,
} from './types';

export const GRAVITY = -24;
export const DEFAULT_BALL_RADIUS = 0.5;
export const DEFAULT_BALL_MASS = 1.0;
export const BASE_FORWARD_ACCEL = 14;
export const MAX_FORWARD_SPEED = 24;
export const STEER_FORCE = 32;
export const MAX_LATERAL_SPEED = 14;
export const ROLLING_FRICTION = 0.985;
export const ICE_FRICTION = 0.998;
export const AIR_DRAG = 0.992;
export const RESTITUTION = 0.35; // bounce factor

export function createInitialBallState(spawnPoint: Vector3D): BallPhysicsState {
  return {
    position: { x: spawnPoint.x, y: spawnPoint.y + DEFAULT_BALL_RADIUS + 0.1, z: spawnPoint.z },
    velocity: { x: 0, y: 0, z: -2.0 },
    angularVelocity: { x: 2.0 / DEFAULT_BALL_RADIUS, y: 0, z: 0 },
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

export interface CollisionEvent {
  type: 'obstacle' | 'checkpoint' | 'finish' | 'bounce' | 'boost' | 'fall';
  position: Vector3D;
  obstacleId?: string;
  intensity?: number;
}

export interface PhysicsStepResult {
  state: BallPhysicsState;
  events: CollisionEvent[];
}

/**
 * Checks if the ball is touching or intersecting a track segment
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
  for (const seg of segments) {
    // Segments extend from start to end along Z (typically startZ > endZ as we go in -Z direction)
    const minZ = Math.min(seg.startZ, seg.endZ) - 0.2;
    const maxZ = Math.max(seg.startZ, seg.endZ) + 0.2;

    if (position.z >= minZ && position.z <= maxZ) {
      // Calculate fraction along segment
      const zRange = seg.endZ - seg.startZ;
      const t = Math.abs(zRange) > 0.001 ? (position.z - seg.startZ) / zRange : 0;
      const clampedT = Math.max(0, Math.min(1, t));

      const segCenterX = seg.startX + clampedT * (seg.endX - seg.startX);
      const segY = seg.startY + clampedT * (seg.endY - seg.startY);

      const halfWidth = seg.width / 2;
      const distFromCenter = Math.abs(position.x - segCenterX);

      if (distFromCenter <= halfWidth + radius * 0.4) {
        // Compute segment normal
        const dy = seg.endY - seg.startY;
        const dz = seg.endZ - seg.startZ;
        const len = Math.hypot(dy, dz);
        const ny = len > 0.001 ? Math.abs(dz) / len : 1;
        const nz = len > 0.001 ? -dy / len : 0;

        const surfaceY = segY;
        const targetBallY = surfaceY + radius;
        const penetration = targetBallY - position.y;

        // Ground detection threshold
        if (penetration >= -0.2 && penetration <= 1.2) {
          return {
            groundY: surfaceY,
            normal: { x: 0, y: ny, z: nz },
            surface: seg.surface,
            segment: seg,
            penetration,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Handle side barrier / rail collisions
 */
export function handleRailCollisions(
  state: BallPhysicsState,
  segments: TrackSegment[]
): boolean {
  let hitRail = false;
  for (const seg of segments) {
    if (!seg.hasRails) continue;

    const minZ = Math.min(seg.startZ, seg.endZ);
    const maxZ = Math.max(seg.startZ, seg.endZ);

    if (state.position.z >= minZ && state.position.z <= maxZ) {
      const zRange = seg.endZ - seg.startZ;
      const t = Math.abs(zRange) > 0.001 ? (state.position.z - seg.startZ) / zRange : 0;
      const clampedT = Math.max(0, Math.min(1, t));
      const segCenterX = seg.startX + clampedT * (seg.endX - seg.startX);
      const segY = seg.startY + clampedT * (seg.endY - seg.startY);

      const halfWidth = seg.width / 2;
      const railH = seg.railHeight ?? 1.2;

      // Ball height relative to segment
      if (state.position.y >= segY - 0.2 && state.position.y <= segY + railH + 0.2) {
        // Left rail
        const leftRailX = segCenterX - halfWidth;
        if (state.position.x - state.radius < leftRailX) {
          state.position.x = leftRailX + state.radius;
          if (state.velocity.x < 0) {
            state.velocity.x = -state.velocity.x * RESTITUTION;
            hitRail = true;
          }
        }
        // Right rail
        const rightRailX = segCenterX + halfWidth;
        if (state.position.x + state.radius > rightRailX) {
          state.position.x = rightRailX - state.radius;
          if (state.velocity.x > 0) {
            state.velocity.x = -state.velocity.x * RESTITUTION;
            hitRail = true;
          }
        }
      }
    }
  }
  return hitRail;
}

/**
 * Evaluate obstacle collisions and movement
 */
export function checkObstacleCollisions(
  state: BallPhysicsState,
  obstacles: Obstacle[],
  elapsedTime: number
): CollisionEvent[] {
  const events: CollisionEvent[] = [];

  for (const obs of obstacles) {
    // Early Z-distance culling
    if (Math.abs(state.position.z - obs.position.z) > 10) continue;

    if (obs.type === 'checkpoint') {
      const distZ = Math.abs(state.position.z - obs.position.z);
      const distX = Math.abs(state.position.x - obs.position.x);
      const distY = Math.abs(state.position.y - obs.position.y);
      if (distZ < 1.2 && distX < obs.size.x / 2 + 0.5 && distY < obs.size.y + 0.5) {
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
      const distZ = Math.abs(state.position.z - obs.position.z);
      const distX = Math.abs(state.position.x - obs.position.x);
      if (distZ < 1.0 && distX < obs.size.x / 2 + 0.8) {
        events.push({
          type: 'finish',
          position: { ...obs.position },
          obstacleId: obs.id,
        });
      }
      continue;
    }

    if (obs.type === 'swinging_hammer') {
      // Calculate current head position
      const theta = Math.sin(elapsedTime * obs.speed + obs.phase) * obs.maxAngle;
      const pivotY = obs.position.y + obs.pivotHeight;
      const headX = obs.position.x + Math.sin(theta) * obs.armLength;
      const headY = pivotY - Math.cos(theta) * obs.armLength;
      const headZ = obs.position.z;

      const dx = state.position.x - headX;
      const dy = state.position.y - headY;
      const dz = state.position.z - headZ;
      const dist = Math.hypot(dx, dy, dz);
      const combinedRadius = state.radius + obs.headRadius;

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
      const currentAngle = obs.initialAngle + elapsedTime * obs.speed;
      const halfLen = obs.length / 2;

      // Check collision with rotating cylinder/segment
      // Segment line: pos + (cos(angle)*halfLen, 0, sin(angle)*halfLen) or in Y/Z
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

      const px = state.position.x - barStartX;
      const py = state.position.y - barStartY;
      const pz = state.position.z - barStartZ;

      const proj = segLenSq > 0 ? (px * segDx + py * segDy + pz * segDz) / segLenSq : 0;
      const clampedProj = Math.max(0, Math.min(1, proj));

      const closestX = barStartX + clampedProj * segDx;
      const closestY = barStartY + clampedProj * segDy;
      const closestZ = barStartZ + clampedProj * segDz;

      const dist = Math.hypot(
        state.position.x - closestX,
        state.position.y - closestY,
        state.position.z - closestZ
      );

      if (dist < state.radius + obs.thickness / 2) {
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
      const patrolRange = obs.patrolMaxX - obs.patrolMinX;
      const cycle = Math.sin(elapsedTime * obs.speed);
      const boulderX = obs.patrolMinX + ((cycle + 1) / 2) * patrolRange;
      const boulderY = obs.position.y + obs.radius;
      const boulderZ = obs.position.z;

      const dist = Math.hypot(
        state.position.x - boulderX,
        state.position.y - boulderY,
        state.position.z - boulderZ
      );

      if (dist < state.radius + obs.radius) {
        const dx = state.position.x - boulderX;
        const dy = state.position.y - boulderY;
        const dz = state.position.z - boulderZ;
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
      // Two vertical poles at left and right of gate
      const halfW = obs.size.x / 2;
      const leftPoleX = obs.position.x - halfW;
      const rightPoleX = obs.position.x + halfW;

      for (const poleX of [leftPoleX, rightPoleX]) {
        const dx = state.position.x - poleX;
        const dz = state.position.z - obs.position.z;
        const dist2D = Math.hypot(dx, dz);

        if (
          dist2D < state.radius + obs.poleRadius &&
          state.position.y >= obs.position.y &&
          state.position.y <= obs.position.y + obs.poleHeight
        ) {
          const d = Math.max(0.001, dist2D);
          state.velocity.x = (dx / d) * 8;
          state.velocity.z = (dz / d) * 8;

          events.push({
            type: 'obstacle',
            position: { x: poleX, y: state.position.y, z: obs.position.z },
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
 * Main physics step with fixed delta time sub-stepping
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
        y: respawnPos.y + state.radius + 0.3,
        z: respawnPos.z,
      };
      state.velocity = { x: 0, y: 0, z: -4.0 };
      state.angularVelocity = { x: 4.0 / state.radius, y: 0, z: 0 };
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

  // Clamp dt to avoid physics blowups on background tabs
  const clampedDt = Math.min(dt, 0.05);
  // Perform 2 micro-substeps for stability
  const subSteps = 2;
  const subDt = clampedDt / subSteps;

  for (let s = 0; s < subSteps; s++) {
    // 1. Check ground support
    const groundInfo = getGroundAt(state.position, state.radius, track.segments);

    let friction = ROLLING_FRICTION;
    let surfaceType: TrackSegment['surface'] = 'normal';

    if (groundInfo) {
      state.onGround = true;
      surfaceType = groundInfo.surface;
      state.groundSurface = surfaceType;

      // Penetration resolution
      if (groundInfo.penetration > 0) {
        state.position.y += groundInfo.penetration * 0.5;
        if (state.velocity.y < 0) {
          state.velocity.y = 0;
        }
      }

      // Slope force along normal
      if (Math.abs(groundInfo.normal.z) > 0.01) {
        state.velocity.z += groundInfo.normal.z * GRAVITY * subDt;
      }

      // Surface properties
      if (surfaceType === 'ice') {
        friction = ICE_FRICTION;
      } else if (surfaceType === 'boost') {
        state.velocity.z = Math.min(state.velocity.z, -MAX_FORWARD_SPEED * 1.3);
        events.push({
          type: 'boost',
          position: { ...state.position },
        });
      } else if (surfaceType === 'bouncy') {
        state.velocity.y = 8;
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
    // Player naturally rolls forward, with tilt or throttle giving control
    let forwardAccel = BASE_FORWARD_ACCEL;
    if (input.brake) {
      forwardAccel = -BASE_FORWARD_ACCEL * 1.5;
    } else if (input.throttle > 0.05) {
      forwardAccel += input.throttle * 12;
    } else if (input.throttle < -0.05) {
      forwardAccel += input.throttle * 16;
    }

    // Only apply forward propulsion if on ground or moving forward
    if (state.onGround) {
      state.velocity.z -= forwardAccel * subDt;
      // Cap max forward speed (negative Z direction)
      if (state.velocity.z < -MAX_FORWARD_SPEED) {
        state.velocity.z = -MAX_FORWARD_SPEED;
      } else if (state.velocity.z > 2.0) {
        // Limit backward movement
        state.velocity.z = 2.0;
      }
    }

    // 4. Lateral Steering (Tilt left/right)
    const steerInput = Math.max(-1, Math.min(1, input.steer));
    const steerForce = steerInput * STEER_FORCE;

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
    state.velocity.x *= Math.pow(friction, subDt * 60);
    if (state.onGround) {
      state.velocity.z *= Math.pow(friction, subDt * 30);
    }

    // 5. Integrate Position
    state.position.x += state.velocity.x * subDt;
    state.position.y += state.velocity.y * subDt;
    state.position.z += state.velocity.z * subDt;

    // 6. Angular Velocity (Pure physical rolling rotation!)
    // Rolling condition: omega = v / R
    // Rolling along Z causes rotation around X: omega_x = -vz / R
    // Rolling along X causes rotation around Z: omega_z = vx / R
    const targetOmegaX = -state.velocity.z / state.radius;
    const targetOmegaZ = state.velocity.x / state.radius;

    state.angularVelocity.x = targetOmegaX;
    state.angularVelocity.z = targetOmegaZ;
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
