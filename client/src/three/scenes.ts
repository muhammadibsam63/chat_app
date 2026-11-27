import * as THREE from 'three';
import { SceneContext, SceneInstance, studioEnvironment } from './engine';

export type UniverseNode = { slug: string; title: string; index: string };

/**
 * Nine-project universe: each project is a metallic node arranged on an
 * asymmetric orbital shell with depth layering and sequential connective arcs.
 * Clicking a node reports its index so the page can open the case study.
 */
export function createProjectUniverse(ctx: SceneContext, nodes: UniverseNode[]): SceneInstance {
  const { scene, camera, quality, renderer, reduced } = ctx;
  const dense = quality > 0.7;

  scene.environment = studioEnvironment(renderer);
  scene.fog = new THREE.FogExp2(0x050505, 0.07);

  camera.position.set(0, 0.35, dense ? 6.4 : 7.4);

  scene.add(new THREE.AmbientLight(0x1a1a1a, 1.2));
  const key = new THREE.DirectionalLight(0xffe08a, 2.6);
  key.position.set(-3.4, 4.2, 4.2);
  const rim = new THREE.DirectionalLight(0xbfd0ff, 0.9);
  rim.position.set(4, -2.4, -4.6);
  scene.add(key, rim);

  const group = new THREE.Group();
  scene.add(group);

  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0x2a2313,
    metalness: 0.95,
    roughness: 0.24,
    emissive: 0xffd600,
    emissiveIntensity: 0.16,
    envMapIntensity: 1.5,
  });

  const activeMat = nodeMat.clone();
  activeMat.emissiveIntensity = 0.95;
  activeMat.color = new THREE.Color(0x6b5510);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd600,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
  });

  const positions: THREE.Vector3[] = [];
  const meshes: THREE.Mesh[] = [];
  const halos: THREE.Mesh[] = [];

  const count = Math.max(1, nodes.length);

  nodes.forEach((node, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const tier = i % 3;
    const radius = 2.15 + tier * 0.42;
    const height = Math.sin(i * 1.35) * 0.62;
    const position = new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius * 0.55,
    );
    positions.push(position);

    const geometry = new THREE.IcosahedronGeometry(tier === 0 ? 0.19 : 0.15, 0);
    const mesh = new THREE.Mesh(geometry, nodeMat);
    mesh.position.copy(position);
    mesh.userData.index = i;
    mesh.userData.slug = node.slug;
    mesh.userData.title = node.title;
    mesh.userData.ordinal = node.index;
    group.add(mesh);
    meshes.push(mesh);

    const halo = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.285, dense ? 64 : 40), ringMat);
    halo.position.copy(position);
    halo.lookAt(0, 0, 0);
    group.add(halo);
    halos.push(halo);
  });

  // sequential connective arcs through every node
  const curvePoints = positions.length > 1 ? positions : [];
  if (curvePoints.length > 1) {
    const curve = new THREE.CatmullRomCurve3([...curvePoints, curvePoints[0]], true, 'catmullrom', 0.4);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(dense ? 420 : 240));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffd600,
      transparent: true,
      opacity: 0.2,
    });
    group.add(new THREE.Line(lineGeo, lineMat));
  }

  // sparse dust for depth
  const dustCount = dense ? 620 : 260;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    const r = 2.6 + Math.random() * 3.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    dustPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    dustPositions[i * 3 + 1] = r * Math.cos(phi) * 0.5;
    dustPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xfff0a3,
      size: 0.022,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(dust);

  let active = -1;

  const applyActive = () => {
    meshes.forEach((mesh, i) => {
      const isActive = i === active;
      mesh.material = isActive ? activeMat : nodeMat;
      const targetScale = isActive ? 1.55 : 1;
      mesh.scale.setScalar(targetScale);
      halos[i].material = ringMat;
      (halos[i].material as THREE.MeshBasicMaterial).opacity = isActive ? 0.8 : 0.3;
    });
  };

  applyActive();

  return {
    targets: () => meshes,
    setActive: (index: number) => {
      active = index;
      applyActive();
    },
    update: (elapsed) => {
      const progress = ctx.scroll();
      group.rotation.y = elapsed * 0.07 + progress * 0.9;
      group.rotation.x = Math.sin(elapsed * 0.16) * 0.05;

      meshes.forEach((mesh, i) => {
        mesh.rotation.y = elapsed * 0.4 + i;
        mesh.rotation.x = elapsed * 0.22 + i * 0.4;
        if (i !== active) {
          const breathe = 0.92 + Math.sin(elapsed * 1.3 + i) * 0.08;
          mesh.scale.setScalar(breathe);
        }
        halos[i].rotation.z = elapsed * 0.25 + i;
      });

      dust.rotation.y = -elapsed * 0.02;

      const camZ = (dense ? 6.4 : 7.4) - progress * 1.1;
      camera.position.z += (camZ - camera.position.z) * 0.05;
      camera.position.y = 0.35 + progress * 0.4;
      camera.lookAt(0, 0, 0);
    },
    dispose: () => {
      activeMat.dispose();
      ringMat.dispose();
    },
  };
}

