import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function createTreePrototype() {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x5e3d2b, roughness: 0.95 })
  );
  trunk.position.y = 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const leavesMaterial = new THREE.MeshStandardMaterial({
    color: 0x355d2e,
    roughness: 0.9,
    metalness: 0,
  });
  const crownA = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.5, 12), leavesMaterial);
  crownA.position.y = 5;
  crownA.castShadow = true;
  crownA.receiveShadow = true;
  tree.add(crownA);

  const crownB = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.5, 12), leavesMaterial);
  crownB.position.y = 7.1;
  crownB.castShadow = true;
  tree.add(crownB);

  return tree;
}

function createPropCluster() {
  const cluster = new THREE.Group();
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x6ec9ff,
    emissive: 0x1d5db0,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.25,
  });
  const crystalGeo = new THREE.OctahedronGeometry(0.8, 0);
  for (let i = 0; i < 4; i += 1) {
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set((Math.random() - 0.5) * 2.2, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 2.2);
    crystal.scale.setScalar(0.6 + Math.random() * 0.8);
    crystal.castShadow = true;
    cluster.add(crystal);
  }
  return cluster;
}

function createCollectibleOrb() {
  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffd36e,
      emissive: 0xb86f0e,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.35,
    })
  );
  orb.castShadow = true;
  return orb;
}

export async function createEnvironment() {
  const envGroup = new THREE.Group();
  const collectibles = [];

  const grassTex = new THREE.TextureLoader().load("/textures/grass.jpg");
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(35, 35);
  grassTex.colorSpace = THREE.SRGBColorSpace;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 320),
    new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.95,
      metalness: 0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  envGroup.add(ground);

  const treePrototype = createTreePrototype();
  for (let i = 0; i < 65; i += 1) {
    const tree = treePrototype.clone();
    const radius = 35 + Math.random() * 110;
    const angle = Math.random() * Math.PI * 2;
    const posX = Math.cos(angle) * radius;
    const posZ = Math.sin(angle) * radius;

    if (Math.hypot(posX - 30, posZ + 10) < 45) {
      continue;
    }

    const scale = 0.8 + Math.random() * 1.4;
    tree.position.set(posX, 0, posZ);
    tree.scale.setScalar(scale);
    tree.rotation.y = Math.random() * Math.PI;
    envGroup.add(tree);
  }

  const loader = new GLTFLoader();
  const [avocadoGltf, boomboxGltf] = await Promise.all([
    loader.loadAsync("/models/props/avocado.glb"),
    loader.loadAsync("/models/props/boombox.glb"),
  ]);

  const boomboxZone = new THREE.Group();
  boomboxZone.position.set(22, 0, -12);
  for (let i = 0; i < 4; i += 1) {
    const item = boomboxGltf.scene.clone(true);
    item.position.set((i - 1.5) * 2.8, 0.2, Math.sin(i) * 1.5);
    item.scale.setScalar(35);
    item.rotation.y = i * 0.7;
    boomboxZone.add(item);
  }
  envGroup.add(boomboxZone);

  const marketZone = new THREE.Group();
  marketZone.position.set(-18, 0, 16);
  for (let i = 0; i < 6; i += 1) {
    const item = avocadoGltf.scene.clone(true);
    item.position.set((i % 3) * 2.4 - 2.4, 0.25, Math.floor(i / 3) * 2.6 - 1.3);
    item.scale.setScalar(0.08 + Math.random() * 0.03);
    item.rotation.y = Math.random() * Math.PI * 2;
    marketZone.add(item);
  }
  envGroup.add(marketZone);

  for (let i = 0; i < 10; i += 1) {
    const cluster = createPropCluster();
    const radius = 18 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;
    cluster.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    envGroup.add(cluster);
  }

  for (let i = 0; i < 12; i += 1) {
    const orb = createCollectibleOrb();
    const radius = 10 + Math.random() * 70;
    const angle = Math.random() * Math.PI * 2;
    orb.position.set(Math.cos(angle) * radius, 1.1, Math.sin(angle) * radius);
    orb.userData.collectible = true;
    collectibles.push(orb);
    envGroup.add(orb);
  }

  envGroup.userData.collectibles = collectibles;

  return envGroup;
}
