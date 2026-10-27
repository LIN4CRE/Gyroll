/**
 * Web Audio API procedural sound synthesizer for GYRO ROLL.
 * Zero external files, zero 404 dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineGain: GainNode | null = null;

  // Continuous rolling rumble nodes
  private rumbleSource: AudioBufferSourceNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private rumbleGain: GainNode | null = null;
  private isRumblePlaying = false;

  private isMuted = false;
  private masterVol = 0.8;
  private sfxVol = 0.8;
  private engineVol = 0.7;

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Master
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // SFX Bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Engine/Rolling Bus
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(this.engineVol, this.ctx.currentTime);
    this.engineGain.connect(this.masterGain);

    this.setupRollingRumble();
  }

  private setupRollingRumble() {
    if (!this.ctx || !this.engineGain) return;

    // Generate 2 seconds of pink/brownish noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }

    this.rumbleSource = this.ctx.createBufferSource();
    this.rumbleSource.buffer = buffer;
    this.rumbleSource.loop = true;

    this.rumbleFilter = this.ctx.createBiquadFilter();
    this.rumbleFilter.type = 'lowpass';
    this.rumbleFilter.frequency.setValueAtTime(100, this.ctx.currentTime);
    this.rumbleFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.rumbleSource.connect(this.rumbleFilter);
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.engineGain);

    try {
      this.rumbleSource.start();
      this.isRumblePlaying = true;
    } catch {
      // Ignored if user hasn't interacted
    }
  }

  public ensureRunning() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateRollingRumble(speed: number, onGround: boolean) {
    if (!this.ctx || !this.rumbleFilter || !this.rumbleGain) return;

    const t = this.ctx.currentTime;
    if (!onGround || speed < 0.5) {
      this.rumbleGain.gain.setTargetAtTime(0, t, 0.08);
      return;
    }

    const normSpeed = Math.min(speed / 24, 1.2);
    // Filter cutoff rises from 120Hz to 650Hz as ball rolls faster
    const targetFreq = 120 + normSpeed * 530;
    const targetVol = Math.min(0.7, normSpeed * 0.45);

    this.rumbleFilter.frequency.setTargetAtTime(targetFreq, t, 0.05);
    this.rumbleGain.gain.setTargetAtTime(targetVol, t, 0.05);
  }

  public playObstacleHit(intensity = 0.8) {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    const hitVol = Math.min(1.0, intensity * 0.7);
    gain.gain.setValueAtTime(hitVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playBounce() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  public playBoost() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playCheckpoint() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playFinish() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain) return;

    // Victory Fanfare
    const chords = [
      { notes: [440, 554.37, 659.25], time: 0.0, dur: 0.2 }, // A major
      { notes: [493.88, 622.25, 739.99], time: 0.22, dur: 0.2 }, // B major
      { notes: [554.37, 698.46, 830.61], time: 0.44, dur: 0.2 }, // C# major
      { notes: [880, 1108.73, 1318.51], time: 0.66, dur: 0.7 }, // High A major
    ];

    chords.forEach((chord) => {
      chord.notes.forEach((freq) => {
        if (!this.ctx || !this.sfxGain) return;
        const t = this.ctx.currentTime + chord.time;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + chord.dur);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + chord.dur + 0.05);
      });
    });
  }

  public playFall() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.45);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playClick() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public setVolumes(master: number, sfx: number, engine: number, muted: boolean) {
    this.masterVol = master;
    this.sfxVol = sfx;
    this.engineVol = engine;
    this.isMuted = muted;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : master, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    }
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(engine, this.ctx.currentTime);
    }
  }
}

export const sound = new SoundEngine();
