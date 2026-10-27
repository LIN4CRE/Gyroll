import { BallSkin, BallTrail, UserProgress } from './types';

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
  },
  {
    id: 'sparkle',
    name: 'Sparkle Dust',
    price: 150,
    unlocked: false,
    particleColor: '#fbbf24',
    particleType: 'sparkle',
    description: 'Luminous glittering golden particles that float in the air.',
  },
  {
    id: 'neon',
    name: 'Neon Streak',
    price: 300,
    unlocked: false,
    particleColor: '#06b6d4',
    particleType: 'neon',
    description: 'Dual electric cyan and magenta aerodynamic light streams.',
  },
  {
    id: 'flame',
    name: 'Flame Jet',
    price: 450,
    unlocked: false,
    particleColor: '#ea580c',
    particleType: 'flame',
    description: 'Blazing afterburner plume spitting hot orange embers.',
  },
  {
    id: 'plasma',
    name: 'Plasma Rings',
    price: 600,
    unlocked: false,
    particleColor: '#c084fc',
    particleType: 'plasma',
    description: 'High-voltage electric rings pulsing behind the ball.',
  },
];

const STORAGE_KEY = 'gyroroll_save_v1';

export const DEFAULT_USER_PROGRESS: UserProgress = {
  coins: 100, // Starter coins
  selectedSkinId: 'chrome',
  selectedTrailId: 'none',
  unlockedSkins: ['chrome'],
  unlockedTrails: ['none'],
  trackRecords: {},
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
    neutralBeta: 30, // typical ~30-40 deg reading angle when holding phone
  },
};

export function loadUserProgress(): UserProgress {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_USER_PROGRESS };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_PROGRESS,
      ...parsed,
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

export function unlockSkin(progress: UserProgress, skinId: string): { success: boolean; progress: UserProgress; message?: string } {
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

export function unlockTrail(progress: UserProgress, trailId: string): { success: boolean; progress: UserProgress; message?: string } {
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

  // Star bonus (25 coins per star on first earn or upgrade)
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

  const updatedProgress: UserProgress = {
    ...progress,
    coins: progress.coins + earnedCoins,
    trackRecords: {
      ...progress.trackRecords,
      [trackId]: updatedRecord,
    },
  };

  saveUserProgress(updatedProgress);
  return { progress: updatedProgress, earnedCoins };
}
