import {
  BallSkin,
  BallTrail,
  LeaderboardEntry,
  TrailCustomConfig,
  UserProgress,
} from './types';
import { createInitialAdaptiveState } from './adaptiveDifficulty';

export const BALL_SKINS: BallSkin[] = [
  {
    id: 'chrome',
    name: 'Classic Chrome',
    price: 0,
    unlocked: true,
    roughness: 0.08,
    metalness: 0.96,
    color: '#e2e8f0',
    emissive: '#000000',
    pattern: 'chrome',
    description: 'High-polish aerospace chrome ball reflecting environment light.',
  },
  {
    id: 'cyber',
    name: 'Cyber Grid',
    price: 200,
    unlocked: false,
    roughness: 0.2,
    metalness: 0.7,
    color: '#0f172a',
    emissive: '#06b6d4',
    pattern: 'cyber',
    description: 'Carbon fiber chassis with glowing neon cyan vector lines.',
  },
  {
    id: 'magma',
    name: 'Magma Core',
    price: 350,
    unlocked: false,
    roughness: 0.45,
    metalness: 0.4,
    color: '#261005',
    emissive: '#ff4400',
    pattern: 'magma',
    description: 'Cracked molten volcanic sphere pulsating with incandescent magma.',
  },
  {
    id: 'gold',
    name: 'Golden Orb',
    price: 500,
    unlocked: false,
    roughness: 0.14,
    metalness: 0.95,
    color: '#facc15',
    emissive: '#713f12',
    pattern: 'gold',
    description: '24-karat luxury gold sphere with brushed anisotropic luster.',
  },
  {
    id: 'nebula',
    name: 'Nebula Spark',
    price: 750,
    unlocked: false,
    roughness: 0.18,
    metalness: 0.8,
    color: '#3b0764',
    emissive: '#c084fc',
    pattern: 'nebula',
    description: 'Deep cosmic violet orb infused with swirling stardust.',
  },
  {
    id: 'toxic',
    name: 'Toxic Glow',
    price: 1000,
    unlocked: false,
    roughness: 0.3,
    metalness: 0.5,
    color: '#14532d',
    emissive: '#4ade80',
    pattern: 'toxic',
    description: 'Radioactive biohazard sphere with pulsating lime isotopes.',
  },
];

