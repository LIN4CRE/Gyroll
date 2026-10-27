import { PlayerInput } from './types';

export interface GyroSensorState {
  isSupported: boolean;
  permissionGranted: boolean;
  rawGamma: number; // left/right roll (-90 to 90)
  rawBeta: number; // front/back pitch (-180 to 180)
  calibratedGamma: number;
  calibratedBeta: number;
  tiltPercentX: number; // -1 to 1
  tiltPercentY: number; // -1 to 1
  lastUpdateTime: number;
}

export class InputManager {
  private keysHeld = new Set<string>();
  private touchSteer = 0;
  private touchThrottle = 0;
  private touchBrake = false;

  private rawGamma = 0;
  private rawBeta = 0;
  private smoothedSteer = 0;
  private lastTimestamp = performance.now();

  private sensorState: GyroSensorState = {
    isSupported: false,
    permissionGranted: false,
    rawGamma: 0,
    rawBeta: 0,
    calibratedGamma: 0,
    calibratedBeta: 0,
    tiltPercentX: 0,
    tiltPercentY: 0,
    lastUpdateTime: 0,
  };

  private neutralGamma = 0;
  private neutralBeta = 30; // default 30 deg holding incline
  private sensitivity = 1.2;
  private deadzone = 0.04;
  private invert = false;
  private controlMode: 'auto' | 'gyro' | 'touch_slider' | 'touch_buttons' = 'auto';

  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;
  private boundOnDeviceOrientation: (e: DeviceOrientationEvent) => void;
  private boundOnBlur: () => void;

  constructor() {
    this.boundOnKeyDown = this.handleKeyDown.bind(this);
    this.boundOnKeyUp = this.handleKeyUp.bind(this);
    this.boundOnDeviceOrientation = this.handleDeviceOrientation.bind(this);
    this.boundOnBlur = this.handleBlur.bind(this);
  }

  public init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
    window.addEventListener('blur', this.boundOnBlur);

