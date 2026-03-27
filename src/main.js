import "./style.css";
import { World } from "./game/World.js";

const app = document.querySelector("#app");
app.innerHTML = `
  <div id="hud">
    <div class="title">AI Creator Rush</div>
    <div id="view-mode-label" class="view-mode">View: Third person</div>
    <div class="hint">WASD move • Shift run • V first/third • Third: drag orbit, scroll zoom • First: click to look</div>
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
const world = new World(canvas);
world.start();
