export class RunHud {
  constructor() {
    this.panel = document.getElementById("run-panel");
    this.objectiveEl = document.getElementById("run-objective");
    this.timerEl = document.getElementById("run-timer");
    this.scoreEl = document.getElementById("run-score");
    this.streakEl = document.getElementById("run-streak");
    this.currencyEl = document.getElementById("run-currency");
    this.levelEl = document.getElementById("run-level");
    this.bestEl = document.getElementById("run-best");
    this.startBtn = document.getElementById("run-start-btn");
    this.submitBtn = document.getElementById("run-submit-btn");
    this.summaryPanel = document.getElementById("round-summary");
    this.summaryTextEl = document.getElementById("round-summary-text");
    this.nextBtn = document.getElementById("round-next-btn");
  }

  bindStart(handler) {
    this.startBtn?.addEventListener("click", () => handler());
  }

  bindSubmit(handler) {
    this.submitBtn?.addEventListener("click", () => handler());
  }

  bindNext(handler) {
    this.nextBtn?.addEventListener("click", () => handler());
  }

  setTopStats({ score, streak, currency, level, bestScore }) {
    if (this.scoreEl) this.scoreEl.textContent = `Score: ${score}`;
    if (this.streakEl) this.streakEl.textContent = `Streak: ${streak}`;
    if (this.currencyEl) this.currencyEl.textContent = `Credits: ${currency}`;
    if (this.levelEl) this.levelEl.textContent = `Level: ${level}`;
    if (this.bestEl) this.bestEl.textContent = `Best: ${bestScore}`;
  }

  setObjective(text) {
    if (this.objectiveEl) this.objectiveEl.textContent = text;
  }

  setTimer(seconds) {
    if (!this.timerEl) return;
    this.timerEl.textContent = `Timer: ${Math.max(0, Math.ceil(seconds))}s`;
  }

  setRunActive(active) {
    if (this.startBtn) this.startBtn.disabled = active;
    if (this.submitBtn) this.submitBtn.disabled = !active;
  }

  showSummary(text) {
    if (this.summaryTextEl) this.summaryTextEl.textContent = text;
    this.summaryPanel?.classList.remove("hidden");
  }

  hideSummary() {
    this.summaryPanel?.classList.add("hidden");
  }
}
