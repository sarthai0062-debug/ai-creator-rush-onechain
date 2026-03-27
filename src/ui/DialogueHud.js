export class DialogueHud {
  constructor() {
    this.panel = document.getElementById("npc-dialogue-panel");
    this.nameEl = document.getElementById("npc-name");
    this.roleEl = document.getElementById("npc-role");
    this.textEl = document.getElementById("npc-reply");
    this.inputEl = document.getElementById("npc-input");
    this.sendBtn = document.getElementById("npc-send-btn");
    this.muteToggle = document.getElementById("npc-mute-toggle");
    this.nearbyEl = document.getElementById("npc-nearby-hint");
    this.aiChecklist = document.getElementById("ai-checklist");
    this.voiceStatusEl = document.getElementById("npc-voice-status");
  }

  bindSend(handler) {
    if (!this.sendBtn || !this.inputEl) return;
    this.sendBtn.addEventListener("click", () => {
      const message = this.inputEl.value.trim();
      if (!message) return;
      handler(message);
    });
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.sendBtn.click();
    });
  }

  bindMuteChange(handler) {
    if (!this.muteToggle) return;
    this.muteToggle.addEventListener("change", () => handler(Boolean(this.muteToggle.checked)));
  }

  setNpc(npc) {
    if (this.nameEl) this.nameEl.textContent = npc?.name || "No NPC nearby";
    if (this.roleEl) this.roleEl.textContent = npc ? npc.role : "Move closer to an NPC to interact.";
  }

  setReply(text) {
    if (this.textEl) this.textEl.textContent = text;
  }

  setNearbyHint(text) {
    if (this.nearbyEl) this.nearbyEl.textContent = text;
  }

  showPanel(visible) {
    if (!this.panel) return;
    this.panel.classList.toggle("hidden", !visible);
  }

  setBusy(isBusy) {
    if (this.sendBtn) this.sendBtn.disabled = isBusy;
    if (this.inputEl) this.inputEl.disabled = isBusy;
  }

  clearInput() {
    if (this.inputEl) this.inputEl.value = "";
  }

  isMuted() {
    return Boolean(this.muteToggle?.checked);
  }

  setMuted(muted) {
    if (this.muteToggle) this.muteToggle.checked = Boolean(muted);
  }

  markChecklistItem(id, active) {
    const row = this.aiChecklist?.querySelector(`[data-item="${id}"]`);
    if (!row) return;
    row.classList.toggle("done", Boolean(active));
  }

  setVoiceStatus(status) {
    if (!this.voiceStatusEl) return;
    if (!status?.supported) {
      this.voiceStatusEl.textContent = "Voice engine: unavailable (text only)";
      return;
    }
    const suffix = status.hasVoices ? status.voiceName : "no installed voices";
    this.voiceStatusEl.textContent = `Voice engine: ${status.engine} (${suffix})`;
  }
}