export const BALL_TRAILS: BallTrail[] = [
  {
    id: 'none',
    name: 'None',
    price: 0,
    unlocked: true,
    particleColor: '#000000',
    particleType: 'none',
    description: 'Clean rolling ball with no trailing particles.',
    unlockRequirement: 'Available by default',
    defaultConfig: {
      primaryColor: '#000000',
      secondaryColor: '#000000',
      length: 'medium',
      density: 'low',
      glowIntensity: 1.0,
      particleSize: 0.08,
    },
  },
  {
    id: 'classic',
    name: 'Classic Streak',
    price: 0,
    unlocked: true,
    particleColor: '#38bdf8',
    secondaryColor: '#93c5fd',
    particleType: 'classic',
    description: 'Clean, aerodynamic velocity streak with subtle gradient fade.',
    unlockRequirement: 'Starter trail',
    defaultConfig: {
      primaryColor: '#38bdf8',
      secondaryColor: '#93c5fd',
      length: 'medium',
      density: 'medium',
      glowIntensity: 1.0,
      particleSize: 0.08,
    },
  },
  {
    id: 'neon',
    name: 'Neon Ribbon',
    price: 200,
    unlocked: false,
    particleColor: '#06b6d4',
    secondaryColor: '#f43f5e',
    particleType: 'neon',
    description: 'Vibrant dual-color futuristic glow streams that weave naturally behind the ball.',
    unlockRequirement: '🪙 200 Coins or complete Aero Highlands',
    defaultConfig: {
      primaryColor: '#06b6d4',
      secondaryColor: '#f43f5e',
      length: 'long',
      density: 'high',
      glowIntensity: 1.4,
      particleSize: 0.09,
    },
  },
  {
    id: 'plasma',
    name: 'Plasma Flow',
    price: 350,
    unlocked: false,
    particleColor: '#a855f7',
    secondaryColor: '#ec4899',
    particleType: 'plasma',
    description: 'Animated pulsating energy rings with high-voltage core corona.',
    unlockRequirement: '🪙 350 Coins or earn 2 Gold Stars',
    defaultConfig: {
      primaryColor: '#a855f7',
      secondaryColor: '#ec4899',
      length: 'medium',
      density: 'medium',
      glowIntensity: 1.5,
      particleSize: 0.1,
    },
  },
  {
    id: 'digital',
    name: 'Digital Voxel',
    price: 450,
    unlocked: false,
    particleColor: '#22c55e',
    secondaryColor: '#10b981',
    particleType: 'digital',
    description: 'Geometric pixel bytes streaming from the ball and dissolving into cyberspace.',
    unlockRequirement: '🪙 450 Coins or achieve 1 Clean Run',
    defaultConfig: {
      primaryColor: '#22c55e',
      secondaryColor: '#10b981',
      length: 'medium',
      density: 'high',
      glowIntensity: 1.2,
      particleSize: 0.07,
    },
  },
  {
    id: 'electric',
    name: 'Electric Arc',
    price: 550,
    unlocked: false,
    particleColor: '#eab308',
    secondaryColor: '#38bdf8',
    particleType: 'electric',
    description: 'Crackling electrostatic discharges and rapid lightning sparks.',
    unlockRequirement: '🪙 550 Coins or complete Neon Citadel',
    defaultConfig: {
      primaryColor: '#eab308',
      secondaryColor: '#38bdf8',
      length: 'short',
      density: 'high',
      glowIntensity: 1.6,
      particleSize: 0.08,
    },
  },
  {
    id: 'cosmic',
    name: 'Cosmic Stardust',
    price: 700,
    unlocked: false,
    particleColor: '#f472b6',
    secondaryColor: '#818cf8',
    particleType: 'cosmic',
    description: 'Subtle twinkling stellar particles drifting gently in the gravitational wake.',
    unlockRequirement: '🪙 700 Coins or earn 5 Stars total',
    defaultConfig: {
      primaryColor: '#f472b6',
      secondaryColor: '#818cf8',
      length: 'long',
      density: 'medium',
      glowIntensity: 1.3,
      particleSize: 0.07,
    },
  },
  {
    id: 'prismatic',
    name: 'Prismatic Wave',
    price: 850,
    unlocked: false,
    particleColor: '#f59e0b',
    secondaryColor: '#06b6d4',
    particleType: 'prismatic',
    description: 'Smooth, shifting rainbow spectrum ribbon displaying all hues of light.',
    unlockRequirement: '🪙 850 Coins or complete Quantum Gauntlet',
    defaultConfig: {
      primaryColor: '#f59e0b',
      secondaryColor: '#06b6d4',
      length: 'long',
      density: 'high',
      glowIntensity: 1.5,
      particleSize: 0.09,
    },
  },
  {
    id: 'void',
    name: 'Void Eclipse',
    price: 1000,
    unlocked: false,
    particleColor: '#1e1b4b',
    secondaryColor: '#a855f7',
    particleType: 'void',
    description: 'Dark matter distortion with restrained contrasting amethyst energy bursts.',
    unlockRequirement: '🪙 1000 Coins or achieve 3 Clean Runs',
    defaultConfig: {
      primaryColor: '#1e1b4b',
      secondaryColor: '#a855f7',
      length: 'medium',
      density: 'medium',
      glowIntensity: 1.4,
      particleSize: 0.11,
    },
  },
];

const STORAGE_KEY = 'gyroroll_save_v2';

