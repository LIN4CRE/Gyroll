/**
 * Haptic Vibration API helper for supported mobile devices.
 * Gracefully checks navigator.vibrate support and user preference.
 */

class HapticsManager {
  private enabled = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  private vibrate(pattern: number | number[]) {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore security or permission restrictions in certain contexts
    }
  }

  public obstacleHit(intensity = 1.0) {
    const duration = Math.min(80, Math.max(25, Math.round(intensity * 50)));
    this.vibrate(duration);
  }

  public checkpoint() {
    this.vibrate([25, 30, 45]);
  }

  public boost() {
    this.vibrate([35, 20, 35]);
  }

  public finish() {
    this.vibrate([60, 40, 80, 50, 150]);
  }

  public fall() {
    this.vibrate([70]);
  }
}

export const haptics = new HapticsManager();
