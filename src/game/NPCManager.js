import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const NPCS = [
  {
    id: "oracle_lyra",
    name: "Lyra",
    role: "Chronicle Oracle",
    tone: "calm, strategic, mystical",
    goal: "help players navigate high-value opportunities",
    knowledge: "world lore, high-level strategy, long-term play",
    challengeFocus: "lore and art direction",
    voiceProfile: "alloy",
    url: "/models/npc/robot-expressive.glb",
    position: new THREE.Vector3(-12, 0, -25),
    scale: 0.35,
    speed: 0.75,
  },
  {
    id: "trader_quill",
    name: "Quill",
    role: "Market Broker",
    tone: "fast, practical, witty",
    goal: "guide efficient quest and resource choices",
    knowledge: "trading routes, optimization, local events",
    challengeFocus: "market trend and virality",
    voiceProfile: "verse",
    url: "/models/npc/cesium-man.glb",
    position: new THREE.Vector3(16, 0, 28),
    scale: 1.45,
    speed: 0.9,
  },
  {
    id: "warden_kael",
    name: "Kael",
    role: "Frontier Warden",
    tone: "grounded, direct, protective",
    goal: "prepare players for risky zones and survival",
    knowledge: "combat prep, hazard management, route safety",
    challengeFocus: "risk and execution pressure",
    voiceProfile: "echo",
    url: "/models/npc/guardian-soldier.glb",
    position: new THREE.Vector3(50, 0, 10),
    scale: 1.6,
    speed: 0.8,
  },
];

export class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.entries = [];
  }

  async init() {
    for (const [index, npc] of NPCS.entries()) {
      const gltf = await this.loader.loadAsync(npc.url);
      const instance = gltf.scene;
      instance.position.copy(npc.position);
      instance.scale.setScalar(npc.scale);
      instance.rotation.y = Math.PI * Math.random();
      instance.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      const mixer = new THREE.AnimationMixer(instance);
      const clip = gltf.animations[0];
      if (clip) {
        const action = mixer.clipAction(clip);
        action.timeScale = npc.speed;
        action.play();
      }

      this.entries.push({
        npc,
        root: instance,
        mixer,
        orbitCenter: npc.position.clone(),
        orbitRadius: 3 + index * 2,
        orbitSpeed: 0.15 + index * 0.06,
        orbitOffset: Math.random() * Math.PI * 2,
        bobPhase: Math.random() * Math.PI * 2,
      });
      this.scene.add(instance);
    }
  }

  update(delta, elapsed) {
    for (const entry of this.entries) {
      entry.mixer.update(delta);
      const angle = elapsed * entry.orbitSpeed + entry.orbitOffset;
      const c = entry.orbitCenter;
      entry.root.position.x = c.x + Math.cos(angle) * entry.orbitRadius;
      entry.root.position.z = c.z + Math.sin(angle) * entry.orbitRadius;
      entry.root.position.y = c.y;
      entry.root.rotation.y = angle + Math.PI / 2 + Math.PI;
    }
  }

  getNearestInteractiveNpc(position, threshold = 7) {
    if (!position) return null;
    let closest = null;
    for (const entry of this.entries) {
      const distance = entry.root.position.distanceTo(position);
      if (distance > threshold) continue;
      if (!closest || distance < closest.distance) {
        closest = { ...entry.npc, distance };
      }
    }
    return closest;
  }

  getRoster() {
    return this.entries.map((entry) => entry.npc);
  }

  getJudgeForRound(round) {
    const roster = this.getRoster();
    if (!roster.length) return null;
    return roster[(round - 1) % roster.length];
  }
}
