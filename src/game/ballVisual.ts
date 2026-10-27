import * as THREE from 'three';
import { BallSkin, BallTrail, TrailCustomConfig, Vector3D } from './types';
import { createBallTexture } from './textures';

export interface BallVisualInstance {
  group: THREE.Group;
  ballMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  update: (
    position: Vector3D,
    rotation: THREE.Euler,
    groundY: number,
    onGround: boolean,
    dt: number,
    speed: number
  ) => void;
  updateSkin: (skin: BallSkin) => void;
  updateTrail: (trail: BallTrail, config?: TrailCustomConfig) => void;
  emitBurst: (position: Vector3D, count?: number) => void;
  triggerSquash: (intensity?: number) => void;
  clearParticles: () => void;
  dispose: () => void;
}

const MAX_PARTICLES = 96;

export function createBallVisual(
  initialSkin: BallSkin,
  initialTrail: BallTrail,
  radius = 0.5,
  initialConfig?: TrailCustomConfig
): BallVisualInstance {
  const group = new THREE.Group();

  // 1. Primary Sphere
  const sphereGeo = new THREE.SphereGeometry(radius, 32, 24);
  let activeTexture = createBallTexture(initialSkin.pattern);

  const ballMat = new THREE.MeshStandardMaterial({
    map: activeTexture,
    color: new THREE.Color(initialSkin.color),
    roughness: initialSkin.roughness,
    metalness: initialSkin.metalness,
    emissive: new THREE.Color(initialSkin.emissive),
    emissiveIntensity: 0.6,
  });

  const ballMesh = new THREE.Mesh(sphereGeo, ballMat);
  ballMesh.castShadow = true;
  group.add(ballMesh);

  // 2. Secondary read: Equator metallic accent ring
  const ringGeo = new THREE.TorusGeometry(radius * 1.01, 0.02, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.15,
  });
  const accentRing = new THREE.Mesh(ringGeo, ringMat);
  accentRing.rotation.x = Math.PI / 2;
  ballMesh.add(accentRing);

  // 3. Contact Shadow Disc (grounded beneath ball)
  const shadowGeo = new THREE.CircleGeometry(radius * 1.25, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  group.add(shadowMesh);

  // 4. Premium Pooled Particle Trail (InstancedMesh)
  let currentTrail = initialTrail;
  let currentConfig: TrailCustomConfig = initialConfig || initialTrail.defaultConfig;

  // Use a dual-geometry approach or box for digital, sphere/octahedron for others
  const particleGeo = new THREE.DodecahedronGeometry(0.08, 0);
  const particleMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(currentConfig.primaryColor),
    transparent: true,
    opacity: Math.min(1.0, 0.85 * currentConfig.glowIntensity),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(particleMesh);

  // Color attribute per instance for dual-tone & prismatic ribbons
  const colorBuffer = new Float32Array(MAX_PARTICLES * 3);
  const baseColor = new THREE.Color(currentConfig.primaryColor);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    colorBuffer[i * 3] = baseColor.r;
    colorBuffer[i * 3 + 1] = baseColor.g;
    colorBuffer[i * 3 + 2] = baseColor.b;
  }
  const colorAttribute = new THREE.InstancedBufferAttribute(colorBuffer, 3);
  particleGeo.setAttribute('color', colorAttribute);
  particleMat.vertexColors = true;

  // Particle pool state arrays
  const particlePositions = new Float32Array(MAX_PARTICLES * 3);
  const particleVelocities = new Float32Array(MAX_PARTICLES * 3);
  const particleLifespans = new Float32Array(MAX_PARTICLES);
  const particleMaxLifespans = new Float32Array(MAX_PARTICLES);
  const particleRotations = new Float32Array(MAX_PARTICLES);
  let nextParticleIdx = 0;
  let trailSpawnTimer = 0;
  let globalTime = 0;

  const dummyMatrix = new THREE.Matrix4();
  const dummyScale = new THREE.Vector3();
  const dummyPos = new THREE.Vector3();
  const dummyRot = new THREE.Quaternion();
  const tempColor = new THREE.Color();
  const primaryCol = new THREE.Color(currentConfig.primaryColor);
  const secondaryCol = new THREE.Color(currentConfig.secondaryColor);

  // Hide all instances initially
  for (let i = 0; i < MAX_PARTICLES; i++) {
    dummyMatrix.makeScale(0, 0, 0);
    particleMesh.setMatrixAt(i, dummyMatrix);
  }
  particleMesh.instanceMatrix.needsUpdate = true;

  function getLifespanFromLength(length: 'short' | 'medium' | 'long'): number {
    switch (length) {
      case 'short':
        return 0.25;
      case 'long':
        return 0.75;
      default:
        return 0.45;
    }
  }

  function getSpawnIntervalFromDensity(density: 'low' | 'medium' | 'high'): number {
    switch (density) {
      case 'low':
        return 0.055;
      case 'high':
        return 0.02;
      default:
        return 0.035;
    }
  }

  function spawnParticle(
    x: number,
    y: number,
    z: number,
    vx = 0,
    vy = 0,
    vz = 0,
    life = 0.5,
    rot = 0,
    col = primaryCol
  ) {
    const idx = nextParticleIdx;
    nextParticleIdx = (nextParticleIdx + 1) % MAX_PARTICLES;

    particlePositions[idx * 3] = x;
    particlePositions[idx * 3 + 1] = y;
    particlePositions[idx * 3 + 2] = z;

    particleVelocities[idx * 3] = vx;
    particleVelocities[idx * 3 + 1] = vy;
    particleVelocities[idx * 3 + 2] = vz;

    particleLifespans[idx] = life;
    particleMaxLifespans[idx] = life;
    particleRotations[idx] = rot;

    colorBuffer[idx * 3] = col.r;
    colorBuffer[idx * 3 + 1] = col.g;
    colorBuffer[idx * 3 + 2] = col.b;
    colorAttribute.needsUpdate = true;
  }

  function emitBurst(pos: Vector3D, count = 16) {
    const burstColor = currentTrail.particleType === 'void' ? secondaryCol : primaryCol;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      spawnParticle(
        pos.x,
        pos.y,
        pos.z,
        Math.cos(angle) * speed,
        1.5 + Math.random() * 3.5,
        Math.sin(angle) * speed,
        0.4 + Math.random() * 0.3,
        Math.random() * Math.PI,
        burstColor
      );
    }
  }

  function clearParticles() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particleLifespans[i] = 0;
      dummyMatrix.makeScale(0, 0, 0);
      particleMesh.setMatrixAt(i, dummyMatrix);
    }
    particleMesh.instanceMatrix.needsUpdate = true;
  }

  let squashScaleY = 1.0;
  let squashScaleXZ = 1.0;

  function triggerSquash(intensity = 0.5) {
    const clamped = Math.max(0.1, Math.min(1.0, intensity));
    squashScaleY = 1.0 - clamped * 0.28;
    squashScaleXZ = 1.0 + clamped * 0.16;
  }

  return {
    group,
    ballMesh,
    shadowMesh,
    triggerSquash,
    update: (pos, rot, groundY, onGround, dt, speed) => {
      globalTime += dt;

      // Smoothly restore squash deformation back to 1.0
      const recoveryDamp = 1 - Math.exp(-20 * dt);
      squashScaleY += (1.0 - squashScaleY) * recoveryDamp;
      squashScaleXZ += (1.0 - squashScaleXZ) * recoveryDamp;
      ballMesh.scale.set(squashScaleXZ, squashScaleY, squashScaleXZ);

      // Position ball
      ballMesh.position.set(pos.x, pos.y, pos.z);
      ballMesh.rotation.copy(rot);

      // Contact shadow positioning
      if (onGround && pos.y >= groundY - 0.25) {
        shadowMesh.visible = true;
        shadowMesh.position.set(pos.x, groundY + 0.02, pos.z);
        const heightAboveGround = Math.max(0, pos.y - (groundY + radius));
        shadowMat.opacity = Math.max(0, 0.45 - heightAboveGround * 0.2);
        const scale = (1 + heightAboveGround * 0.3) * squashScaleXZ;
        shadowMesh.scale.set(scale, scale, scale);
      } else {
        shadowMesh.visible = false;
      }

      // Trail Spawning based on type and movement speed
      trailSpawnTimer += dt;
      const spawnInterval = getSpawnIntervalFromDensity(currentConfig.density);
      const baseLifespan = getLifespanFromLength(currentConfig.length);

      if (currentTrail.particleType !== 'none' && trailSpawnTimer >= spawnInterval && speed > 1.2) {
        trailSpawnTimer = 0;
        const trailType = currentTrail.particleType;

        if (trailType === 'classic') {
          // Subtle aerodynamic stream
          spawnParticle(
            pos.x + (Math.random() - 0.5) * 0.15,
            pos.y,
            pos.z + radius * 0.8,
            (Math.random() - 0.5) * 0.4,
            0.2,
            1.2 + Math.random() * 1.5,
            baseLifespan,
            0,
            primaryCol
          );
        } else if (trailType === 'neon') {
          // Dual-channel weaving light ribbons
          const weave = Math.sin(globalTime * 12) * 0.28;
          spawnParticle(
            pos.x + weave,
            pos.y + 0.05,
            pos.z + radius * 0.85,
            weave * 1.5,
            0.3,
            1.8,
            baseLifespan,
            0,
            primaryCol
          );
          spawnParticle(
            pos.x - weave,
            pos.y - 0.05,
            pos.z + radius * 0.85,
            -weave * 1.5,
            0.3,
            1.8,
            baseLifespan,
            0,
            secondaryCol
          );
        } else if (trailType === 'plasma') {
          // Expanding pulsating plasma rings
          spawnParticle(
            pos.x,
            pos.y,
            pos.z + radius * 0.7,
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.8,
            1.0,
            baseLifespan * 1.1,
            globalTime * 3,
            Math.random() > 0.5 ? primaryCol : secondaryCol
          );
        } else if (trailType === 'digital') {
          // Binary pixel cubes aligned to grid
          const snapX = Math.round((pos.x + (Math.random() - 0.5) * 0.4) * 8) / 8;
          const snapY = Math.round((pos.y + (Math.random() - 0.5) * 0.3) * 8) / 8;
          spawnParticle(
            snapX,
            snapY,
            pos.z + radius * 0.8,
            0,
            0.2,
            0.5,
            baseLifespan,
            0,
            Math.random() > 0.3 ? primaryCol : secondaryCol
          );
        } else if (trailType === 'electric') {
          // High-frequency zigzag electric sparks
          for (let k = 0; k < 2; k++) {
            const jitterX = (Math.random() - 0.5) * 0.5;
            const jitterY = (Math.random() - 0.5) * 0.5;
            spawnParticle(
              pos.x + jitterX,
              pos.y + jitterY,
              pos.z + radius * 0.6,
              jitterX * 4,
              jitterY * 4,
              1.5,
              baseLifespan * 0.7,
              Math.random() * Math.PI,
              Math.random() > 0.4 ? primaryCol : secondaryCol
            );
          }
        } else if (trailType === 'cosmic') {
          // Twinkling diamond stardust
          spawnParticle(
            pos.x + (Math.random() - 0.5) * 0.35,
            pos.y + (Math.random() - 0.5) * 0.35,
            pos.z + radius * 0.9,
            (Math.random() - 0.5) * 0.3,
            0.4 + Math.random() * 0.4,
            0.8,
            baseLifespan * 1.3,
            globalTime * 4,
            Math.random() > 0.5 ? primaryCol : secondaryCol
          );
        } else if (trailType === 'prismatic') {
          // Shifting rainbow gradient
          const hue = (globalTime * 1.2) % 1.0;
          tempColor.setHSL(hue, 0.9, 0.55);
          spawnParticle(
            pos.x + (Math.random() - 0.5) * 0.2,
            pos.y,
            pos.z + radius * 0.8,
            (Math.random() - 0.5) * 0.5,
            0.3,
            1.5,
            baseLifespan,
            0,
            tempColor
          );
        } else if (trailType === 'void') {
          // Dark matter core with amethyst fringe
          const isCore = Math.random() > 0.4;
          spawnParticle(
            pos.x + (Math.random() - 0.5) * 0.25,
            pos.y + (Math.random() - 0.5) * 0.25,
            pos.z + radius * 0.75,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            0.8,
            baseLifespan,
            0,
            isCore ? primaryCol : secondaryCol
          );
        }
      }

      // Tick active particles
      let hasAliveParticles = false;
      const baseScale = currentConfig.particleSize;

      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (particleLifespans[i] > 0) {
          hasAliveParticles = true;
          particleLifespans[i] -= dt;

          particlePositions[i * 3] += particleVelocities[i * 3] * dt;
          particlePositions[i * 3 + 1] += particleVelocities[i * 3 + 1] * dt;
          particlePositions[i * 3 + 2] += particleVelocities[i * 3 + 2] * dt;

          const lifeRatio = Math.max(0, particleLifespans[i] / particleMaxLifespans[i]);
          let currentScale = lifeRatio * baseScale * 12;

          // Trail-specific scale curves
          if (currentTrail.particleType === 'plasma') {
            // Expands then fades
            currentScale = (1.0 - lifeRatio * 0.5) * baseScale * 14;
          } else if (currentTrail.particleType === 'electric') {
            // Rapid flickers
            currentScale *= Math.random() > 0.2 ? 1.0 : 0.4;
          }

          dummyPos.set(
            particlePositions[i * 3],
            particlePositions[i * 3 + 1],
            particlePositions[i * 3 + 2]
          );
          dummyScale.set(currentScale, currentScale, currentScale);
          dummyRot.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, particleRotations[i]);

          dummyMatrix.makeRotationFromQuaternion(dummyRot);
          dummyMatrix.scale(dummyScale);
          dummyMatrix.setPosition(dummyPos);
          particleMesh.setMatrixAt(i, dummyMatrix);
        } else {
          dummyMatrix.makeScale(0, 0, 0);
          particleMesh.setMatrixAt(i, dummyMatrix);
        }
      }

      if (hasAliveParticles) {
        particleMesh.instanceMatrix.needsUpdate = true;
      }
    },
    updateSkin: (skin) => {
      activeTexture.dispose();
      activeTexture = createBallTexture(skin.pattern);
      ballMat.map = activeTexture;
      ballMat.color.set(skin.color);
      ballMat.roughness = skin.roughness;
      ballMat.metalness = skin.metalness;
      ballMat.emissive.set(skin.emissive);
      ballMat.needsUpdate = true;
    },
    updateTrail: (trail, config) => {
      currentTrail = trail;
      currentConfig = config || trail.defaultConfig;
      primaryCol.set(currentConfig.primaryColor);
      secondaryCol.set(currentConfig.secondaryColor);
      particleMat.opacity = Math.min(1.0, 0.85 * currentConfig.glowIntensity);
      particleMat.needsUpdate = true;
    },
    emitBurst,
    clearParticles,
    dispose: () => {
      activeTexture.dispose();
      sphereGeo.dispose();
      ballMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleMesh.dispose();
    },
  };
}
