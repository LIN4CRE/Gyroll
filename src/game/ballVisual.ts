import * as THREE from 'three';
import { BallSkin, BallTrail, Vector3D } from './types';
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
  updateTrail: (trail: BallTrail) => void;
  emitBurst: (position: Vector3D, count?: number) => void;
  dispose: () => void;
}

const MAX_PARTICLES = 64;

export function createBallVisual(
  initialSkin: BallSkin,
  initialTrail: BallTrail,
  radius = 0.5
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

  // 4. Zero-GC Pooled Particle Trail (InstancedMesh)
  const particleGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const particleMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(initialTrail.particleColor),
    transparent: true,
    opacity: 0.8,
  });
  const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(particleMesh);

  // Particle pool state arrays
  const particlePositions = new Float32Array(MAX_PARTICLES * 3);
  const particleVelocities = new Float32Array(MAX_PARTICLES * 3);
  const particleLifespans = new Float32Array(MAX_PARTICLES);
  const particleMaxLifespans = new Float32Array(MAX_PARTICLES);
  let nextParticleIdx = 0;
  let trailSpawnTimer = 0;

  const dummyMatrix = new THREE.Matrix4();
  const dummyScale = new THREE.Vector3();
  const dummyPos = new THREE.Vector3();

  // Initialize particles offscreen
  for (let i = 0; i < MAX_PARTICLES; i++) {
    dummyMatrix.makeScale(0, 0, 0);
    particleMesh.setMatrixAt(i, dummyMatrix);
  }
  particleMesh.instanceMatrix.needsUpdate = true;

  function spawnParticle(x: number, y: number, z: number, vx = 0, vy = 0, vz = 0, life = 0.5) {
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
  }

  function emitBurst(pos: Vector3D, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      spawnParticle(
        pos.x,
        pos.y,
        pos.z,
        Math.cos(angle) * speed,
        1.5 + Math.random() * 3,
        Math.sin(angle) * speed,
        0.35 + Math.random() * 0.3
      );
    }
  }

  return {
    group,
    ballMesh,
    shadowMesh,
    update: (pos, rot, groundY, onGround, dt, speed) => {
      // Position ball
      ballMesh.position.set(pos.x, pos.y, pos.z);
      ballMesh.rotation.copy(rot);

      // Position contact shadow directly beneath on ground surface
      if (onGround && pos.y >= groundY - 0.2) {
        shadowMesh.visible = true;
        shadowMesh.position.set(pos.x, groundY + 0.02, pos.z);
        // Fade shadow with height if slightly airborne
        const heightAboveGround = Math.max(0, pos.y - (groundY + radius));
        shadowMat.opacity = Math.max(0, 0.45 - heightAboveGround * 0.2);
        const scale = 1 + heightAboveGround * 0.3;
        shadowMesh.scale.set(scale, scale, scale);
      } else {
        shadowMesh.visible = false;
      }

      // Update particle trails
      trailSpawnTimer += dt;
      if (initialTrail.particleType !== 'none' && trailSpawnTimer > 0.04 && speed > 1.5) {
        trailSpawnTimer = 0;
        spawnParticle(
          pos.x + (Math.random() - 0.5) * 0.2,
          pos.y + (Math.random() - 0.5) * 0.2,
          pos.z + radius * 0.8,
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.8,
          1.0 + Math.random() * 1.5,
          0.45
        );
      }

      // Tick active particles
      let hasAliveParticles = false;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (particleLifespans[i] > 0) {
          hasAliveParticles = true;
          particleLifespans[i] -= dt;

          particlePositions[i * 3] += particleVelocities[i * 3] * dt;
          particlePositions[i * 3 + 1] += particleVelocities[i * 3 + 1] * dt;
          particlePositions[i * 3 + 2] += particleVelocities[i * 3 + 2] * dt;

          const lifeRatio = Math.max(0, particleLifespans[i] / particleMaxLifespans[i]);
          const currentScale = lifeRatio * 1.0;

          dummyPos.set(
            particlePositions[i * 3],
            particlePositions[i * 3 + 1],
            particlePositions[i * 3 + 2]
          );
          dummyScale.set(currentScale, currentScale, currentScale);
          dummyMatrix.makeTranslation(dummyPos.x, dummyPos.y, dummyPos.z);
          dummyMatrix.scale(dummyScale);
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
    updateTrail: (trail) => {
      initialTrail = trail;
      particleMat.color.set(trail.particleColor);
      particleMat.needsUpdate = true;
    },
    emitBurst,
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
