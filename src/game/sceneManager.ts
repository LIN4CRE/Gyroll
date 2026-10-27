import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  AdaptiveDifficultyState,
  BallPhysicsState,
  BallSkin,
  BallTrail,
  CollisionEvent,
  PlayerInput,
  TrackDefinition,
  TrailCustomConfig,
  Vector3D,
} from './types';
import { createInitialBallState, getGroundAt, stepPhysics } from './physics';
import { buildTrack3D, BuiltTrack } from './trackBuilder';
import { createBallVisual, BallVisualInstance } from './ballVisual';
import { sound } from './audio';
import { haptics } from './haptics';
import { createWeatherSystem, WeatherSystem } from './weather';
import { applyAdaptiveTrackModifications } from './adaptiveDifficulty';

export type GameSceneMode = 'title' | 'playing' | 'paused' | 'gameover' | 'customization';

export interface SceneManagerCallbacks {
  onCheckpoint: (index: number, name: string) => void;
  onFinish: (clearTime: number, falls: number) => void;
  onFall: (falls: number) => void;
  onHudUpdate: (stats: {
    speed: number;
    time: number;
    falls: number;
    currentCheckpoint: number;
    totalCheckpoints: number;
    isRecovering: boolean;
    progressPercent: number;
    checkpointSplit?: {
      index: number;
      name: string;
      time: number;
      deltaGold: number;
    };
  }) => void;
}

