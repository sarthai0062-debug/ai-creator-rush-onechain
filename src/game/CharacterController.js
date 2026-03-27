import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class CharacterController {
  constructor(scene, controls, getThirdPerson) {
    this.scene = scene;
    this.controls = controls;
    this.getThirdPerson = getThirdPerson;
    this.keys = { w: false, a: false, s: false, d: false, shift: false };
    this.speed = 5.5;
    this.runMultiplier = 1.85;
    this.model = null;
    this.mixer = null;
    this.actions = new Map();
    this.currentAction = "";
    this.tempVec = new THREE.Vector3();
    /** glTF forward vs world; keeps Soldier walk cycle aligned with travel direction */
    this.facingOffset = Math.PI;
  }

  async init() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync("/models/soldier.glb");
    this.model = gltf.scene;
    this.model.position.set(0, 0, 0);
    this.model.scale.setScalar(1.6);
    this.model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.scene.add(this.model);
    this.model.rotation.y = this.facingOffset;

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of gltf.animations) {
      this.actions.set(clip.name.toLowerCase(), this.mixer.clipAction(clip));
    }
    this.fadeTo("idle", 0);
    this.bindInput();
  }

  bindInput() {
    const keyMap = {
      KeyW: "w",
      KeyA: "a",
      KeyS: "s",
      KeyD: "d",
    };
    window.addEventListener("keydown", (event) => {
      const mapped = keyMap[event.code];
      if (mapped) this.keys[mapped] = true;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") this.keys.shift = true;
    });
    window.addEventListener("keyup", (event) => {
      const mapped = keyMap[event.code];
      if (mapped) this.keys[mapped] = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") this.keys.shift = false;
    });
  }

  isSprinting() {
    return Boolean(this.keys.shift);
  }

  fadeTo(name, duration = 0.25) {
    if (this.currentAction === name) return;
    const nextAction = this.actions.get(name);
    if (!nextAction) return;
    const current = this.actions.get(this.currentAction);
    if (current) current.fadeOut(duration);
    nextAction.reset().fadeIn(duration).play();
    this.currentAction = name;
  }

  /**
   * @param {{ forward: THREE.Vector3; right: THREE.Vector3 } | null} basis - Horizontal camera-relative axes (from World after controls / FP camera are current).
   */
  update(delta, basis) {
    if (!this.model || !this.mixer) return;

    this.mixer.update(delta);

    let forwardInput = 0;
    if (this.keys.w) forwardInput += 1;
    if (this.keys.s) forwardInput -= 1;
    let strafeInput = 0;
    if (this.keys.d) strafeInput += 1;
    if (this.keys.a) strafeInput -= 1;

    const moving = forwardInput !== 0 || strafeInput !== 0;
    if (moving && basis) {
      const moveSpeed = this.speed * (this.keys.shift ? this.runMultiplier : 1);

      this.tempVec.set(0, 0, 0);
      this.tempVec.addScaledVector(basis.forward, forwardInput);
      this.tempVec.addScaledVector(basis.right, strafeInput);

      if (this.tempVec.lengthSq() > 1e-8) {
        this.tempVec.normalize();
      }

      this.model.position.addScaledVector(this.tempVec, moveSpeed * delta);
      const targetYaw = Math.atan2(this.tempVec.x, this.tempVec.z) + this.facingOffset;
      this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, targetYaw, 0.2);

      this.fadeTo(this.keys.shift ? "run" : "walk");
    } else {
      this.fadeTo("idle");
    }

    if (this.getThirdPerson?.() && this.controls?.target) {
      const focus = this.model.position.clone();
      focus.y += 1.7;
      this.controls.target.lerp(focus, 0.22);
    }
  }
}