const INITIAL_LEADERBOARDS: Record<string, LeaderboardEntry[]> = {
  aero_highlands: [
    { id: 'lb_1', trackId: 'aero_highlands', playerName: 'ApexRacer', time: 19.82, date: '2026-10-20', zeroFalls: true, stars: 3 },
    { id: 'lb_2', trackId: 'aero_highlands', playerName: 'GyroKing', time: 21.15, date: '2026-10-21', zeroFalls: true, stars: 3 },
    { id: 'lb_3', trackId: 'aero_highlands', playerName: 'SkyWalker', time: 23.40, date: '2026-10-22', zeroFalls: true, stars: 2 },
    { id: 'lb_4', trackId: 'aero_highlands', playerName: 'Vector', time: 26.85, date: '2026-10-23', zeroFalls: false, stars: 2 },
    { id: 'lb_5', trackId: 'aero_highlands', playerName: 'TiltMaster', time: 30.12, date: '2026-10-24', zeroFalls: false, stars: 1 },
  ],
  neon_citadel: [
    { id: 'lb_6', trackId: 'neon_citadel', playerName: 'CyberPilot', time: 29.45, date: '2026-10-21', zeroFalls: true, stars: 3 },
    { id: 'lb_7', trackId: 'neon_citadel', playerName: 'NeonDrift', time: 31.80, date: '2026-10-22', zeroFalls: true, stars: 3 },
    { id: 'lb_8', trackId: 'neon_citadel', playerName: 'Volt', time: 35.60, date: '2026-10-23', zeroFalls: false, stars: 2 },
    { id: 'lb_9', trackId: 'neon_citadel', playerName: 'GhostBall', time: 42.10, date: '2026-10-24', zeroFalls: false, stars: 1 },
  ],
  quantum_gauntlet: [
    { id: 'lb_10', trackId: 'quantum_gauntlet', playerName: 'ZeroGrav', time: 39.20, date: '2026-10-22', zeroFalls: true, stars: 3 },
    { id: 'lb_11', trackId: 'quantum_gauntlet', playerName: 'QuantumAce', time: 41.50, date: '2026-10-23', zeroFalls: true, stars: 3 },
    { id: 'lb_12', trackId: 'quantum_gauntlet', playerName: 'SubAtomic', time: 52.30, date: '2026-10-24', zeroFalls: false, stars: 2 },
  ],
};

const DEFAULT_TRAIL_CONFIGS: Record<string, TrailCustomConfig> = {};
BALL_TRAILS.forEach((t) => {
  DEFAULT_TRAIL_CONFIGS[t.id] = { ...t.defaultConfig };
});

export const DEFAULT_USER_PROGRESS: UserProgress = {
  coins: 150, // Starter coins
  selectedSkinId: 'chrome',
  selectedTrailId: 'classic',
  unlockedSkins: ['chrome'],
  unlockedTrails: ['none', 'classic'],
  trailConfigs: DEFAULT_TRAIL_CONFIGS,
  trackRecords: {},
  leaderboards: INITIAL_LEADERBOARDS,
  adaptiveDifficulty: createInitialAdaptiveState(),
  settings: {
    sensitivity: 1.2,
    deadzone: 0.04,
    invertSteering: false,
    controlMode: 'auto',
    sfxVolume: 0.8,
    engineVolume: 0.7,
    musicVolume: 0.5,
    isMuted: false,
    graphicsQuality: 'high',
    neutralGamma: 0,
    neutralBeta: 30,
    enableAdaptiveDifficulty: true,
    enableHaptics: true,
  },
};

export function loadUserProgress(): UserProgress {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_USER_PROGRESS };
    }
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('gyroroll_save_v1');
    if (!raw) return { ...DEFAULT_USER_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_PROGRESS,
      ...parsed,
      trailConfigs: {
        ...DEFAULT_TRAIL_CONFIGS,
        ...(parsed.trailConfigs || {}),
      },
      leaderboards: {
        ...INITIAL_LEADERBOARDS,
        ...(parsed.leaderboards || {}),
      },
      adaptiveDifficulty: {
        ...createInitialAdaptiveState(),
        ...(parsed.adaptiveDifficulty || {}),
      },
      settings: {
        ...DEFAULT_USER_PROGRESS.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    return { ...DEFAULT_USER_PROGRESS };
  }
}

export function saveUserProgress(progress: UserProgress): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch (err) {
    console.warn('Failed to save progress to localStorage', err);
  }
}

export function unlockSkin(
  progress: UserProgress,
  skinId: string
): { success: boolean; progress: UserProgress; message?: string } {
  const skin = BALL_SKINS.find((s) => s.id === skinId);
  if (!skin) return { success: false, progress, message: 'Skin not found' };
  if (progress.unlockedSkins.includes(skinId)) {
    return { success: false, progress, message: 'Already unlocked' };
  }
  if (progress.coins < skin.price) {
    return { success: false, progress, message: 'Not enough coins' };
  }

  const updated: UserProgress = {
    ...progress,
    coins: progress.coins - skin.price,
    unlockedSkins: [...progress.unlockedSkins, skinId],
    selectedSkinId: skinId,
  };
  saveUserProgress(updated);
  return { success: true, progress: updated };
}

