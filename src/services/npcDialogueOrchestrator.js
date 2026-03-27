import { streamNpcReply } from "./nvidiaChat.js";

export class NpcDialogueOrchestrator {
  constructor() {
    this.memories = new Map();
  }

  getHistory(npcId) {
    return this.memories.get(npcId) || [];
  }

  remember(npcId, role, content) {
    const history = this.getHistory(npcId);
    history.push({ role, content });
    const trimmed = history.slice(-10);
    this.memories.set(npcId, trimmed);
  }

  async chat({ npc, playerMessage, onChunk }) {
    this.remember(npc.id, "user", playerMessage);
    const history = this.getHistory(npc.id);
    const result = await streamNpcReply({
      npc,
      history: history.slice(0, -1),
      playerMessage,
      onChunk,
    });
    const finalText = result.text || "I need a moment to think. Ask me again shortly.";
    this.remember(npc.id, "assistant", finalText);
    return finalText;
  }

  async judgeChallenge({ npc, challenge, prompt, elapsedSec }) {
    const judgePrompt = [
      `You are ${npc.name}, acting as a strict game judge.`,
      "Score this submission in JSON only.",
      `Challenge theme: ${challenge.theme}`,
      `Constraints: ${challenge.constraints.join("; ")}`,
      `Player prompt: ${prompt || "none provided"}`,
      `Elapsed seconds: ${Math.round(elapsedSec)}`,
      'Return JSON with keys: score(0-100 integer), verdict("success"|"fail"), reason(short string), bonus(0-30 integer).',
    ].join("\n");

    try {
      const result = await streamNpcReply({
        npc,
        history: [],
        playerMessage: judgePrompt,
      });
      const raw = result.text || result.reasoning || "";
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");
      const score = Math.max(0, Math.min(100, Number(parsed.score) || 55));
      const bonus = Math.max(0, Math.min(30, Number(parsed.bonus) || 0));
      const verdict = parsed.verdict === "fail" ? "fail" : "success";
      const reason = parsed.reason || "Decent execution with room for stronger style identity.";
      return { score, bonus, verdict, reason };
    } catch {
      const speedBonus = Math.max(0, Math.floor((challenge.timeLimit - elapsedSec) / 6));
      return {
        score: 58 + speedBonus,
        bonus: Math.min(15, speedBonus),
        verdict: "success",
        reason: "Fast submission with acceptable challenge alignment.",
      };
    }
  }
}
