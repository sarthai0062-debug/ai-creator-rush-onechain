import "./style.css";
import { World } from "./game/World.js";

const app = document.querySelector("#app");
const SETTINGS_STORAGE_KEY = "ai-creator-rush-settings-v1";

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    return {
      voiceMuted: Boolean(parsed.voiceMuted),
      voiceProfile: parsed.voiceProfile || "npc",
      mouseSensitivity: Number(parsed.mouseSensitivity) || 0.001,
      qualityMode: parsed.qualityMode === "performance" ? "performance" : "quality",
      cameraMode: parsed.cameraMode === "first" ? "first" : "third",
    };
  } catch {
    return {
      voiceMuted: false,
      voiceProfile: "npc",
      mouseSensitivity: 0.001,
      qualityMode: "quality",
      cameraMode: "third",
    };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

const settings = loadSettings();

app.innerHTML = `
  <div id="loading-screen" class="overlay-screen">
    <div class="overlay-card">
      <div class="overlay-eyebrow">OneChain Prototype</div>
      <h1 class="overlay-title">AI Creator Rush</h1>
      <p id="loading-status" class="overlay-subtitle">Booting world systems...</p>
      <div class="loading-bar-track">
        <div id="loading-bar-fill" class="loading-bar-fill"></div>
      </div>
      <div class="loading-spinner" aria-hidden="true"></div>
    </div>
  </div>

  <div id="play-screen" class="overlay-screen hidden">
    <div class="overlay-card play-card">
      <div class="overlay-eyebrow">Professional Demo Build</div>
      <h1 class="overlay-title">AI Creator Rush</h1>
      <p class="overlay-subtitle">Choose your camera style, then enter the challenge world.</p>
      <div class="play-grid">
        <div class="play-block">
          <h2>Session Setup</h2>
          <label class="settings-row">
            <span>Camera Mode</span>
            <select id="menu-camera-mode">
              <option value="third">Third-person chase</option>
              <option value="first">First-person pointer</option>
            </select>
          </label>
          <label class="settings-row">
            <span>Mute NPC Voice</span>
            <input id="menu-mute-toggle" type="checkbox" />
          </label>
          <label class="settings-row">
            <span>Voice Profile</span>
            <select id="menu-voice-profile">
              <option value="npc">Auto by NPC</option>
              <option value="alloy">Alloy</option>
              <option value="verse">Verse</option>
              <option value="echo">Echo</option>
              <option value="default">Default</option>
            </select>
          </label>
          <label class="settings-row">
            <span>Look Sensitivity</span>
            <input id="menu-sensitivity" type="range" min="0.0004" max="0.0032" step="0.0001" />
          </label>
          <label class="settings-row">
            <span>Graphics</span>
            <select id="menu-quality-mode">
              <option value="quality">Quality</option>
              <option value="performance">Performance</option>
            </select>
          </label>
        </div>
        <div class="play-block">
          <h2>Controls</h2>
          <ul class="controls-list">
            <li>W A S D to move</li>
            <li>Shift to sprint</li>
            <li>V to swap first/third mode in-game</li>
            <li>Enter painting zone to generate artwork</li>
            <li>Talk to NPCs for challenge guidance</li>
          </ul>
        </div>
      </div>
      <button id="play-btn" class="play-btn" type="button">Play</button>
    </div>
  </div>

  <div id="hud" class="hidden">
    <div class="title">AI Creator Rush</div>
    <div id="view-mode-label" class="view-mode">View: Third-person chase cam</div>
    <div class="hint">WASD move • Shift run • V toggle view • Click canvas in first-person to lock pointer</div>
    <div id="painting-proximity-hint" class="painting-proximity-hint">
      Move closer to the painting to unlock prompt input.
    </div>
    <div id="painting-panel" class="painting-controls hidden">
      <label class="painting-label" for="painting-prompt">Create painting on wooden framed sheet</label>
      <input
        id="painting-prompt"
        type="text"
        placeholder="Type a painting prompt (e.g. epic sunset over fantasy valley)"
      />
      <button id="generate-painting-btn" type="button">Generate Painting</button>
      <div id="painting-status">Blank sheet ready. Enter a prompt and generate.</div>
    </div>
    <div id="npc-nearby-hint" class="npc-nearby-hint">Find an AI NPC to start a conversation.</div>
    <div id="npc-dialogue-panel" class="npc-dialogue hidden">
      <div id="npc-name" class="npc-name">No NPC nearby</div>
      <div id="npc-role" class="npc-role">Move closer to an NPC to interact.</div>
      <div id="npc-reply" class="npc-reply">NPC replies will appear here.</div>
      <input id="npc-input" type="text" placeholder="Ask for lore, quest hints, or strategy..." />
      <button id="npc-send-btn" type="button">Talk</button>
      <label class="npc-toggle">
        <input id="npc-mute-toggle" type="checkbox" />
        Mute NPC voice
      </label>
      <div id="npc-voice-status" class="npc-voice-status">Voice engine: Browser Voice (initializing)</div>
    </div>
    <div id="ai-checklist" class="ai-checklist">
      <div class="ai-check-item" data-item="proximity">NPC proximity interaction</div>
      <div class="ai-check-item" data-item="streaming">Streaming AI response</div>
      <div class="ai-check-item" data-item="voice">Browser voice output</div>
    </div>
    <div id="run-panel" class="run-panel">
      <div id="run-objective">Press Start Run to receive your first challenge.</div>
      <div id="run-timer">Timer: 0s</div>
      <div class="run-stats-row">
        <div id="run-score">Score: 0</div>
        <div id="run-streak">Streak: 0</div>
        <div id="run-currency">Credits: 0</div>
        <div id="run-level">Level: 1</div>
        <div id="run-best">Best: 0</div>
      </div>
      <div class="run-actions">
        <button id="run-start-btn" type="button">Start Run</button>
        <button id="run-submit-btn" type="button" disabled>Submit Artwork</button>
      </div>
    </div>
    <div id="round-summary" class="round-summary hidden">
      <div id="round-summary-text">Round result appears here.</div>
      <button id="round-next-btn" type="button">Play Next Round</button>
    </div>
  </div>
  <canvas id="game-canvas"></canvas>
`;

const canvas = document.querySelector("#game-canvas");
const loadingScreen = document.querySelector("#loading-screen");
const loadingStatus = document.querySelector("#loading-status");
const loadingBarFill = document.querySelector("#loading-bar-fill");
const playScreen = document.querySelector("#play-screen");
const hud = document.querySelector("#hud");
const playBtn = document.querySelector("#play-btn");
const cameraModeSelect = document.querySelector("#menu-camera-mode");
const muteToggle = document.querySelector("#menu-mute-toggle");
const voiceProfileSelect = document.querySelector("#menu-voice-profile");
const sensitivityRange = document.querySelector("#menu-sensitivity");
const qualityModeSelect = document.querySelector("#menu-quality-mode");

cameraModeSelect.value = settings.cameraMode;
muteToggle.checked = settings.voiceMuted;
voiceProfileSelect.value = settings.voiceProfile;
sensitivityRange.value = String(settings.mouseSensitivity);
qualityModeSelect.value = settings.qualityMode;

const world = new World(canvas);
world.start({
  settings,
  onProgress: ({ step, detail }) => {
    if (loadingStatus) loadingStatus.textContent = detail;
    const order = ["init", "environment", "water", "lighting", "character", "npcs", "painting", "ready"];
    const currentStep = order.findIndex((entry) => entry === step);
    const ratio = currentStep >= 0 ? (currentStep + 1) / order.length : 0.35;
    if (loadingBarFill) loadingBarFill.style.width = `${Math.max(12, ratio * 100)}%`;
  },
  onReady: () => {
    loadingScreen?.classList.add("hidden");
    playScreen?.classList.remove("hidden");
  },
});

cameraModeSelect?.addEventListener("change", () => {
  settings.cameraMode = cameraModeSelect.value === "first" ? "first" : "third";
  saveSettings(settings);
  world.setInitialCameraMode(settings.cameraMode);
});

muteToggle?.addEventListener("change", () => {
  settings.voiceMuted = muteToggle.checked;
  saveSettings(settings);
  world.setVoiceMuted(settings.voiceMuted);
});

voiceProfileSelect?.addEventListener("change", () => {
  settings.voiceProfile = voiceProfileSelect.value;
  saveSettings(settings);
  world.setPreferredVoiceProfile(settings.voiceProfile);
});

sensitivityRange?.addEventListener("input", () => {
  settings.mouseSensitivity = Number(sensitivityRange.value);
  saveSettings(settings);
  world.setMouseSensitivity(settings.mouseSensitivity);
});

qualityModeSelect?.addEventListener("change", () => {
  settings.qualityMode = qualityModeSelect.value;
  saveSettings(settings);
  world.setQualityMode(settings.qualityMode);
});

playBtn?.addEventListener("click", () => {
  playScreen?.classList.add("hidden");
  hud?.classList.remove("hidden");
  world.beginGameplaySession();
});