export type TechNode = { name: string; tier: 'core' | 'familiar' | 'learning' };

/** Technology constellation on a fibonacci shell with proximity links. */
export function createTechConstellation(ctx: SceneContext, techs: TechNode[]): SceneInstance {
  const { scene, camera, quality, renderer } = ctx;
  const dense = quality > 0.7;

  scene.environment = studioEnvironment(renderer);
  scene.fog = new THREE.FogExp2(0x050505, 0.06);

  camera.position.set(0, 0.15, dense ? 5.5 : 6.4);

  scene.add(new THREE.AmbientLight(0x1c1c1c, 1.3));
  const key = new THREE.DirectionalLight(0xffe08a, 2.2);
  key.position.set(-3.6, 4, 3.8);
  const rim = new THREE.DirectionalLight(0xbfd0ff, 0.85);
  rim.position.set(3.8, -2, -4);
  scene.add(key, rim);

  const group = new THREE.Group();
  scene.add(group);

  const positions: THREE.Vector3[] = [];
  const count = techs.length;
  const radius = 2.5;

  for (let i = 0; i < count; i += 1) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
    positions.push(
      new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) * 0.82,
        radius * Math.sin(phi) * Math.sin(theta),
      ),
    );
  }

  const tierColor = {
    core: new THREE.Color(0xffd600),
    familiar: new THREE.Color(0xd6ad45),
    learning: new THREE.Color(0x8a8a8a),
  };

  const meshes: THREE.Mesh[] = [];

  techs.forEach((tech, i) => {
    const size = tech.tier === 'core' ? 0.085 : tech.tier === 'familiar' ? 0.068 : 0.052;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1d1a10,
      metalness: 0.9,
      roughness: 0.3,
      emissive: tierColor[tech.tier],
      emissiveIntensity: tech.tier === 'core' ? 0.85 : tech.tier === 'familiar' ? 0.5 : 0.28,
      envMapIntensity: 1.4,
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), mat);
    mesh.position.copy(positions[i]);
    mesh.userData.index = i;
    mesh.userData.name = tech.name;
    group.add(mesh);
    meshes.push(mesh);
  });

  // proximity links
  const linkPairs: THREE.Vector3[] = [];
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      if (positions[i].distanceTo(positions[j]) < 1.55) {
        linkPairs.push(positions[i], positions[j]);
      }
    }
  }

  if (linkPairs.length > 0) {
    const linkGeo = new THREE.BufferGeometry().setFromPoints(linkPairs);
    group.add(
      new THREE.LineSegments(
        linkGeo,
        new THREE.LineBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.16 }),
      ),
    );
  }

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.985, dense ? 48 : 28, dense ? 32 : 20),
    new THREE.MeshBasicMaterial({
      color: 0xffd600,
      wireframe: true,
      transparent: true,
      opacity: 0.035,
    }),
  );
  group.add(shell);

  let active = -1;

  return {
    targets: () => meshes,
    setActive: (index: number) => {
      active = index;
      meshes.forEach((mesh, i) => {
        mesh.scale.setScalar(i === index ? 2.1 : 1);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = i === index ? 1.6 : techs[i].tier === 'core' ? 0.85 : 0.4;
      });
    },
    update: (elapsed) => {
      const progress = ctx.scroll();
      group.rotation.y = elapsed * 0.055 + progress * 0.8;
      group.rotation.x = Math.sin(elapsed * 0.14) * 0.06;

      meshes.forEach((mesh, i) => {
        mesh.rotation.y = elapsed * 0.5 + i * 0.3;
        if (i !== active) {
          mesh.scale.setScalar(0.94 + Math.sin(elapsed * 1.6 + i) * 0.06);
        }
      });

      const camZ = (dense ? 5.5 : 6.4) - progress * 0.9;
      camera.position.z += (camZ - camera.position.z) * 0.05;
      camera.lookAt(0, 0, 0);
    },
  };
}