export class SceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;

  private isSoftwareGl: boolean;
  private animationFrameId = 0;
  private isDestroyed = false;

  private currentTrack: TrackDefinition;
  private builtTrack: BuiltTrack | null = null;
  private ballVisual: BallVisualInstance | null = null;
  private ballPhysics: BallPhysicsState;
  private weatherSystem: WeatherSystem | null = null;
  private adaptiveState: AdaptiveDifficultyState | null = null;

  private mode: GameSceneMode = 'title';
  private callbacks: SceneManagerCallbacks;

  private runTimer = 0;
  private trackElapsedTime = 0;
  private cameraRotationShake = 0;

  // Pre-allocated scratch objects (Zero GC!)
  private _camPos = new THREE.Vector3();
  private _camLookTarget = new THREE.Vector3();
  private _ballEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private _scratchVec = new THREE.Vector3();

  // Demonstration / Showcase variables
  private demoAngle = 0;

  // Camera banking & physical game feel
  private currentCameraBank = 0;
  private wasOnGround = true;
  private previousVelocityY = 0;
  private activeCheckpointSplit?: {
    index: number;
    name: string;
    time: number;
    deltaGold: number;
    timer: number;
  };

  constructor(
    container: HTMLElement,
    track: TrackDefinition,
    skin: BallSkin,
    trail: BallTrail,
    trailConfig: TrailCustomConfig | undefined,
    adaptiveState: AdaptiveDifficultyState | null,
    callbacks: SceneManagerCallbacks
  ) {
    this.container = container;
    this.currentTrack = track;
    this.adaptiveState = adaptiveState;
    this.callbacks = callbacks;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Initialize WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep sky slate
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 400);

    // 4. Studio Environment Map (RoomEnvironment)
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // 5. Studio Lighting Rig
    const dirLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    dirLight.position.set(25, 45, 20);
    dirLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 120;
      dirLight.shadow.camera.left = -30;
      dirLight.shadow.camera.right = 30;
      dirLight.shadow.camera.top = 30;
      dirLight.shadow.camera.bottom = -30;
      dirLight.shadow.bias = -0.0005;
    }
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.2);
    this.scene.add(hemiLight);

    // 6. Setup Initial Track, Ball & Weather
    this.ballPhysics = createInitialBallState(track.spawnPoint);
    this.loadTrack(track, adaptiveState);
    this.setupBallVisual(skin, trail, trailConfig);

    // 7. Initial Camera Placement
    this.setupInitialCamera();

    window.addEventListener('resize', this.onResize);
    this.startLoop();
  }

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public setMode(mode: GameSceneMode) {
    this.mode = mode;
    if (mode === 'playing') {
      sound.ensureRunning();
    }
  }

  public setAdaptiveState(adaptiveState: AdaptiveDifficultyState | null) {
    this.adaptiveState = adaptiveState;
    this.loadTrack(this.currentTrack, adaptiveState);
  }

  public loadTrack(track: TrackDefinition, adaptiveState: AdaptiveDifficultyState | null = this.adaptiveState) {
    if (this.builtTrack) {
      this.scene.remove(this.builtTrack.group);
      this.builtTrack.dispose();
    }

    if (this.weatherSystem) {
      this.scene.remove(this.weatherSystem.points);
      this.weatherSystem.dispose();
      this.weatherSystem = null;
    }

    this.currentTrack = track;
    this.adaptiveState = adaptiveState;

    // Apply adaptive difficulty modifications if enabled
    const activeTrackDef = adaptiveState
      ? applyAdaptiveTrackModifications(track, adaptiveState)
      : track;

    this.builtTrack = buildTrack3D(activeTrackDef);
    this.scene.add(this.builtTrack.group);

    // Dynamic Weather Particles
    if (track.weather && track.weather !== 'none') {
      this.weatherSystem = createWeatherSystem(track.weather);
      if (this.weatherSystem) {
        this.scene.add(this.weatherSystem.points);
      }
    }

    // Reset physics state
    this.ballPhysics = createInitialBallState(track.spawnPoint);
    this.runTimer = 0;
    this.trackElapsedTime = 0;
  }

  public setupBallVisual(skin: BallSkin, trail: BallTrail, config?: TrailCustomConfig) {
    if (this.ballVisual) {
      this.scene.remove(this.ballVisual.group);
      this.ballVisual.dispose();
    }
    this.ballVisual = createBallVisual(skin, trail, this.ballPhysics.radius, config);
    this.scene.add(this.ballVisual.group);
  }

  public updateSkin(skin: BallSkin) {
    if (this.ballVisual) {
      this.ballVisual.updateSkin(skin);
    }
  }

  public updateTrail(trail: BallTrail, config?: TrailCustomConfig) {
    if (this.ballVisual) {
      this.ballVisual.updateTrail(trail, config);
    }
  }

  public restartCurrentTrack() {
    this.ballPhysics = createInitialBallState(this.currentTrack.spawnPoint);
    this.runTimer = 0;
    if (this.ballVisual) {
      this.ballVisual.clearParticles();
    }
    this.setMode('playing');
  }

  private setupInitialCamera() {
    this.camera.position.set(0, 3.5, 9.0);
    this.camera.lookAt(0, 1.2, -6.0);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();

    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animationFrameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.animationFrameId = window.setTimeout(cb, 80);
      }
    };
    this.animationFrameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    let lastTime = performance.now();

    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.animationFrameId = requestAnimationFrame(tick);
    }
  }

  private update(dt: number) {
    this.trackElapsedTime += dt;

    // Update dynamic weather particles
    if (this.weatherSystem) {
      this.weatherSystem.update(this.ballPhysics.position, dt, this.trackElapsedTime);
    }

    // Animate moving obstacles
    if (this.builtTrack) {
      for (const item of this.builtTrack.animatedObstacles) {
        const obs = item.data;
        if (obs.type === 'rotating_bar') {
          item.mesh.rotation.y = obs.initialAngle + this.trackElapsedTime * obs.speed;
        } else if (obs.type === 'swinging_hammer') {
          const theta =
            Math.sin(this.trackElapsedTime * obs.speed + obs.phase) * obs.maxAngle;
          item.mesh.rotation.z = theta;
        } else if (obs.type === 'rolling_boulder') {
          const range = obs.patrolMaxX - obs.patrolMinX;
          const cycle = Math.sin(this.trackElapsedTime * obs.speed);
          const x = obs.patrolMinX + ((cycle + 1) / 2) * range;
          item.mesh.position.x = x;
          item.mesh.rotation.z = -(x / obs.radius);
        } else if (obs.type === 'finish_gate') {
          item.mesh.rotation.y += dt * 1.5;
        }
      }

      for (const cp of this.builtTrack.checkpointMeshes) {
        cp.ringMesh.rotation.z += dt * 0.8;
      }
    }

    if (this.mode === 'title') {
      this.demoAngle += dt * 0.25;
      const camX = Math.sin(this.demoAngle) * 4.5;
      const camZ = 12 + Math.cos(this.demoAngle) * 3;
      this.camera.position.set(camX, 3.8, camZ);
      this.camera.lookAt(0, 1.0, -10.0);

      if (this.ballVisual) {
        this._ballEuler.x += dt * 1.5;
        this.ballVisual.update(
          { x: 0, y: 0.5, z: 0 },
          this._ballEuler,
          0,
          true,
          dt,
          2.0
        );
      }
      return;
    }

    if (this.mode === 'customization') {
      this.demoAngle += dt * 0.8;
      const radius = 2.4;
      const camX = Math.sin(this.demoAngle) * radius;
      const camZ = Math.cos(this.demoAngle) * radius;
      this.camera.position.set(camX, 1.2, camZ);
      this.camera.lookAt(0, 0.5, 0);

      if (this.ballVisual) {
        this._ballEuler.y += dt * 1.2;
        this.ballVisual.update(
          { x: 0, y: 0.5, z: 0 },
          this._ballEuler,
          0,
          true,
          dt,
          0
        );
      }
      return;
    }

    if (this.mode === 'playing') {
      this.runTimer += dt;

      const input = (window as any).__gyroRollInput
        ? (window as any).__gyroRollInput.pollInput(dt)
        : { steer: 0, throttle: 0, brake: false, resetRequested: false };

      if (input.resetRequested) {
        this.ballPhysics.isRecovering = true;
        this.ballPhysics.recoveryTimer = 0.2;
      }

      // Step Physics
      const physResult = stepPhysics(
        this.ballPhysics,
        input,
        this.currentTrack,
        dt,
        this.trackElapsedTime
      );
      this.ballPhysics = physResult.state;

      // Handle Events with Audio + Haptic Feedback
      for (const ev of physResult.events) {
        if (ev.type === 'checkpoint') {
          sound.playCheckpoint();
          haptics.checkpoint();
          if (this.ballVisual) this.ballVisual.emitBurst(ev.position, 16);
          const cpObs = this.currentTrack.obstacles.find(
            (o) => o.id === ev.obstacleId
          );
          const name = (cpObs as any)?.name || `Checkpoint ${this.ballPhysics.lastCheckpointIndex}`;
          
          // Split calculation against gold pace
          const totalCps = this.currentTrack.obstacles.filter((o) => o.type === 'checkpoint').length;
          const expectedGoldSplit = (this.currentTrack.targetTimes.gold / (totalCps + 1)) * this.ballPhysics.lastCheckpointIndex;
          const deltaGold = this.runTimer - expectedGoldSplit;
          this.activeCheckpointSplit = {
            index: this.ballPhysics.lastCheckpointIndex,
            name,
            time: this.runTimer,
            deltaGold,
            timer: 3.5,
          };

          this.callbacks.onCheckpoint(this.ballPhysics.lastCheckpointIndex, name);
        } else if (ev.type === 'finish') {
          sound.playFinish();
          haptics.finish();
          if (this.ballVisual) this.ballVisual.emitBurst(ev.position, 30);
          this.setMode('gameover');
          this.callbacks.onFinish(this.runTimer, this.ballPhysics.fallsCount);
          return;
        } else if (ev.type === 'fall') {
          sound.playFall();
          haptics.fall();
          this.cameraRotationShake = 0.8;
          this.callbacks.onFall(this.ballPhysics.fallsCount);
        } else if (ev.type === 'obstacle') {
          sound.playObstacleHit(ev.intensity);
          haptics.obstacleHit(ev.intensity);
          this.cameraRotationShake = Math.max(this.cameraRotationShake, 0.5);
          if (this.ballVisual) this.ballVisual.emitBurst(ev.position, 8);
        } else if (ev.type === 'boost') {
          sound.playBoost();
          haptics.boost();
        } else if (ev.type === 'bounce') {
          sound.playBounce();
          if (this.ballVisual) this.ballVisual.triggerSquash(0.6);
        }
      }

      // Landing detection with squash & stretch
      if (!this.wasOnGround && this.ballPhysics.onGround && this.previousVelocityY < -2.4) {
        if (this.ballVisual) {
          this.ballVisual.triggerSquash(Math.min(1.0, Math.abs(this.previousVelocityY) / 12));
        }
        sound.playBounce();
        haptics.obstacleHit(0.35);
      }
      this.wasOnGround = this.ballPhysics.onGround;
      this.previousVelocityY = this.ballPhysics.velocity.y;

      const speed = Math.hypot(this.ballPhysics.velocity.x, this.ballPhysics.velocity.z);
      sound.updateRollingRumble(speed, this.ballPhysics.onGround);

      this._ballEuler.x += this.ballPhysics.angularVelocity.x * dt;
      this._ballEuler.z += this.ballPhysics.angularVelocity.z * dt;

      const groundInfo = getGroundAt(
        this.ballPhysics.position,
        this.ballPhysics.radius,
        this.currentTrack.segments
      );
      const groundY = groundInfo ? groundInfo.groundY : -20;

      if (this.ballVisual) {
        this.ballVisual.update(
          this.ballPhysics.position,
          this._ballEuler,
          groundY,
          this.ballPhysics.onGround,
          dt,
          speed
        );
      }

      // True 3D Third-Person Forward-Facing Chase Camera
      const targetCamX = this.ballPhysics.position.x;
      const targetCamY = Math.max(1.8, this.ballPhysics.position.y + 3.2);
      const targetCamZ = this.ballPhysics.position.z + 7.5;

      const camDamp = 1 - Math.exp(-15 * dt);
      this.camera.position.x += (targetCamX - this.camera.position.x) * camDamp;
      this.camera.position.y += (targetCamY - this.camera.position.y) * camDamp;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * camDamp;

      // Dynamic Pitch Look-Ahead (avoids blind drops on ramps and leaps)
      const pitchAdjustment = Math.max(-2.5, Math.min(1.2, this.ballPhysics.velocity.y * 0.12));
      const targetLookX = this.ballPhysics.position.x;
      const targetLookY = this.ballPhysics.position.y + 1.2 + pitchAdjustment;
      const targetLookZ = this.ballPhysics.position.z - 9.0;

      this._camLookTarget.x += (targetLookX - this._camLookTarget.x) * camDamp;
      this._camLookTarget.y += (targetLookY - this._camLookTarget.y) * camDamp;
      this._camLookTarget.z += (targetLookZ - this._camLookTarget.z) * camDamp;

      this.camera.lookAt(this._camLookTarget);

      // Dynamic Camera Banking on lateral steering velocity
      const targetBank = -Math.max(-0.06, Math.min(0.06, this.ballPhysics.velocity.x * 0.007));
      this.currentCameraBank += (targetBank - this.currentCameraBank) * (1 - Math.exp(-12 * dt));
      this.camera.rotation.z += this.currentCameraBank;

      if (this.cameraRotationShake > 0.01) {
        this.camera.position.x += (Math.random() - 0.5) * this.cameraRotationShake * 0.3;
        this.camera.position.y += (Math.random() - 0.5) * this.cameraRotationShake * 0.3;
        this.camera.rotation.z += (Math.random() - 0.5) * this.cameraRotationShake * 0.04;
        this.cameraRotationShake = Math.max(0, this.cameraRotationShake - dt * 3.0);
      }

      // Track progress percentage
      const startZ = this.currentTrack.spawnPoint.z;
      const finishZ = this.currentTrack.finishZ;
      const progressPercent = Math.max(
        0,
        Math.min(100, Math.round(((startZ - this.ballPhysics.position.z) / (startZ - finishZ)) * 100))
      );

      // Checkpoint split timer
      let splitToSend: { index: number; name: string; time: number; deltaGold: number } | undefined;
      if (this.activeCheckpointSplit) {
        this.activeCheckpointSplit.timer -= dt;
        splitToSend = {
          index: this.activeCheckpointSplit.index,
          name: this.activeCheckpointSplit.name,
          time: this.activeCheckpointSplit.time,
          deltaGold: this.activeCheckpointSplit.deltaGold,
        };
        if (this.activeCheckpointSplit.timer <= 0) {
          this.activeCheckpointSplit = undefined;
        }
      }

      const totalCheckpoints = this.currentTrack.obstacles.filter(
        (o) => o.type === 'checkpoint'
      ).length;

      this.callbacks.onHudUpdate({
        speed,
        time: this.runTimer,
        falls: this.ballPhysics.fallsCount,
        currentCheckpoint: this.ballPhysics.lastCheckpointIndex,
        totalCheckpoints,
        isRecovering: this.ballPhysics.isRecovering,
        progressPercent,
        checkpointSplit: splitToSend,
      });
    }
  }

  public dispose() {
    this.isDestroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      clearTimeout(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);

    if (this.weatherSystem) {
      this.weatherSystem.dispose();
    }
    if (this.builtTrack) {
      this.builtTrack.dispose();
    }
    if (this.ballVisual) {
      this.ballVisual.dispose();
    }
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
