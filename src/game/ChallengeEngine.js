const THEMES = [
  "Cyberpunk market at dawn",
  "Neo fantasy relic temple",
  "Street racing poster",
  "Anime boss reveal",
  "Dark sci-fi corridor",
  "Glitchcore music cover",
];

const CONSTRAINT_SETS = [
  ["Use vivid color contrast", "Must include one focal character"],
  ["Include strong lighting mood", "Show motion or action"],
  ["Use cinematic framing", "Keep it icon-friendly"],
  ["Add futuristic symbol", "Keep composition clean"],
];

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

export class ChallengeEngine {
  constructor() {
    this.dailySeed = Math.floor(Date.now() / 86400000);
  }

  generate(round) {
    const difficulty = Math.min(5, 1 + Math.floor(round / 2));
    const timeLimit = Math.max(60, 120 - difficulty * 12);
    const rarity = difficulty >= 4 ? "epic" : difficulty >= 3 ? "rare" : "common";
    const reward = 35 + difficulty * 18;
    const theme = pick(THEMES, (round + this.dailySeed) * 17);
    const constraints = pick(CONSTRAINT_SETS, (round + this.dailySeed) * 23);
    return {
      id: `challenge_${round}_${Date.now()}`,
      round,
      difficulty,
      rarity,
      reward,
      timeLimit,
      theme,
      constraints,
      objective: `Create ${theme} artwork under ${timeLimit}s.`,
    };
  }

  rollDrop(rarity) {
    const n = Math.random();
    if (rarity === "epic" && n < 0.28) return "epic shard";
    if (rarity === "rare" && n < 0.22) return "rare token";
    if (n < 0.15) return "boost chip";
    return "none";
  }
}
