export class GameState {
  constructor() {
    this.phase = "idle";
    this.round = 0;
    this.score = 0;
    this.streak = 0;
    this.currency = 0;
    this.xp = 0;
    this.level = 1;
    this.activeChallenge = null;
    this.startedAtMs = 0;
    this.lastGeneratedPrompt = "";
    this.streakShield = 1;
    this.bestScore = 0;
    this.sessionBest = 0;
    this.lastDrop = "none";
  }

  startChallenge(challenge) {
    this.phase = "active";
    this.round += 1;
    this.activeChallenge = challenge;
    this.startedAtMs = Date.now();
    this.lastGeneratedPrompt = "";
  }

  getElapsedSec() {
    if (!this.startedAtMs) return 0;
    return (Date.now() - this.startedAtMs) / 1000;
  }

  getTimeLeftSec() {
    if (!this.activeChallenge) return 0;
    return Math.max(0, this.activeChallenge.timeLimit - this.getElapsedSec());
  }

  recordGeneratedPrompt(prompt) {
    this.lastGeneratedPrompt = prompt || "";
  }

  completeChallenge({ scoreGain, rewardGain, success, drop = "none" }) {
    this.phase = "summary";
    this.score += scoreGain;
    this.currency += rewardGain;
    this.xp += Math.max(8, Math.floor(scoreGain / 5));
    this.level = 1 + Math.floor(this.xp / 120);
    if (success) {
      this.streak += 1;
    } else if (this.streakShield > 0) {
      this.streakShield -= 1;
    } else {
      this.streak = 0;
    }
    this.bestScore = Math.max(this.bestScore, this.score);
    this.sessionBest = Math.max(this.sessionBest, scoreGain);
    this.lastDrop = drop;
  }

  resetToIdle() {
    this.phase = "idle";
    this.activeChallenge = null;
    this.startedAtMs = 0;
    this.lastGeneratedPrompt = "";
  }
}
