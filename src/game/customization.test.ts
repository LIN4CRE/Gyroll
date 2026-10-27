import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BALL_SKINS,
  BALL_TRAILS,
  DEFAULT_USER_PROGRESS,
  unlockSkin,
  unlockTrail,
  recordTrackCompletion,
} from './customization';

test('initial user progress has chrome skin and none trail unlocked', () => {
  assert.equal(DEFAULT_USER_PROGRESS.selectedSkinId, 'chrome');
  assert.equal(DEFAULT_USER_PROGRESS.unlockedSkins.includes('chrome'), true);
  assert.equal(DEFAULT_USER_PROGRESS.selectedTrailId, 'none');
  assert.equal(DEFAULT_USER_PROGRESS.unlockedTrails.includes('none'), true);
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

test('recordTrackCompletion awards coins, tracks best times and clean runs', () => {
  const initial = { ...DEFAULT_USER_PROGRESS, coins: 100 };
  const res = recordTrackCompletion(initial, 'track_1', 25.4, 3, 0, 120);

  assert.ok(res.earnedCoins >= 120, 'Should award base reward plus bonuses');
  assert.equal(res.progress.trackRecords['track_1'].completed, true);
  assert.equal(res.progress.trackRecords['track_1'].bestTime, 25.4);
  assert.equal(res.progress.trackRecords['track_1'].stars, 3);
  assert.equal(res.progress.trackRecords['track_1'].zeroFalls, true);
});
