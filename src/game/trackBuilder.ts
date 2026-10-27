import * as THREE from 'three';
import { Obstacle, TrackDefinition, TrackSegment } from './types';
import { createTrackTexture } from './textures';

export interface BuiltTrack {
  group: THREE.Group;
  animatedObstacles: {
    mesh: THREE.Object3D;
    data: Obstacle;
  }[];
  checkpointMeshes: {
    index: number;
    ringMesh: THREE.Mesh;
    baseMesh: THREE.Object3D;
  }[];
  finishGateMesh: THREE.Object3D | null;
  dispose: () => void;
}

export function buildTrack3D(track: TrackDefinition): BuiltTrack {
  const group = new THREE.Group();
  const animatedObstacles: BuiltTrack['animatedObstacles'] = [];
  const checkpointMeshes: BuiltTrack['checkpointMeshes'] = [];
  let finishGateMesh: THREE.Object3D | null = null;

  // Track Textures
  const asphaltTex = createTrackTexture('asphalt');
  const boostTex = createTrackTexture('boost');
  const iceTex = createTrackTexture('ice');
  const hazardTex = createTrackTexture('hazard');

  // Materials
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.8,
    metalness: 0.1,
  });

  const boostMat = new THREE.MeshStandardMaterial({
    map: boostTex,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.4,
  });

  const iceMat = new THREE.MeshStandardMaterial({
    map: iceTex,
    roughness: 0.1,
    metalness: 0.6,
    transparent: true,
    opacity: 0.92,
  });

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.05,
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.25,
    metalness: 0.85,
  });

  const neonTrimMat = new THREE.MeshStandardMaterial({
    color: track.themeColor,
    emissive: new THREE.Color(track.themeColor),
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.5,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardTex,
    roughness: 0.4,
    metalness: 0.3,
  });

  // Track Segments
  for (const seg of track.segments) {
    const segGroup = new THREE.Group();

    const dx = seg.endX - seg.startX;
    const dy = seg.endY - seg.startY;
    const dz = seg.endZ - seg.startZ;
    const length = Math.hypot(dx, dy, dz);

    const midX = (seg.startX + seg.endX) / 2;
    const midY = (seg.startY + seg.endY) / 2;
    const midZ = (seg.startZ + seg.endZ) / 2;

    // Road Mesh (Composite: Surface slab + concrete underside)
    const thickness = 0.5;
    const roadGeo = new THREE.BoxGeometry(seg.width, thickness, length);

    // Pick surface material
    let surfaceMat = asphaltMat;
    if (seg.surface === 'boost') surfaceMat = boostMat;
    else if (seg.surface === 'ice') surfaceMat = iceMat;

    const roadMesh = new THREE.Mesh(roadGeo, surfaceMat);
    roadMesh.position.y = -thickness / 2;
    roadMesh.receiveShadow = true;
    roadMesh.castShadow = true;
    segGroup.add(roadMesh);

    // Beveled Underside Sub-structure (for 3D sky track realism)
    const underGeo = new THREE.BoxGeometry(seg.width * 0.85, 1.2, length * 0.98);
    const underMesh = new THREE.Mesh(underGeo, concreteMat);
    underMesh.position.y = -thickness - 0.6;
    underMesh.receiveShadow = true;
    segGroup.add(underMesh);

    // Neon edge trim strips along both sides
    const trimW = 0.15;
    const trimGeo = new THREE.BoxGeometry(trimW, 0.1, length);
    const leftTrim = new THREE.Mesh(trimGeo, neonTrimMat);
    leftTrim.position.set(-seg.width / 2 + trimW / 2, 0.05, 0);
    const rightTrim = new THREE.Mesh(trimGeo, neonTrimMat);
    rightTrim.position.set(seg.width / 2 - trimW / 2, 0.05, 0);
    segGroup.add(leftTrim, rightTrim);

    // Rails / Guard walls if enabled
    if (seg.hasRails) {
      const railH = seg.railHeight ?? 1.0;
      const railThick = 0.22;
      const railGeo = new THREE.BoxGeometry(railThick, railH, length);

      const leftRail = new THREE.Mesh(railGeo, railMat);
      leftRail.position.set(-seg.width / 2 + railThick / 2, railH / 2, 0);
      leftRail.castShadow = true;
      leftRail.receiveShadow = true;

      const rightRail = new THREE.Mesh(railGeo, railMat);
      rightRail.position.set(seg.width / 2 - railThick / 2, railH / 2, 0);
      rightRail.castShadow = true;
      rightRail.receiveShadow = true;

      segGroup.add(leftRail, rightRail);
    }

    // Orient and position segment accurately matching physics trajectory
    segGroup.position.set(midX, midY, midZ);

    if (length > 0.001) {
      const segDir = new THREE.Vector3(dx, dy, dz).normalize();
      segGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), segDir);
    }

    // Vertical structural pillar support descending into sky fog
    if (Math.abs(dz) > 15) {
      const pillarGeo = new THREE.CylinderGeometry(0.8, 1.2, 35, 12);
      const pillar = new THREE.Mesh(pillarGeo, concreteMat);
      pillar.position.set(midX, midY - 18, midZ);
      pillar.receiveShadow = true;
      group.add(pillar);
    }

    group.add(segGroup);
  }

  // Build Obstacles
  for (const obs of track.obstacles) {
    if (obs.type === 'checkpoint') {
      const cpGroup = new THREE.Group();
      cpGroup.position.set(obs.position.x, obs.position.y, obs.position.z);

      // 1. Two side support pylons (composite: base plate + pillar + collar)
      const pylonGeo = new THREE.BoxGeometry(0.5, obs.size.y, 0.5);
      const leftPylon = new THREE.Mesh(pylonGeo, railMat);
      leftPylon.position.set(-obs.size.x / 2 + 0.3, obs.size.y / 2, 0);
      leftPylon.castShadow = true;

      const rightPylon = new THREE.Mesh(pylonGeo, railMat);
      rightPylon.position.set(obs.size.x / 2 - 0.3, obs.size.y / 2, 0);
      rightPylon.castShadow = true;

      // 2. Glowing Overhead Arch
      const archGeo = new THREE.BoxGeometry(obs.size.x, 0.4, 0.6);
      const archMesh = new THREE.Mesh(archGeo, neonTrimMat);
      archMesh.position.set(0, obs.size.y, 0);

      // 3. Glowing Torus Ring (Energy Field)
      const ringGeo = new THREE.TorusGeometry(obs.size.x * 0.38, 0.08, 12, 32);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x0284c7),
        emissiveIntensity: 1.2,
        roughness: 0.1,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(0, obs.size.y * 0.5, 0);

      // 4. Chevron Arrow pointing forward
      const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
      const arrowMesh = new THREE.Mesh(arrowGeo, neonTrimMat);
      arrowMesh.position.set(0, obs.size.y + 0.5, 0);
      arrowMesh.rotation.x = Math.PI / 2;

      cpGroup.add(leftPylon, rightPylon, archMesh, ringMesh, arrowMesh);
      group.add(cpGroup);

      checkpointMeshes.push({
        index: obs.index,
        ringMesh,
        baseMesh: cpGroup,
      });
      continue;
    }

    if (obs.type === 'finish_gate') {
      const fgGroup = new THREE.Group();
      fgGroup.position.set(obs.position.x, obs.position.y, obs.position.z);

      // Grand Dual Arch with checkered banner
      const colGeo = new THREE.BoxGeometry(0.8, obs.size.y + 1, 0.8);
      const leftCol = new THREE.Mesh(colGeo, concreteMat);
      leftCol.position.set(-obs.size.x / 2 + 0.4, (obs.size.y + 1) / 2, 0);
      leftCol.castShadow = true;

      const rightCol = new THREE.Mesh(colGeo, concreteMat);
      rightCol.position.set(obs.size.x / 2 - 0.4, (obs.size.y + 1) / 2, 0);
      rightCol.castShadow = true;

      // Banner Crossbar
      const bannerGeo = new THREE.BoxGeometry(obs.size.x, 1.2, 0.5);
      const bannerMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: new THREE.Color(0x854d0e),
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.8,
      });
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(0, obs.size.y + 0.5, 0);

      // Gold Trophy Emblem rotating on top
      const starGeo = new THREE.OctahedronGeometry(0.8, 0);
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: new THREE.Color(0xb45309),
        emissiveIntensity: 0.7,
        metalness: 0.95,
        roughness: 0.1,
      });
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.set(0, obs.size.y + 1.8, 0);

      fgGroup.add(leftCol, rightCol, banner, starMesh);
      group.add(fgGroup);

      finishGateMesh = fgGroup;
      animatedObstacles.push({ mesh: starMesh, data: obs });
      continue;
    }

    if (obs.type === 'swinging_hammer') {
      const hammerRig = new THREE.Group();
      hammerRig.position.set(obs.position.x, obs.position.y + obs.pivotHeight, obs.position.z);

      // Overhead Mounting Bracket
      const mountGeo = new THREE.BoxGeometry(1.6, 0.5, 1.0);
      const mountMesh = new THREE.Mesh(mountGeo, concreteMat);
      hammerRig.add(mountMesh);

      // Pendulum Pivot Arm + Hammer Head
      const armGroup = new THREE.Group();

      // Steel Arm Tube
      const armGeo = new THREE.CylinderGeometry(0.12, 0.12, obs.armLength, 12);
      const armMesh = new THREE.Mesh(armGeo, railMat);
      armMesh.position.y = -obs.armLength / 2;
      armMesh.castShadow = true;
      armGroup.add(armMesh);

      // Hammer Head (Heavy dual-faced beveled block)
      const headGeo = new THREE.BoxGeometry(
        obs.headRadius * 2.2,
        obs.headRadius * 1.8,
        obs.headRadius * 1.8
      );
      const headMesh = new THREE.Mesh(headGeo, hazardMat);
      headMesh.position.y = -obs.armLength;
      headMesh.castShadow = true;
      armGroup.add(headMesh);

      // Counterweight ball at top
      const cwGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const cwMesh = new THREE.Mesh(cwGeo, railMat);
      cwMesh.position.y = 0.4;
      armGroup.add(cwMesh);

      hammerRig.add(armGroup);
      group.add(hammerRig);

      animatedObstacles.push({ mesh: armGroup, data: obs });
      continue;
    }

    if (obs.type === 'rotating_bar') {
      const rotGroup = new THREE.Group();
      rotGroup.position.set(obs.position.x, obs.position.y, obs.position.z);

      // Center Spindle Hub
      const hubGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16);
      const hubMesh = new THREE.Mesh(hubGeo, railMat);
      hubMesh.castShadow = true;
      rotGroup.add(hubMesh);

      // Crossbar with hazard warning stripes
      const barGeo = new THREE.BoxGeometry(obs.length, obs.thickness, obs.thickness);
      const barMesh = new THREE.Mesh(barGeo, hazardMat);
      barMesh.castShadow = true;

      // Neon glowing tips
      const tipGeo = new THREE.BoxGeometry(0.2, obs.thickness * 1.1, obs.thickness * 1.1);
      const leftTip = new THREE.Mesh(tipGeo, neonTrimMat);
      leftTip.position.x = -obs.length / 2;
      const rightTip = new THREE.Mesh(tipGeo, neonTrimMat);
      rightTip.position.x = obs.length / 2;

      const rotatingPart = new THREE.Group();
      rotatingPart.add(barMesh, leftTip, rightTip);

      rotGroup.add(rotatingPart);
      group.add(rotGroup);

      animatedObstacles.push({ mesh: rotatingPart, data: obs });
      continue;
    }

    if (obs.type === 'rolling_boulder') {
      const boulderGeo = new THREE.DodecahedronGeometry(obs.radius, 1);
      const boulderMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.85,
        metalness: 0.2,
      });
      const boulderMesh = new THREE.Mesh(boulderGeo, boulderMat);
      boulderMesh.position.set(obs.position.x, obs.position.y + obs.radius, obs.position.z);
      boulderMesh.castShadow = true;

      // Glowing core band
      const bandGeo = new THREE.TorusGeometry(obs.radius * 0.98, 0.05, 8, 24);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: new THREE.Color(0xdc2626),
        emissiveIntensity: 0.9,
      });
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      boulderMesh.add(bandMesh);

      group.add(boulderMesh);
      animatedObstacles.push({ mesh: boulderMesh, data: obs });
      continue;
    }

    if (obs.type === 'slalom_gate') {
      const gateGroup = new THREE.Group();
      gateGroup.position.set(obs.position.x, obs.position.y, obs.position.z);

      const halfW = obs.size.x / 2;
      const poleGeo = new THREE.CylinderGeometry(obs.poleRadius, obs.poleRadius, obs.poleHeight, 12);
      const poleMat = new THREE.MeshStandardMaterial({
        color: obs.passSide === 'left' ? 0xef4444 : 0x3b82f6,
        roughness: 0.3,
        metalness: 0.5,
      });

      const leftPole = new THREE.Mesh(poleGeo, poleMat);
      leftPole.position.set(-halfW, obs.poleHeight / 2, 0);
      leftPole.castShadow = true;

      const rightPole = new THREE.Mesh(poleGeo, poleMat);
      rightPole.position.set(halfW, obs.poleHeight / 2, 0);
      rightPole.castShadow = true;

      // Base disc weights
      const baseGeo = new THREE.CylinderGeometry(obs.poleRadius * 2.2, obs.poleRadius * 2.5, 0.15, 12);
      const leftBase = new THREE.Mesh(baseGeo, concreteMat);
      leftBase.position.set(-halfW, 0.08, 0);
      const rightBase = new THREE.Mesh(baseGeo, concreteMat);
      rightBase.position.set(halfW, 0.08, 0);

      gateGroup.add(leftPole, rightPole, leftBase, rightBase);
      group.add(gateGroup);
      continue;
    }
  }

  return {
    group,
    animatedObstacles,
    checkpointMeshes,
    finishGateMesh,
    dispose: () => {
      asphaltTex.dispose();
      boostTex.dispose();
      iceTex.dispose();
      hazardTex.dispose();
    },
  };
}