export function unlockTrail(
  progress: UserProgress,
  trailId: string
): { success: boolean; progress: UserProgress; message?: string } {
  const trail = BALL_TRAILS.find((t) => t.id === trailId);
  if (!trail) return { success: false, progress, message: 'Trail not found' };
  if (progress.unlockedTrails.includes(trailId)) {
    return { success: false, progress, message: 'Already unlocked' };
  }
  if (progress.coins < trail.price) {
    return { success: false, progress, message: 'Not enough coins' };
  }

  const updated: UserProgress = {
    ...progress,
    coins: progress.coins - trail.price,
    unlockedTrails: [...progress.unlockedTrails, trailId],
    selectedTrailId: trailId,
  };
  saveUserProgress(updated);
  return { success: true, progress: updated };
}

export function updateTrailConfig(
  progress: UserProgress,
  trailId: string,
  config: Partial<TrailCustomConfig>
): UserProgress {
  const current = progress.trailConfigs[trailId] || DEFAULT_TRAIL_CONFIGS[trailId] || DEFAULT_TRAIL_CONFIGS['classic'];
  const updatedConfigs = {
    ...progress.trailConfigs,
    [trailId]: {
      ...current,
      ...config,
    },
  };
  const updated: UserProgress = {
    ...progress,
    trailConfigs: updatedConfigs,
  };
  saveUserProgress(updated);
  return updated;
}

export function addLeaderboardEntry(
  progress: UserProgress,
  trackId: string,
  time: number,
  zeroFalls: boolean,
  stars: number,
  playerName = 'Player'
): { progress: UserProgress; rank: number } {
  const existing = progress.leaderboards[trackId] || [];
  const newEntry: LeaderboardEntry = {
    id: `lb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    trackId,
    playerName,
    time: Number(time.toFixed(2)),
    date: new Date().toISOString().split('T')[0],
    zeroFalls,
    stars,
  };

  const combined = [...existing, newEntry].sort((a, b) => a.time - b.time).slice(0, 10);
  const rank = combined.findIndex((e) => e.id === newEntry.id) + 1;

  const updatedProgress: UserProgress = {
    ...progress,
    leaderboards: {
      ...progress.leaderboards,
      [trackId]: combined,
    },
  };
  saveUserProgress(updatedProgress);
  return { progress: updatedProgress, rank: rank > 0 ? rank : 10 };
}

export function recordTrackCompletion(
  progress: UserProgress,
  trackId: string,
  time: number,
  stars: number,
  falls: number,
  baseRewardCoins: number
): { progress: UserProgress; earnedCoins: number } {
  const prevRecord = progress.trackRecords[trackId];
  const isFirstClear = !prevRecord?.completed;
  const isNewBestTime = !prevRecord?.bestTime || time < prevRecord.bestTime;
  const zeroFalls = falls === 0;

  const prevStars = prevRecord?.stars || 0;
  const newStars = Math.max(prevStars, stars);
  const starUpgradeBonus = (newStars - prevStars) * 35;

  let earnedCoins = isFirstClear ? baseRewardCoins : Math.round(baseRewardCoins * 0.4);
  earnedCoins += starUpgradeBonus;
  if (zeroFalls && !prevRecord?.zeroFalls) {
    earnedCoins += 50; // Clean Run Bonus
  }

  const updatedRecord = {
    completed: true,
    bestTime: isNewBestTime ? time : prevRecord.bestTime,
    stars: newStars,
    zeroFalls: zeroFalls || !!prevRecord?.zeroFalls,
  };

  // Add to local leaderboard
  const lbResult = addLeaderboardEntry(progress, trackId, time, zeroFalls, stars, 'Player 1');

  const updatedProgress: UserProgress = {
    ...lbResult.progress,
    coins: lbResult.progress.coins + earnedCoins,
    trackRecords: {
      ...lbResult.progress.trackRecords,
      [trackId]: updatedRecord,
    },
  };

  saveUserProgress(updatedProgress);
  return { progress: updatedProgress, earnedCoins };
}
