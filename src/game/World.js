import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { setupLighting } from "./Lighting.js";
import { createEnvironment } from "./Environment.js";
import { createLake } from "./WaterSystem.js";
import { CharacterController } from "./CharacterController.js";
import { NPCManager } from "./NPCManager.js";
import { PaintingStudio } from "./PaintingStudio.js";
import { GameState } from "./GameState.js";
import { ChallengeEngine } from "./ChallengeEngine.js";
import { DialogueHud } from "../ui/DialogueHud.js";
import { RunHud } from "../ui/RunHud.js";
import { NpcDialogueOrchestrator } from "../services/npcDialogueOrchestrator.js";
import { createSpeechPlayer } from "../services/nvidiaTts.js";

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fc2e8);
    this.scene.fog = new THREE.FogExp2(0x9ab8d1, 0.0068);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      650
    );
    this.camera.position.set(0, 4.2, 7);
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enabled = false;

    this.viewMode = "third";
    this.isFocusingPainting = false;
    this.isNearPainting = false;
    this.fpPitch = 0;
    this.fpYawOffset = 0;
    // Pointer-lock mouse sensitivity (FPS mode).
    this.mouseSensitivity = 0.001;
    this.thirdFollowTarget = null;
    this.thirdFollowDolly = new THREE.Vector3();
    this.thirdGoalPos = new THREE.Vector3();
    this.camRaycaster = new THREE.Raycaster();
    this.camLookAt = new THREE.Vector3();
    this.camDesiredPos = new THREE.Vector3();
    this.camToTarget = new THREE.Vector3();
    this.cameraBaseFov = 60;
    this.thirdCameraDistance = 5.6;
    this.thirdCameraHeight = 1.95;
    this.thirdCameraLerp = 0.14;
    this.thirdTargetLerp = 0.22;
    this.thirdCameraPitch = 0.38;
    this.thirdCameraYawOffset = Math.PI;
    this.thirdCollisionPadding = 0.45;
    this.initialCameraMode = "third";
    this.voiceMuted = false;
    this.preferredVoiceProfile = "default";
    this.onReady = null;
    this.onProgress = null;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.25,
      0.65,
      0.9
    );
    this.composer.addPass(this.bloomPass);

    this.character = new CharacterController(
      this.scene,
      this.controls,
      () => this.viewMode === "third" && !this.isFocusingPainting
    );
    this.npcs = new NPCManager(this.scene);
    this.paintingStudio = new PaintingStudio(this.scene);
    this.gameState = new GameState();
    this.challengeEngine = new ChallengeEngine();
    this.dialogueHud = new DialogueHud();
    this.runHud = new RunHud();
    this.dialogue = new NpcDialogueOrchestrator();
    this.speech = createSpeechPlayer();
    this.activeNpc = null;
    this.collectibles = [];
    this.waterSystem = null;
  }

  reportProgress(step, detail) {
    this.onProgress?.({ step, detail });
  }

  applySettings(settings = {}) {
    const nextSensitivity = Number(settings.mouseSensitivity);
    if (Number.isFinite(nextSensitivity)) {
      this.mouseSensitivity = THREE.MathUtils.clamp(nextSensitivity, 0.0004, 0.0032);
    }

    if (typeof settings.voiceMuted === "boolean") {
      this.voiceMuted = settings.voiceMuted;
      this.dialogueHud.setMuted(this.voiceMuted);
    }

    if (typeof settings.voiceProfile === "string" && settings.voiceProfile.trim()) {
      this.preferredVoiceProfile = settings.voiceProfile;
    }
    if (settings.cameraMode === "first" || settings.cameraMode === "third") {
      this.initialCameraMode = settings.cameraMode;
    }

    if (settings.qualityMode === "performance") {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  syncThirdPersonCameraFromCharacter() {
    const model = this.character.model;
    if (!model) return;

    const target = new THREE.Vector3(model.position.x, model.position.y + this.thirdCameraHeight, model.position.z);
    const travelForward = new THREE.Vector3();
    model.getWorldDirection(travelForward);
    travelForward.y = 0;
    if (travelForward.lengthSq() < 1e-8) travelForward.set(0, 0, -1);
    travelForward.normalize();
    const yaw = Math.atan2(travelForward.x, travelForward.z) + this.thirdCameraYawOffset;
    const horizontalDir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const verticalOffset = Math.tan(this.thirdCameraPitch) * this.thirdCameraDistance;
    const camPos = target
      .clone()
      .addScaledVector(horizontalDir, this.thirdCameraDistance)
      .add(new THREE.Vector3(0, verticalOffset, 0));

    this.controls.target.copy(target);
    this.camera.position.copy(camPos);
    this.camera.lookAt(target);
    this.thirdFollowTarget = target.clone();
    this.thirdFollowDolly.copy(camPos);
  }

  setViewMode(next) {
    if (next === this.viewMode) return;
    this.viewMode = next;

    if (next === "first") {
      this.speech.stop?.();
      this.controls.enabled = false;
      this.fpPitch = 0;
      this.fpYawOffset = 0;
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    } else {
      document.exitPointerLock?.();
      this.controls.enabled = false;
      this.thirdFollowTarget = null;
      this.thirdFollowDolly.set(0, 0, 0);
      this.syncThirdPersonCameraFromCharacter();
    }
    this.syncHudViewLabel?.();
  }

  toggleViewMode() {
    this.setViewMode(this.viewMode === "third" ? "first" : "third");
  }

  getCameraGroundBasis() {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-10) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up);
    if (right.lengthSq() < 1e-10) {
      right.set(1, 0, 0);
    } else {
      right.normalize();
    }
    return { forward, right };
  }

  updateFirstPersonCamera() {
    const model = this.character.model;
    if (!model) return;

    const eye = new THREE.Vector3(0, 1.68, 0);
    eye.applyMatrix4(model.matrixWorld);

    this.fpPitch = THREE.MathUtils.clamp(this.fpPitch, -Math.PI / 2.15, Math.PI / 2.15);
    const forward = new THREE.Vector3();
    model.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-8) forward.set(0, 0, -1);
    forward.normalize();
    const yawBase = Math.atan2(forward.x, forward.z);
    const yaw = yawBase + this.fpYawOffset;
    const euler = new THREE.Euler(this.fpPitch, yaw, 0, "YXZ");
    this.camera.position.copy(eye);
    this.camera.quaternion.setFromEuler(euler);
  }

  updateThirdPersonFollowCamera() {
    const model = this.character.model;
    if (!model) return;

    const target = new THREE.Vector3(model.position.x, model.position.y + this.thirdCameraHeight, model.position.z);
    if (!this.thirdFollowTarget) {
      this.thirdFollowTarget = target.clone();
    }
    this.thirdFollowTarget.lerp(target, this.thirdTargetLerp);
    if (this.thirdFollowDolly.lengthSq() < 1e-8) {
      this.thirdFollowDolly.copy(this.camera.position);
    }

    const travelForward = new THREE.Vector3();
    model.getWorldDirection(travelForward);
    travelForward.y = 0;
    if (travelForward.lengthSq() < 1e-8) travelForward.set(0, 0, -1);
    travelForward.normalize();
    const yaw = Math.atan2(travelForward.x, travelForward.z) + this.thirdCameraYawOffset;
    const horizontalDir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const verticalOffset = Math.tan(this.thirdCameraPitch) * this.thirdCameraDistance;

    this.camLookAt.copy(this.thirdFollowTarget);
    this.thirdGoalPos
      .copy(this.thirdFollowTarget)
      .addScaledVector(horizontalDir, this.thirdCameraDistance)
      .add(new THREE.Vector3(0, verticalOffset, 0));

    this.camDesiredPos.copy(this.thirdGoalPos);
    this.camToTarget.copy(this.camDesiredPos).sub(this.camLookAt);
    const distance = this.camToTarget.length();
    this.camRaycaster.set(this.camLookAt, this.camToTarget.clone().normalize());
    const hits = this.camRaycaster
      .intersectObjects(this.scene.children, true)
      .filter((hit) => {
        const obj = hit.object;
        return (
          !obj.userData?.collectible &&
          !obj.userData?.water &&
          !this.character?.model?.children?.includes(obj) &&
          obj !== this.character?.model
        );
      });
    if (hits.length > 0 && hits[0].distance < distance) {
      this.camDesiredPos.copy(this.camLookAt).addScaledVector(
        this.camToTarget.normalize(),
        Math.max(1.1, hits[0].distance - this.thirdCollisionPadding)
      );
    }

    this.thirdFollowDolly.lerp(this.camDesiredPos, this.thirdCameraLerp);
    this.camera.position.copy(this.thirdFollowDolly);
    this.controls.target.lerp(this.thirdFollowTarget, this.thirdTargetLerp);
    this.camera.lookAt(this.controls.target);
  }

  bindViewControls() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyV" && !e.repeat) {
        this.toggleViewMode();
        if (this.syncHudViewLabel) this.syncHudViewLabel();
      }

      if (e.code === "KeyF" && !e.repeat) {
        this.focusOnPainting();
      }
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (this.viewMode !== "first") return;
      if (document.pointerLockElement !== this.canvas) return;
      this.fpYawOffset -= e.movementX * this.mouseSensitivity;
      this.fpPitch -= e.movementY * this.mouseSensitivity;
    });

    this.canvas.addEventListener("click", () => {
      if (this.viewMode === "first" && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    });
  }

  focusOnPainting() {
    if (!this.paintingStudio?.group) return;
    this.setViewMode("third");
    this.thirdFollowTarget = null;
    this.isFocusingPainting = true;

    const pos = this.paintingStudio.group.position.clone();
    // Bring the player close so the easel/blank sheet is guaranteed in view.
    if (this.character?.model) {
      this.character.model.position.copy(pos).add(new THREE.Vector3(-1.8, 0, 1.5));
    }
    // Camera framing: closer and aimed so the easel/marker is visible below HUD.
    const target = pos.add(new THREE.Vector3(0, 3.8, 0));
    const camPos = pos.add(new THREE.Vector3(3.2, 2.6, 4.2));

    this.controls.target.copy(target);
    this.camera.position.copy(camPos);
    this.camera.lookAt(target);
    this.controls.update();

    // Let the camera settle for a moment; then restore normal follow behavior.
    window.setTimeout(() => {
      this.isFocusingPainting = false;
      this.thirdFollowTarget = null;
    }, 2200);
  }

  async start({ onProgress, onReady, settings } = {}) {
    this.onProgress = onProgress || null;
    this.onReady = onReady || null;
    this.applySettings(settings);
    this.reportProgress("init", "Booting world systems...");

    this.reportProgress("environment", "Building world environment...");
    const env = await createEnvironment();
    this.scene.add(env);
    this.collectibles = env.userData?.collectibles || [];

    this.reportProgress("water", "Preparing water simulation...");
    this.waterSystem = createLake();
    this.scene.add(this.waterSystem.water);

    this.reportProgress("lighting", "Configuring scene lighting...");
    await setupLighting(this.renderer, this.scene);
    this.reportProgress("character", "Loading player rig...");
    await this.character.init();
    this.reportProgress("npcs", "Spawning NPC actors...");
    await this.npcs.init();
    this.reportProgress("painting", "Setting up painting studio...");
    this.paintingStudio.init();

    this.syncHudViewLabel = () => {
      const el = document.getElementById("view-mode-label");
      if (el) {
        el.textContent =
          this.viewMode === "third"
            ? "View: Third-person chase cam (V for first-person)"
            : "View: First-person pointer look (V for chase cam)";
      }
    };

    this.viewMode = this.initialCameraMode === "first" ? "first" : "third";
    this.syncThirdPersonCameraFromCharacter();
    this.bindViewControls();
    this.syncHudViewLabel();
    this.bindPaintingUI();
    this.bindNpcDialogueUI();
    this.bindRunHud();
    this.runHud.setTopStats(this.gameState);
    this.runHud.setTimer(0);
    this.dialogueHud.setVoiceStatus(this.speech.getStatus());
    this.dialogueHud.setMuted(this.voiceMuted);
    this.dialogueHud.bindMuteChange((muted) => {
      this.voiceMuted = muted;
      if (muted) this.speech.stop();
    });

    window.addEventListener("resize", () => this.handleResize());
    this.reportProgress("ready", "World ready. Press Play to begin.");
    this.onReady?.();
    this.animate();
  }

  bindNpcDialogueUI() {
    this.dialogueHud.bindSend(async (message) => {
      if (!this.activeNpc) {
        this.dialogueHud.setReply("Move closer to an NPC before sending a message.");
        return;
      }
      this.dialogueHud.setBusy(true);
      this.dialogueHud.setReply("Thinking...");
      this.dialogueHud.markChecklistItem("streaming", true);
      try {
        const finalText = await this.dialogue.chat({
          npc: this.activeNpc,
          playerMessage: message,
          onChunk: (_, fullText) => this.dialogueHud.setReply(fullText),
        });
        this.dialogueHud.setReply(finalText);
        const chosenProfile =
          this.preferredVoiceProfile === "npc" ? this.activeNpc.voiceProfile : this.preferredVoiceProfile;
        if (!this.voiceMuted && !this.dialogueHud.isMuted()) {
          const status = await this.speech.speak(finalText, chosenProfile, "en-US");
          this.dialogueHud.setVoiceStatus(status);
          this.dialogueHud.markChecklistItem("voice", true);
        } else {
          this.speech.stop();
        }
        this.dialogueHud.clearInput();
      } catch (error) {
        this.dialogueHud.setReply(error.message || "NPC could not answer right now.");
      } finally {
        this.dialogueHud.setBusy(false);
      }
    });
  }

  bindRunHud() {
    this.runHud.bindStart(() => this.startRun());
    this.runHud.bindSubmit(() => this.submitActiveRun());
    this.runHud.bindNext(() => {
      this.runHud.hideSummary();
      this.startRun();
    });
  }

  beginGameplaySession() {
    this.setViewMode(this.initialCameraMode);
    this.runHud.hideSummary();
    if (this.gameState.phase === "idle") this.startRun();
  }

  setVoiceMuted(muted) {
    this.voiceMuted = Boolean(muted);
    this.dialogueHud.setMuted(this.voiceMuted);
    if (this.voiceMuted) this.speech.stop();
  }

  setPreferredVoiceProfile(profile) {
    if (!profile) return;
    this.preferredVoiceProfile = profile;
  }

  setMouseSensitivity(value) {
    const nextSensitivity = Number(value);
    if (!Number.isFinite(nextSensitivity)) return;
    this.mouseSensitivity = THREE.MathUtils.clamp(nextSensitivity, 0.0004, 0.0032);
  }

  setQualityMode(mode) {
    this.applySettings({ qualityMode: mode });
  }

  setInitialCameraMode(mode) {
    if (mode !== "first" && mode !== "third") return;
    this.initialCameraMode = mode;
    if (this.gameState.phase === "idle") {
      this.setViewMode(mode);
    }
  }

  startRun() {
    if (this.gameState.phase === "active" || this.gameState.phase === "judging") return;
    const challenge = this.challengeEngine.generate(this.gameState.round + 1);
    this.gameState.startChallenge(challenge);
    this.runHud.setObjective(
      `${challenge.objective} Constraints: ${challenge.constraints.join(" + ")}`
    );
    this.runHud.setRunActive(true);
    this.runHud.hideSummary();
  }

  async submitActiveRun() {
    const challenge = this.gameState.activeChallenge;
    if (!challenge || this.gameState.phase !== "active") return;
    this.gameState.phase = "judging";
    if (!this.gameState.lastGeneratedPrompt) {
      this.gameState.phase = "active";
      this.runHud.showSummary("Generate an artwork first, then submit.");
      return;
    }
    this.runHud.setRunActive(false);
    try {
      const judgeNpc = this.npcs.getJudgeForRound(this.gameState.round);
      const elapsedSec = this.gameState.getElapsedSec();
      const judgment = await this.dialogue.judgeChallenge({
        npc: judgeNpc || this.activeNpc,
        challenge,
        prompt: this.gameState.lastGeneratedPrompt,
        elapsedSec,
      });
      const timeLeft = this.gameState.getTimeLeftSec();
      const speedBonus = Math.max(0, Math.floor(timeLeft / 4));
      const totalScore = judgment.score + judgment.bonus + speedBonus;
      const reward = challenge.reward + Math.floor(totalScore / 6);
      const drop = this.challengeEngine.rollDrop(challenge.rarity);
      const success = judgment.verdict !== "fail";
      this.gameState.completeChallenge({
        scoreGain: totalScore,
        rewardGain: reward,
        success,
        drop,
      });
      this.runHud.setTopStats(this.gameState);
      this.runHud.showSummary(
        `${judgeNpc?.name || "Judge"} verdict: ${judgment.reason} Score +${totalScore}, Credits +${reward}, Drop: ${drop}. Session best: ${this.gameState.sessionBest}.`
      );
      this.runHud.setObjective("Round complete. Hit Play Next Round for another challenge.");
    } catch (error) {
      this.runHud.showSummary(error.message || "Judging failed. Try submitting again.");
    } finally {
      this.gameState.resetToIdle();
      this.runHud.setRunActive(false);
      window.setTimeout(() => {
        if (this.gameState.phase === "idle") this.startRun();
      }, 1300);
    }
  }

  bindPaintingUI() {
    const promptInput = document.getElementById("painting-prompt");
    const generateBtn = document.getElementById("generate-painting-btn");
    const statusEl = document.getElementById("painting-status");
    if (!promptInput || !generateBtn || !statusEl) return;

    this.paintingStudio.bindStatusElement(statusEl);

    generateBtn.addEventListener("click", async () => {
      if (!this.isNearPainting) {
        this.paintingStudio.setStatus("Move closer to the painting to generate.");
        return;
      }
      generateBtn.disabled = true;
      this.paintingStudio.setStatus("Generating painting...");
      try {
        await this.paintingStudio.generatePainting(promptInput.value);
        this.gameState.recordGeneratedPrompt(promptInput.value?.trim());
        if (this.gameState.phase === "active") {
          this.paintingStudio.setStatus(
            "Artwork generated. Submit from the run panel to score this challenge."
          );
        }
      } catch (error) {
        this.paintingStudio.setStatus(error.message || "Failed to generate image.");
      } finally {
        generateBtn.disabled = false;
      }
    });

    promptInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      generateBtn.click();
    });
  }

  updatePaintingProximityUI() {
    const panel = document.getElementById("painting-panel");
    const proximityHint = document.getElementById("painting-proximity-hint");
    const statusEl = document.getElementById("painting-status");
    if (!panel || !proximityHint || !statusEl || !this.character?.model) return;

    const playerPos = this.character.model.position;
    const paintingPos = this.paintingStudio.getPaintingWorldPosition();
    const distance = playerPos.distanceTo(paintingPos);
    const nearThreshold = 4.2;
    const nowNear = distance <= nearThreshold;

    if (nowNear !== this.isNearPainting) {
      this.isNearPainting = nowNear;
      if (this.isNearPainting) {
        panel.classList.remove("hidden");
        proximityHint.textContent = "Painting nearby - type prompt and press Enter.";
        statusEl.textContent = "Ready. Describe your image and generate.";
      } else {
        panel.classList.add("hidden");
        proximityHint.textContent = "Move closer to the painting to unlock prompt input.";
      }
    }
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;

    if (this.viewMode === "first") {
      this.updateFirstPersonCamera();
    } else {
      this.updateThirdPersonFollowCamera();
    }

    const targetFov = this.character.isSprinting() ? this.cameraBaseFov + 5 : this.cameraBaseFov;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.12);
    this.camera.updateProjectionMatrix();

    const basis = this.getCameraGroundBasis();
    this.character.update(delta, basis);

    if (this.viewMode === "first") {
      this.updateFirstPersonCamera();
    }

    this.npcs.update(delta, elapsed);
    this.updateNpcInteractionUI();
    this.updateCollectibles(elapsed);
    if (this.gameState.phase === "active") {
      this.runHud.setTimer(this.gameState.getTimeLeftSec());
      if (this.gameState.getTimeLeftSec() <= 0) {
        this.submitActiveRun();
      }
    }
    this.runHud.setTopStats(this.gameState);

    if (this.waterSystem) this.waterSystem.update(delta);
    this.updatePaintingProximityUI();
    this.composer.render();
  }

  updateNpcInteractionUI() {
    const playerPos = this.character?.model?.position;
    if (!playerPos) return;

    const nearest = this.npcs.getNearestInteractiveNpc(playerPos);
    this.activeNpc = nearest;
    this.dialogueHud.showPanel(Boolean(nearest));
    this.dialogueHud.markChecklistItem("proximity", Boolean(nearest));

    if (!nearest) {
      this.dialogueHud.setNpc(null);
      this.dialogueHud.setNearbyHint("Find an AI NPC to start a conversation.");
      return;
    }

    this.dialogueHud.setNpc(nearest);
    const runHint =
      this.gameState.phase === "active"
        ? ` Active run: create "${this.gameState.activeChallenge?.theme}" and submit.`
        : " Press Talk for tips or Start Run for challenge mode.";
    this.dialogueHud.setNearbyHint(`Nearby: ${nearest.name} (${nearest.role}) -${runHint}`);
  }

  updateCollectibles(elapsed) {
    const playerPos = this.character?.model?.position;
    if (!playerPos || !this.collectibles.length) return;
    for (const orb of this.collectibles) {
      if (!orb.visible) continue;
      orb.rotation.y += 0.02;
      orb.position.y = 1 + Math.sin(elapsed * 2 + orb.id) * 0.16;
      const dist = orb.position.distanceTo(playerPos);
      if (dist < 1.6) {
        orb.visible = false;
        this.gameState.currency += 8;
        this.runHud.setTopStats(this.gameState);
      }
    }
  }
}
