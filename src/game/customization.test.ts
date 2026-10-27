import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BALL_SKINS,
  BALL_TRAILS,
  DEFAULT_USER_PROGRESS,
  unlockSkin,
  unlockTrail,
  updateTrailConfig,
  addLeaderboardEntry,
  recordTrackCompletion,
} from './customization';

test('initial user progress has chrome skin and default trails unlocked', () => {
  assert.equal(DEFAULT_USER_PROGRESS.selectedSkinId, 'chrome');
  assert.equal(DEFAULT_USER_PROGRESS.unlockedSkins.includes('chrome'), true);
  assert.equal(DEFAULT_USER_PROGRESS.unlockedTrails.includes('none'), true);
  assert.equal(DEFAULT_USER_PROGRESS.unlockedTrails.includes('classic'), true);
});

test('unlockSkin succeeds with sufficient coins and updates progress', () => {
  const initial = { ...DEFAULT_USER_PROGRESS, coins: 500 };
  const res = unlockSkin(initial, 'cyber'); // price 200
  assert.equal(res.success, true);
  assert.equal(res.progress.coins, 300);
  assert.equal(res.progress.unlockedSkins.includes('cyber'), true);
  assert.equal(res.progress.selectedSkinId, 'cyber');
});

test('unlockSkin fails with insufficient coins', () => {
  const initial = { ...DEFAULT_USER_PROGRESS, coins: 50 };
  const res = unlockSkin(initial, 'cyber'); // price 200
  assert.equal(res.success, false);
  assert.equal(res.progress.coins, 50);
});

test('unlockTrail unlocks premium trail and deducts coins', () => {
  const initial = { ...DEFAULT_USER_PROGRESS, coins: 600 };
  const res = unlockTrail(initial, 'electric'); // price 550
  assert.equal(res.success, true);
  assert.equal(res.progress.coins, 50);
  assert.equal(res.progress.unlockedTrails.includes('electric'), true);
  assert.equal(res.progress.selectedTrailId, 'electric');
});

test('updateTrailConfig updates length and color customizations', () => {
  const initial = { ...DEFAULT_USER_PROGRESS };
  const updated = updateTrailConfig(initial, 'neon', {
    length: 'short',
    glowIntensity: 1.8,
  });
  assert.equal(updated.trailConfigs['neon'].length, 'short');
  assert.equal(updated.trailConfigs['neon'].glowIntensity, 1.8);
});

test('addLeaderboardEntry inserts time into top 10 ranked correctly', () => {
  const initial = { ...DEFAULT_USER_PROGRESS };
  const res = addLeaderboardEntry(initial, 'test_track', 18.25, true, 3, 'TopRacer');

  assert.equal(res.rank, 1);
  const entries = res.progress.leaderboards['test_track'];
  assert.ok(entries.length > 0);
  assert.equal(entries[0].time, 18.25);
  assert.equal(entries[0].playerName, 'TopRacer');
});

test('recordTrackCompletion awards coins, tracks best times and clean runs', () => {
  const initial = { ...DEFAULT_USER_PROGRESS, coins: 100 };
  const res = recordTrackCompletion(initial, 'aero_highlands', 20.4, 3, 0, 120);

  assert.ok(res.earnedCoins >= 120, 'Should award base reward plus bonuses');
  assert.equal(res.progress.trackRecords['aero_highlands'].completed, true);
  assert.equal(res.progress.trackRecords['aero_highlands'].bestTime, 20.4);
  assert.equal(res.progress.trackRecords['aero_highlands'].stars, 3);
  assert.equal(res.progress.trackRecords['aero_highlands'].zeroFalls, true);
});
