import { AdaptiveDifficultyState, AdaptivePerformanceRecord, Obstacle, TrackDefinition, TrackSegment } from './types';

export const DIFFICULTY_CONFIG = {
  minTier: -2,
  maxTier: 2,
  tierMultipliers: {
    [-2]: 0.85,
    [-1]: 0.92,
    [0]: 1.0,
    [1]: 1.08,
    [2]: 1.15,
  } as Record<number, number>,
  tierLabels: {
    [-2]: 'Forgiving',
    [-1]: 'Comfort',
    [0]: 'Standard',
    [1]: 'Demanding',
    [2]: 'Expert',
  } as Record<number, AdaptiveDifficultyState['label']>,
  evaluationWindow: 6, // evaluates rolling window of last 6 attempts
  successStreakThreshold: 3, // consecutive strong completions to bump up
  failureStreakThreshold: 2, // consecutive struggles (>=3 falls or abandon) to drop down
  cooldownMs: 20000, // 20s cooldown between tier shifts
};

export function createInitialAdaptiveState(): AdaptiveDifficultyState {
  return {
    enabled: true,
    tier: 0,
    multiplier: 1.0,
    label: 'Standard',
    recentRuns: [],
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    lastAdjustmentTime: 0,
  };
}

/**
 * Evaluates a completed run or failure and updates adaptive difficulty state
 */
export function recordAdaptiveRun(
  state: AdaptiveDifficultyState,
  record: Omit<AdaptivePerformanceRecord, 'timestamp'>,
  currentTime = Date.now()
): { state: AdaptiveDifficultyState; changed: boolean } {
  if (!state.enabled) {
    return {
      state: {
        ...state,
        tier: 0,
        multiplier: 1.0,
        label: 'Standard',
      },
      changed: false,
    };
  }

  const newRecord: AdaptivePerformanceRecord = {
    ...record,
    timestamp: currentTime,
  };

  const updatedRuns = [...state.recentRuns, newRecord].slice(-DIFFICULTY_CONFIG.evaluationWindow);

  // Determine if this run was strong, neutral, or struggling
  const isCleanCompletion = record.completed && record.falls === 0;
  const isFastCompletion =
    record.completed &&
    record.clearTime !== undefined &&
    record.clearTime <= record.targetTime * 1.05;
  const isStruggle = (!record.completed && record.falls >= 3) || record.falls >= 4;

  let consecutiveSuccesses = state.consecutiveSuccesses;
  let consecutiveFailures = state.consecutiveFailures;

  if (isCleanCompletion || (record.completed && isFastCompletion && record.falls <= 1)) {
    consecutiveSuccesses += 1;
    consecutiveFailures = 0;
  } else if (isStruggle) {
    consecutiveFailures += 1;
    consecutiveSuccesses = 0;
  } else {
    // Moderate run
    consecutiveSuccesses = Math.max(0, consecutiveSuccesses - 1);
    consecutiveFailures = Math.max(0, consecutiveFailures - 1);
  }

  let newTier = state.tier;
  let changed = false;

  const canAdjust = currentTime - state.lastAdjustmentTime >= DIFFICULTY_CONFIG.cooldownMs;

  if (canAdjust) {
    if (consecutiveSuccesses >= DIFFICULTY_CONFIG.successStreakThreshold && state.tier < DIFFICULTY_CONFIG.maxTier) {
      newTier = state.tier + 1;
      consecutiveSuccesses = 0;
      changed = true;
    } else if (consecutiveFailures >= DIFFICULTY_CONFIG.failureStreakThreshold && state.tier > DIFFICULTY_CONFIG.minTier) {
      newTier = state.tier - 1;
      consecutiveFailures = 0;
      changed = true;
    }
  }

  const multiplier = DIFFICULTY_CONFIG.tierMultipliers[newTier] ?? 1.0;
  const label = DIFFICULTY_CONFIG.tierLabels[newTier] ?? 'Standard';

  const updatedState: AdaptiveDifficultyState = {
    enabled: state.enabled,
    tier: newTier,
    multiplier,
    label,
    recentRuns: updatedRuns,
    consecutiveSuccesses,
    consecutiveFailures,
    lastAdjustmentTime: changed ? currentTime : state.lastAdjustmentTime,
  };

  return { state: updatedState, changed };
}

/**
 * Applies subtle, validated modifications to track obstacles and segment margins
 * based on adaptive difficulty tier without compromising physics or track viability.
 */
export function applyAdaptiveTrackModifications(
  track: TrackDefinition,
  adaptiveState: AdaptiveDifficultyState
): TrackDefinition {
  if (!adaptiveState.enabled || adaptiveState.tier === 0) {
    return track;
  }

  const multiplier = adaptiveState.multiplier;
  const tier = adaptiveState.tier;

  // Clone track segments with subtle margin adjustment on balance beams
  const modifiedSegments: TrackSegment[] = track.segments.map((seg) => {
    // For narrow balance beams (< 2.5m wide), if player is on forgiving tier, give +0.3m breathing room
    let width = seg.width;
    if (tier < 0 && seg.width <= 2.5) {
      width = seg.width + 0.35 * Math.abs(tier);
    } else if (tier > 0 && seg.width >= 3.5) {
      // Modest precision increase for wide sections
      width = Math.max(2.6, seg.width - 0.2 * tier);
    }

    return {
      ...seg,
      width,
    };
  });

  // Modify obstacle speeds and arcs within strictly validated ranges
  const modifiedObstacles: Obstacle[] = track.obstacles.map((obs) => {
    if (obs.type === 'swinging_hammer') {
      const speed = obs.speed * multiplier;
      // In forgiving mode, reduce max angle swing by 10%
      const maxAngle = tier < 0 ? obs.maxAngle * 0.9 : obs.maxAngle;
      return {
        ...obs,
        speed,
        maxAngle,
      };
    }

    if (obs.type === 'rotating_bar') {
      const speed = obs.speed * multiplier;
      return {
        ...obs,
        speed,
      };
    }

    if (obs.type === 'rolling_boulder') {
      const speed = obs.speed * multiplier;
      return {
        ...obs,
        speed,
      };
    }

    return obs;
  });

  return {
    ...track,
    segments: modifiedSegments,
    obstacles: modifiedObstacles,
  };
}
