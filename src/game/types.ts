export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BallPhysicsState {
  position: Vector3D;
  velocity: Vector3D;
  angularVelocity: Vector3D;
  radius: number;
  mass: number;
  onGround: boolean;
  groundSurface?: SurfaceType;
  lastCheckpointIndex: number;
  fallsCount: number;
  isRecovering: boolean;
  recoveryTimer: number;
}

export type SurfaceType = 'normal' | 'boost' | 'ice' | 'bouncy';

export type ObstacleType =
  | 'balance_beam'
  | 'moving_platform'
  | 'swinging_hammer'
  | 'rotating_bar'
  | 'rolling_boulder'
  | 'slalom_gate'
  | 'ramp'
  | 'checkpoint'
  | 'finish_gate';

export interface BaseObstacle {
  id: string;
  type: ObstacleType;
  position: Vector3D;
  size: Vector3D; // width (x), height (y), length (z)
  rotation?: Vector3D; // in radians
}

export interface MovingPlatformObstacle extends BaseObstacle {
  type: 'moving_platform';
  axis: 'x' | 'y' | 'z';
  amplitude: number;
  speed: number;
  initialOffset: number;
}

export interface SwingingHammerObstacle extends BaseObstacle {
  type: 'swinging_hammer';
  pivotHeight: number;
  armLength: number;
  headRadius: number;
  speed: number;
  phase: number;
  maxAngle: number;
}

export interface RotatingBarObstacle extends BaseObstacle {
  type: 'rotating_bar';
  length: number;
  thickness: number;
  speed: number;
  initialAngle: number;
  axis: 'y' | 'z';
}

export interface RollingBoulderObstacle extends BaseObstacle {
  type: 'rolling_boulder';
  radius: number;
  patrolMinX: number;
  patrolMaxX: number;
  speed: number;
}

export interface SlalomGateObstacle extends BaseObstacle {
  type: 'slalom_gate';
  poleRadius: number;
  poleHeight: number;
  passSide: 'left' | 'right' | 'center';
}

export interface RampObstacle extends BaseObstacle {
  type: 'ramp';
  inclineAngle: number; // degrees
  boostMultiplier?: number;
}

export interface CheckpointObstacle extends BaseObstacle {
  type: 'checkpoint';
  index: number;
  name: string;
}

export interface FinishGateObstacle extends BaseObstacle {
  type: 'finish_gate';
}

export type Obstacle =
  | BaseObstacle
  | MovingPlatformObstacle
  | SwingingHammerObstacle
  | RotatingBarObstacle
  | RollingBoulderObstacle
  | SlalomGateObstacle
  | RampObstacle
  | CheckpointObstacle
  | FinishGateObstacle;

export interface TrackSegment {
  id: string;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  width: number;
  surface: SurfaceType;
  hasRails: boolean;
  railHeight?: number;
  bankAngle?: number; // radians
}

export interface TrackDefinition {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  themeColor: string;
  targetTimes: {
    gold: number;
    silver: number;
    bronze: number;
  };
  rewardCoins: number;
  spawnPoint: Vector3D;
  finishZ: number;
  segments: TrackSegment[];
  obstacles: Obstacle[];
}

export interface BallSkin {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  roughness: number;
  metalness: number;
  color: string;
  emissive: string;
  pattern: 'chrome' | 'cyber' | 'magma' | 'gold' | 'nebula' | 'toxic';
  description: string;
}

export interface BallTrail {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  particleColor: string;
  particleType: 'none' | 'sparkle' | 'neon' | 'flame' | 'plasma';
  description: string;
}

export interface UserProgress {
  coins: number;
  selectedSkinId: string;
  selectedTrailId: string;
  unlockedSkins: string[];
  unlockedTrails: string[];
  trackRecords: Record<
    string,
    {
      completed: boolean;
      bestTime: number; // seconds
      stars: number; // 1-3
      zeroFalls: boolean;
    }
  >;
  settings: {
    sensitivity: number; // 0.5 to 2.5
    deadzone: number; // 0.0 to 0.3
    invertSteering: boolean;
    controlMode: 'auto' | 'gyro' | 'touch_slider' | 'touch_buttons';
    sfxVolume: number;
    engineVolume: number;
    musicVolume: number;
    isMuted: boolean;
    graphicsQuality: 'high' | 'medium' | 'low';
    neutralGamma: number;
    neutralBeta: number;
  };
}

export interface PlayerInput {
  steer: number; // -1 (left) to 1 (right)
  throttle: number; // -1 (brake) to 1 (accelerate)
  brake: boolean;
  resetRequested: boolean;
}
