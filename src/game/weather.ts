import * as THREE from 'three';
import { Vector3D, WeatherType } from './types';

export interface WeatherSystem {
  points: THREE.Points;
  update: (focusPos: Vector3D, dt: number, elapsedTime: number) => void;
  dispose: () => void;
}

const PARTICLE_COUNT = 160;
const BOUNDS_X = 24;
const BOUNDS_Y = 16;
const BOUNDS_Z = 36;

export function createWeatherSystem(type: WeatherType): WeatherSystem | null {
  if (type === 'none' || !type) return null;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);

  let pointColor = 0xffffff;
  let pointSize = 0.12;

  if (type === 'snow') {
    pointColor = 0xe0f2fe; // Crisp ice blue-white
    pointSize = 0.14;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * BOUNDS_X;
      positions[i * 3 + 1] = Math.random() * BOUNDS_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS_Z;

      velocities[i * 3] = (Math.random() - 0.5) * 0.8;
      velocities[i * 3 + 1] = -1.8 - Math.random() * 1.5;
      velocities[i * 3 + 2] = -0.5 + Math.random() * 1.0;
    }
  } else if (type === 'rain') {
    pointColor = 0x38bdf8; // Neon cyan drizzle
    pointSize = 0.09;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * BOUNDS_X;
      positions[i * 3 + 1] = Math.random() * BOUNDS_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS_Z;

      velocities[i * 3] = -1.2;
      velocities[i * 3 + 1] = -16.0 - Math.random() * 6.0;
      velocities[i * 3 + 2] = -2.0;
    }
  } else if (type === 'embers') {
    pointColor = 0xf97316; // Fiery molten amber
    pointSize = 0.13;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * BOUNDS_X;
      positions[i * 3 + 1] = Math.random() * BOUNDS_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS_Z;

      velocities[i * 3] = (Math.random() - 0.5) * 1.5;
      velocities[i * 3 + 1] = 2.0 + Math.random() * 2.5; // Rise up
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: pointColor,
    size: pointSize,
    transparent: true,
    opacity: type === 'rain' ? 0.65 : 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  return {
    points,
    update: (focusPos, dt, elapsedTime) => {
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      const halfX = BOUNDS_X / 2;
      const halfZ = BOUNDS_Z / 2;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let x = array[i * 3];
        let y = array[i * 3 + 1];
        let z = array[i * 3 + 2];

        // Velocity integration
        if (type === 'snow') {
          // Subtle horizontal drift sway
          const sway = Math.sin(elapsedTime * 1.5 + i) * 0.4;
          x += (velocities[i * 3] + sway) * dt;
          y += velocities[i * 3 + 1] * dt;
          z += velocities[i * 3 + 2] * dt;
        } else {
          x += velocities[i * 3] * dt;
          y += velocities[i * 3 + 1] * dt;
          z += velocities[i * 3 + 2] * dt;
        }

        // Bounded wrapping relative to focus position (ball/camera)
        const relX = x - focusPos.x;
        const relY = y - focusPos.y;
        const relZ = z - focusPos.z;

        if (relX < -halfX) x += BOUNDS_X;
        else if (relX > halfX) x -= BOUNDS_X;

        if (type === 'embers') {
          if (relY > BOUNDS_Y) y -= BOUNDS_Y;
          else if (relY < -2) y += BOUNDS_Y;
        } else {
          if (relY < -2) y += BOUNDS_Y;
          else if (relY > BOUNDS_Y) y -= BOUNDS_Y;
        }

        if (relZ < -halfZ) z += BOUNDS_Z;
        else if (relZ > halfZ) z -= BOUNDS_Z;

        array[i * 3] = x;
        array[i * 3 + 1] = y;
        array[i * 3 + 2] = z;
      }

      posAttr.needsUpdate = true;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