    // Check deviceorientation support
    if (window.DeviceOrientationEvent) {
      this.sensorState.isSupported = true;
      window.addEventListener('deviceorientation', this.boundOnDeviceOrientation);
    }
  }

  public destroy() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
    window.removeEventListener('blur', this.boundOnBlur);
    window.removeEventListener('deviceorientation', this.boundOnDeviceOrientation);
  }

  public async requestOrientationPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const DOE = window.DeviceOrientationEvent as any;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        const response = await DOE.requestPermission();
        if (response === 'granted') {
          this.sensorState.permissionGranted = true;
          window.addEventListener('deviceorientation', this.boundOnDeviceOrientation);
          return true;
        } else {
          this.sensorState.permissionGranted = false;
          return false;
        }
      } catch (e) {
        console.warn('Error requesting orientation permission', e);
        return false;
      }
    } else if (window.DeviceOrientationEvent) {
      this.sensorState.permissionGranted = true;
      window.addEventListener('deviceorientation', this.boundOnDeviceOrientation);
      return true;
    }
    return false;
  }

  public calibrateNeutral() {
    this.neutralGamma = this.rawGamma;
    this.neutralBeta = this.rawBeta;
  }

  public setConfiguration(config: {
    sensitivity?: number;
    deadzone?: number;
    invert?: boolean;
    controlMode?: 'auto' | 'gyro' | 'touch_slider' | 'touch_buttons';
    neutralGamma?: number;
    neutralBeta?: number;
  }) {
    if (config.sensitivity !== undefined) this.sensitivity = config.sensitivity;
    if (config.deadzone !== undefined) this.deadzone = config.deadzone;
    if (config.invert !== undefined) this.invert = config.invert;
    if (config.controlMode !== undefined) this.controlMode = config.controlMode;
    if (config.neutralGamma !== undefined) this.neutralGamma = config.neutralGamma;
    if (config.neutralBeta !== undefined) this.neutralBeta = config.neutralBeta;
  }

  public setTouchInput(steer: number, throttle = 0, brake = false) {
    this.touchSteer = Math.max(-1, Math.min(1, steer));
    this.touchThrottle = Math.max(-1, Math.min(1, throttle));
    this.touchBrake = brake;
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keysHeld.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keysHeld.delete(e.code);
  }

  private handleBlur() {
    this.keysHeld.clear();
    this.touchSteer = 0;
    this.touchThrottle = 0;
    this.touchBrake = false;
  }

  private handleDeviceOrientation(e: DeviceOrientationEvent) {
    if (e.gamma === null && e.beta === null) return;

    this.sensorState.permissionGranted = true;
    this.sensorState.lastUpdateTime = performance.now();

    // Check landscape orientation rotation
    let gamma = e.gamma ?? 0;
    let beta = e.beta ?? 0;

    const screenOrientation = window.screen?.orientation?.type || '';
    if (screenOrientation.includes('landscape-primary')) {
      // In landscape primary (turned 90 deg counterclockwise), beta is roll and -gamma is pitch
      gamma = e.beta ?? 0;
      beta = -(e.gamma ?? 0);
    } else if (screenOrientation.includes('landscape-secondary')) {
      gamma = -(e.beta ?? 0);
      beta = e.gamma ?? 0;
    }

    this.rawGamma = gamma;
    this.rawBeta = beta;
  }

  public getSensorState(): GyroSensorState {
    const diffGamma = this.rawGamma - this.neutralGamma;
    const diffBeta = this.rawBeta - this.neutralBeta;

    // Normalizing tilt angle: ±25 degrees tilt maps to ±1.0
    const maxAngle = 25;
    const normX = Math.max(-1, Math.min(1, diffGamma / maxAngle));
    const normY = Math.max(-1, Math.min(1, diffBeta / maxAngle));

    return {
      ...this.sensorState,
      rawGamma: this.rawGamma,
      rawBeta: this.rawBeta,
      calibratedGamma: diffGamma,
      calibratedBeta: diffBeta,
      tiltPercentX: normX,
      tiltPercentY: normY,
    };
  }

  public pollInput(dt: number): PlayerInput {
    let steer = 0;
    let throttle = 0;
    let brake = false;

    // 1. Keyboard Inputs (A/D, Arrows, W/S, Space)
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) {
      steer -= 1.0;
    }
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) {
      steer += 1.0;
    }
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) {
      throttle += 1.0;
    }
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) {
      throttle -= 1.0;
    }
    if (this.keysHeld.has('Space')) {
      brake = true;
    }

    // 2. Gyroscope / Motion Sensor Tilt
    const sensor = this.getSensorState();
    const sensorActive =
      (this.controlMode === 'auto' || this.controlMode === 'gyro') &&
      performance.now() - sensor.lastUpdateTime < 800;

    let targetGyroSteer = 0;
    if (sensorActive) {
      let tiltX = sensor.tiltPercentX;
      if (Math.abs(tiltX) < this.deadzone) {
        tiltX = 0;
      } else {
        const sign = Math.sign(tiltX);
        tiltX = sign * ((Math.abs(tiltX) - this.deadzone) / (1 - this.deadzone));
      }
      targetGyroSteer = tiltX * this.sensitivity;
      if (this.invert) targetGyroSteer = -targetGyroSteer;

      // Pitch throttle
      if (Math.abs(sensor.tiltPercentY) > 0.15) {
        throttle += sensor.tiltPercentY * 0.8;
      }
    }

    // 3. Touch Input
    if (Math.abs(this.touchSteer) > 0.01) {
      steer += this.touchSteer;
    }
    if (Math.abs(this.touchThrottle) > 0.01) {
      throttle += this.touchThrottle;
    }
    if (this.touchBrake) {
      brake = true;
    }

    // Combine gyro + touch + keyboard
    const combinedSteer = Math.max(-1, Math.min(1, steer + targetGyroSteer));

    // Smooth steering with exponential damping to eliminate gyro jitter
    const dampingK = 22;
    this.smoothedSteer += (combinedSteer - this.smoothedSteer) * (1 - Math.exp(-dampingK * dt));

    return {
      steer: this.smoothedSteer,
      throttle: Math.max(-1, Math.min(1, throttle)),
      brake,
      resetRequested: this.keysHeld.has('KeyR'),
    };
  }
}

export const inputManager = new InputManager();
